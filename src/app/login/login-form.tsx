"use client";

import Link from "next/link";
import { useEffect, useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";
import { limpiarCachesDocumentos } from "@/lib/pwa/caches";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );

  // Al llegar al login se descarta cualquier copia de documentos de una sesión
  // anterior: cubre el cierre de sesión y el vencimiento que redirige aquí.
  // La página de acceso no queda disponible sin red a propósito (design.md,
  // D4): no hay nada que hacer allí sin conexión y su copia sobreviviría al
  // cierre de sesión.
  useEffect(() => {
    void limpiarCachesDocumentos();
  }, []);

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="correo@sena.gov.co"
            autoComplete="username"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
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

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Ingresando..." : "Iniciar sesión"}
        </Button>
      </form>

      {/* El cambio de contraseña vive en el acceso (spec
          plataforma/gestion-claves): se hace sin sesión, así que el enlace va
          aquí y no en los paneles. */}
      <div className="mt-6 border-t pt-6">
        <Link
          href="/cambiar-clave"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          Cambiar contraseña
        </Link>
      </div>
    </>
  );
}
