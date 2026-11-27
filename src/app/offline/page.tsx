import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BotonReintentar } from "@/components/pwa/boton-reintentar";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sin conexión",
};

// Página estática sin sesión ni base de datos. El service worker la precarga en
// `install` junto con sus chunks para que se vea con estilos incluso en una
// primera visita sin red (design.md, D5).
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-xl">
        <Image
          src="/logo-sena.png"
          alt="SENA"
          width={64}
          height={64}
          unoptimized
          className="mx-auto size-16 rounded-xl"
        />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Sin conexión
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No pudimos cargar esta página porque no hay internet. Puedes consultar
          las páginas que ya visitaste.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Para inscribirte o registrar asistencia necesitas conexión.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <BotonReintentar />
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
