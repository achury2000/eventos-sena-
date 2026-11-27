"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { asignarAsistente } from "@/lib/actions/admin/habitaciones";
import { MENSAJE_SIN_CONEXION, estaSinConexion } from "@/lib/pwa/conexion";

type AsistenteResultado = {
  id: string;
  nombreCompleto: string;
  documento: string;
};

export function FormAsignarHabitacion({
  eventoId,
  habitacionId,
}: {
  eventoId: string;
  habitacionId: string;
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<AsistenteResultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  const [state, action, pending] = useActionState(asignarAsistente, undefined);

  useEffect(() => {
    let activo = true;
    const timer = setTimeout(async () => {
      setBuscando(true);
      setErrorBusqueda(null);
      try {
        const res = await fetch(
          `/api/admin/eventos/${eventoId}/asistentes?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) {
          if (activo) setResultados([]);
          return;
        }
        const datos = (await res.json()) as { asistentes: AsistenteResultado[] };
        if (activo) setResultados(datos.asistentes ?? []);
      } catch {
        if (activo) {
          setResultados([]);
          setErrorBusqueda(
            estaSinConexion()
              ? MENSAJE_SIN_CONEXION
              : "No se pudo buscar asistentes. Inténtalo de nuevo."
          );
        }
      } finally {
        if (activo) setBuscando(false);
      }
    }, 250);
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [eventoId, query, refetchTick]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`asignar-${habitacionId}`}>Buscar asistente (nombre o documento)</Label>
        <Input
          id={`asignar-${habitacionId}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej. Rodríguez o 123456"
        />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {errorBusqueda ? (
        <p role="alert" className="text-sm text-destructive">
          {errorBusqueda}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        {buscando ? (
          <p className="text-sm text-muted-foreground">Buscando…</p>
        ) : resultados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay asistentes disponibles para asignar.
          </p>
        ) : (
          resultados.map((a) => (
            <form
              key={a.id}
              action={action}
              onSubmit={() => setRefetchTick((t) => t + 1)}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <input type="hidden" name="eventoId" value={eventoId} />
              <input type="hidden" name="habitacionId" value={habitacionId} />
              <input type="hidden" name="asistenteId" value={a.id} />
              <div className="min-w-0">
                <span className="font-medium">{a.nombreCompleto}</span>{" "}
                <span className="text-muted-foreground">— Doc. {a.documento}</span>
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={pending}>
                Asignar
              </Button>
            </form>
          ))
        )}
      </div>
    </div>
  );
}