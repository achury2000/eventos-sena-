"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MENSAJE_SIN_CONEXION, estaSinConexion } from "@/lib/pwa/conexion";

type ResultadoRespuesta =
  | "OK"
  | "YA_REGISTRADO"
  | "NO_ENCONTRADO"
  | "CHECKPOINT_NO_ACTIVO"
  | "NO_ASIGNADO_A_HABITACION";

interface FormAutoregistroProps {
  token: string;
  checkpointNombre: string;
  eventoNombre: string;
}

interface EstadoEnvio {
  resultado: ResultadoRespuesta;
  detalle: string;
}

export function FormAutoregistro({ token, checkpointNombre, eventoNombre }: FormAutoregistroProps) {
  const [documento, setDocumento] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<EstadoEnvio | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setEstado(null);

    try {
      const res = await fetch(`/api/checkpoints/${token}/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento }),
      });

      const cuerpo = (await res.json().catch(() => null)) as
        | { resultado?: ResultadoRespuesta; error?: string }
        | null;
      const resultado = cuerpo?.resultado;

      const mensaje =
        !res.ok && resultado === "YA_REGISTRADO"
          ? "Ya estás registrado en este checkpoint."
          : !res.ok && resultado === "NO_ENCONTRADO"
            ? "Este documento no está inscrito en el evento."
            : !res.ok && resultado === "CHECKPOINT_NO_ACTIVO"
              ? "Este checkpoint está desactivado."
              : !res.ok && resultado === "NO_ASIGNADO_A_HABITACION"
                ? "Este documento no está asignado a esta habitación. Solicita al administrador que lo asigne al cuarto."
                : !res.ok && res.status === 400
                ? "El documento debe tener entre 6 y 12 dígitos."
                : res.ok
                  ? "Registro exitoso."
                  : cuerpo?.error ?? "No se pudo completar el registro. Inténtalo de nuevo.";

      setEstado({ resultado: resultado ?? (res.ok ? "OK" : "NO_ENCONTRADO"), detalle: mensaje });
    } catch {
      setEstado({
        resultado: "NO_ENCONTRADO",
        detalle: estaSinConexion()
          ? MENSAJE_SIN_CONEXION
          : "No se pudo conectar. Inténtalo de nuevo.",
      });
    } finally {
      setEnviando(false);
    }
  }

  const exitoso = estado?.resultado === "OK";

  return (
    <div className="tarjeta-acceso w-full max-w-md space-y-5 rounded-2xl border bg-card p-7 shadow-xl">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Emisión de asistencia
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{checkpointNombre}</h1>
        <p className="text-sm text-muted-foreground">{eventoNombre}</p>
      </div>

      {estado ? (
        <div
          role="alert"
          className={`animate-in fade-in zoom-in-95 rounded-xl border px-4 py-3 text-sm font-medium duration-300 ${
            exitoso
              ? "border-success/40 bg-success/10 text-success-foreground"
              : "border-warning/40 bg-warning/10 text-warning-foreground"
          }`}
        >
          {estado.detalle}
        </div>
      ) : null}

      <form onSubmit={enviar} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkpoint-documento">Documento de identidad</Label>
          <Input
            id="checkpoint-documento"
            name="documento"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej. 1023456789"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            disabled={enviando || exitoso}
            required
          />
        </div>
        <Button type="submit" disabled={enviando || exitoso}>
          {enviando ? "Registrando…" : "Registrar asistencia"}
        </Button>
      </form>

      {estado ? (
        <p className="text-xs text-muted-foreground">
          Puedes ingresar otro documento para registrar a otra persona de tu
          grupo.
        </p>
      ) : null}
    </div>
  );
}