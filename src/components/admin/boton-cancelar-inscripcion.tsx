"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MENSAJE_SIN_CONEXION, estaSinConexion } from "@/lib/pwa/conexion";

export function BotonCancelar({ inscripcionId }: { inscripcionId: string }) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelada, setCancelada] = useState(false);

  async function cancelar() {
    if (!window.confirm("¿Cancelar esta inscripción y liberar sus cupos? Esta acción no se puede deshacer.")) {
      return;
    }
    setPendiente(true);
    setError(null);
    try {
      const res = await fetch(`/api/inscripciones/${inscripcionId}/cancelar`, {
        method: "POST",
      });
      if (res.ok) {
        setCancelada(true);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo cancelar la inscripción.");
      }
    } catch {
      setError(
        estaSinConexion()
          ? MENSAJE_SIN_CONEXION
          : "Error de conexión. Inténtalo de nuevo."
      );
    } finally {
      setPendiente(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={cancelar}
        disabled={pendiente || cancelada}
      >
        {cancelada ? "Cancelada" : pendiente ? "Cancelando..." : "Cancelar"}
      </Button>
    </div>
  );
}