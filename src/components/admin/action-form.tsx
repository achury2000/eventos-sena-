"use client";

import { useActionState, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/actions/admin/types";

// Formulario genérico que dispara una Server Action con campos ocultos y
// confirmación opcional. Reutilizado para eliminar, cambiar de estado,
// asignar/desasignar, etc., en el panel de administración.
export function ActionForm({
  action,
  hidden,
  confirmText,
  children,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  confirmText?: string;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmText && !window.confirm(confirmText)) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className={className}>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {children}
      {pending ? (
        <p className="text-xs text-muted-foreground">Procesando...</p>
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