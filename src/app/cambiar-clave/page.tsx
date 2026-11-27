import type { Metadata } from "next";
import { auth } from "@/auth";
import { debeCambiarClave } from "@/lib/claves";
import CambioClaveForm from "./cambio-clave-form";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
};

export default async function CambiarClavePage() {
  // Página pública (spec plataforma/gestion-claves): se llega desde el enlace
  // del inicio de sesión, sin sesión. Si HAY sesión, la marca de la BD decide
  // si es el cambio forzado de una contraseña temporal (no se pide la actual);
  // en ese caso el correo tampoco se pide: la cuenta es la de la sesión.
  const session = await auth();
  const forzado = session?.user
    ? await debeCambiarClave(session.user.id)
    : false;

  const titulo = forzado ? "Define tu contraseña" : "Cambiar contraseña";
  const ayuda = forzado
    ? "Tu cuenta tiene una contraseña temporal. Crea la tuya para continuar a tu panel."
    : "Actualiza la contraseña de tu cuenta. Necesitas el correo de la cuenta y la contraseña actual.";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
          <p className="text-sm text-muted-foreground">{ayuda}</p>
        </div>
        <CambioClaveForm
          forzado={forzado}
          conSesion={Boolean(session?.user)}
          correoInicial={session?.user?.email ?? ""}
        />
      </div>
    </main>
  );
}
