import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BotonCerrarSesion } from "@/components/admin/boton-cerrar-sesion";
import { debeCambiarClave } from "@/lib/claves";

export default async function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cambio forzado (spec plataforma/gestion-claves): igual que en el layout
  // de administración, la marca se revisa aquí porque el proxy no consulta la
  // BD. Sin sesión el proxy ya redirigió a /login antes de llegar.
  const session = await auth();
  if (session?.user && (await debeCambiarClave(session.user.id))) {
    redirect("/cambiar-clave");
  }

  return (
    <>
      <a
        href="#contenido-panel"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-3 focus:ring-ring/50"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
        <header className="hero-panel flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
              Panel del operador
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Bienestar al Aprendiz
            </h1>
          </div>
          <BotonCerrarSesion />
        </header>
        <main
          id="contenido-panel"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          {children}
        </main>
      </div>
    </>
  );
}
