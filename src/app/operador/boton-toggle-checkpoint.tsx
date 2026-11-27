"use client";

import { useActionState } from "react";
import { Power, PowerOff } from "lucide-react";
import { cambiarEstadoCheckpoint } from "@/lib/actions/operador/checkpoints";
import { Button } from "@/components/ui/button";

export function BotonToggleCheckpoint({
  checkpointId,
  activo,
  nombreCheckpoint,
}: {
  checkpointId: string;
  activo: boolean;
  nombreCheckpoint: string;
}) {
  const [state, formAction, pending] = useActionState(
    cambiarEstadoCheckpoint,
    undefined
  );

  return (
    <form
      action={formAction}
      className="flex flex-col items-stretch gap-1 sm:items-end"
    >
      <input type="hidden" name="checkpointId" value={checkpointId} />
      <input type="hidden" name="activo" value={String(!activo)} />
      <Button
        type="submit"
        size="sm"
        variant={activo ? "outline" : "default"}
        disabled={pending}
        aria-label={`${activo ? "Desactivar" : "Activar"} ${nombreCheckpoint}`}
        className={
          activo
            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
            : undefined
        }
      >
        {activo ? (
          <PowerOff aria-hidden="true" />
        ) : (
          <Power aria-hidden="true" />
        )}
        {activo ? "Desactivar" : "Activar"}
      </Button>
      {state?.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
