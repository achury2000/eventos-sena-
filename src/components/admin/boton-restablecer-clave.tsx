"use client";

import { useActionState, useState, type FormEvent } from "react";
import { restablecerClave } from "@/lib/actions/admin/usuarios";
import type { ActionState } from "@/lib/actions/admin/types";
import { Button } from "@/components/ui/button";

// Botón "Restablecer" por fila en /admin/cuentas. La contraseña temporal que
// devuelve la acción se muestra UNA sola vez, aquí, en el cliente: al salir de
// la página (o volver a restablecer) el componente se desmonta o el estado se
// reemplaza y la clave anterior deja de ser visible y de servir (spec
// plataforma/gestion-claves).
export function BotonRestablecerClave({
  id,
  nombre,
}: {
  id: string;
  nombre: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    restablecerClave,
    undefined
  );
  const [copiado, setCopiado] = useState(false);

  function confirmar(event: FormEvent<HTMLFormElement>) {
    setCopiado(false);
    if (
      !window.confirm(
        `¿Restablecer la contraseña de ${nombre}? Se generará una contraseña temporal que verás UNA sola vez y deberás entregarle en persona.`
      )
    ) {
      event.preventDefault();
    }
  }

  async function copiar() {
    if (!state?.temporal) return;
    await navigator.clipboard.writeText(state.temporal);
    setCopiado(true);
  }

  return (
    <form action={formAction} onSubmit={confirmar} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Restableciendo..." : "Restablecer"}
      </Button>

      {state?.temporal ? (
        <div className="flex w-full max-w-xs flex-col gap-2 rounded-lg border border-amber-600/40 bg-amber-600/10 p-3 text-sm">
          <p className="font-medium text-amber-800">
            Contraseña temporal de {nombre} — única vez:
          </p>
          <code className="rounded-lg border bg-background px-2 py-1.5 font-mono text-base tracking-widest select-all">
            {state.temporal}
          </code>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copiar}>
              {copiado ? "Copiada ✓" : "Copiar"}
            </Button>
            <span className="text-xs text-amber-800">
              Entrégala en persona y pídele cambiarla al iniciar sesión.
            </span>
          </div>
        </div>
      ) : null}

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
