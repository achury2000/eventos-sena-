"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cambiarClavePropia } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Formulario de cambio de contraseña propia (spec plataforma/gestion-claves).
// Tres casos: cambio forzado con sesión (no pide la actual: la temporal se
// acaba de usar para entrar), cambio con sesión (pide la actual) y cambio desde
// el acceso sin sesión (pide correo + actual). La rama la decide el servidor a
// partir de la sesión y de la marca de la BD; aquí solo se ajusta la vista.
export default function CambioClaveForm({
  forzado,
  conSesion,
  correoInicial,
}: {
  forzado: boolean;
  conSesion: boolean;
  correoInicial: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    cambiarClavePropia,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {forzado || conSesion ? null : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="correo@sena.gov.co"
            autoComplete="username"
            defaultValue={correoInicial}
            required
          />
        </div>
      )}

      {forzado ? null : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="passwordActual">Contraseña actual</Label>
          <Input
            id="passwordActual"
            name="passwordActual"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmacion">Confirmar nueva contraseña</Label>
        <Input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {state?.ok ? (
        <p className="rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
          {state.ok}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando..." : "Guardar contraseña"}
      </Button>

      {state?.ok && !conSesion ? (
        <Link
          href="/login"
          className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Iniciar sesión
        </Link>
      ) : null}
    </form>
  );
}
