"use client";

import Link from "next/link";
import { useSinConexion } from "@/components/pwa/use-sin-conexion";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Boundary de página. Si una Server Action o una carga falla con la red caída,
 * el mensaje distingue la falta de conexión en vez de mostrar el error
 * genérico de Next. No hay reintento automático ni datos encolados (design.md,
 * D6).
 */
export default function Error({ reset }: { reset: () => void }) {
  const sinConexion = useSinConexion();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-xl">
        <h1 className="text-xl font-semibold tracking-tight">
          {sinConexion ? "Sin conexión" : "Algo salió mal"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sinConexion
            ? "No pudimos completar la operación porque no hay conexión. No se guardó ningún dato: revisa tu red y vuelve a intentarlo."
            : "Ocurrió un error inesperado. Vuelve a intentarlo; si persiste, avisa al personal de Bienestar al Aprendiz."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => reset()}>
            Reintentar
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
