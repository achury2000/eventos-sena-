"use client";

import { useId, useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MENSAJE_SIN_CONEXION, estaSinConexion } from "@/lib/pwa/conexion";

type Estado =
  | { tipo: "inicial" }
  | { tipo: "enviando" }
  | { tipo: "ok"; mensaje: string }
  | { tipo: "error"; mensaje: string };

export function FormRegistroManual({
  checkpointId,
  nombreCheckpoint,
  activo = true,
  esHabitacion = false,
}: {
  checkpointId: string;
  nombreCheckpoint: string;
  activo?: boolean;
  esHabitacion?: boolean;
}) {
  const campoId = useId();
  const [documento, setDocumento] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });

  async function manejarEnvio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // El endpoint también valida el estado (422); este guard evita envios
    // accidentales desde una UI deshabilitada por hidratación tardía.
    if (!activo) return;
    setEstado({ tipo: "enviando" });

    try {
      const respuesta = await fetch("/api/operador/registro-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointId, documento }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
      };

      if (respuesta.ok) {
        setEstado({
          tipo: "ok",
          mensaje: "Asistencia registrada correctamente.",
        });
        setDocumento("");
        return;
      }

      setEstado({
        tipo: "error",
        mensaje: datos.error ?? "No fue posible registrar la asistencia.",
      });
    } catch {
      setEstado({
        tipo: "error",
        mensaje: estaSinConexion()
          ? MENSAJE_SIN_CONEXION
          : "No se pudo conectar. Verifica tu conexión e inténtalo de nuevo.",
      });
    }
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <UserPlus className="size-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <label htmlFor={campoId} className="text-sm font-medium">
            Registro manual en “{nombreCheckpoint}”
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {esHabitacion
              ? "Solo se pueden registrar asistentes asignados a esta habitación."
              : "Registra a quien no pudo autoregistrarse con el código QR."}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={campoId}
          name="documento"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Documento del asistente"
          value={documento}
          onChange={(event) => setDocumento(event.target.value)}
          required={activo}
          disabled={!activo}
          className="sm:flex-1"
        />
        <Button
          type="submit"
          className="sm:shrink-0"
          disabled={!activo || estado.tipo === "enviando"}
        >
          {estado.tipo === "enviando" ? "Registrando..." : "Registrar"}
        </Button>
      </div>
      {!activo ? (
        <p
          role="status"
          className="flex items-start gap-1.5 rounded-md border bg-muted/60 px-2.5 py-1.5 text-sm text-muted-foreground"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Active el checkpoint para registrar.
        </p>
      ) : null}
      {estado.tipo === "ok" ? (
        <p
          role="status"
          className="flex items-start gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-sm text-success-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {estado.mensaje}
        </p>
      ) : null}
      {estado.tipo === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {estado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
