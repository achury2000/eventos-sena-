"use server";

import { compare, hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { comprobarLimite } from "@/lib/rate-limit";
import { RolUsuario } from "@/generated/prisma/client";
import type { ActionState } from "@/lib/actions/admin/types";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  // El límite va AQUÍ y no en `src/proxy.ts` aunque el proxy sea el lugar
  // natural para lo global: el login es una Server Action, y una Server Action
  // se invoca con POST sobre la página que la monta, no sobre una URL propia.
  // En el proxy, ese POST es indistinguible de cualquier otra cosa que llegue a
  // /login y el contador se contaminaría con navegación normal. Ver design.md,
  // decisión D1.
  const limite = await comprobarLimite("login", await headers());
  if (!limite.permitido) {
    return { error: limite.mensaje };
  }

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const emailLimpio = email.trim();
  if (!emailLimpio || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  try {
    const resultado = await signIn("credentials", {
      email: emailLimpio,
      password,
      redirect: false,
    });

    // Con `redirect: false`, en algunas versiones el error se devuelve como
    // URL hacia la página de error (ej. /login?error=CredentialsSignin)
    // en vez de lanzarse como excepción. Cubrimos ambos comportamientos.
    if (typeof resultado === "string" && resultado.includes("error=")) {
      return { error: "Credenciales inválidas." };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "Credenciales inválidas."
            : "Algo salió mal. Inténtalo de nuevo.",
      };
    }
    throw error;
  }

  // En producción el router hace una navegación "soft" tras el redirect de una
  // Server Action: si el destino es "/", el proxy no llega a ejecutarse sobre
  // la nueva página y el usuario se queda en una home vacía. Por eso se resuelve
  // aquí el panel del rol y se redirige directo (el proxy sigue protegiendo /admin
  // y /operador en cualquier navegación entrante).
  const usuario = await prisma.usuario.findUnique({
    where: { email: emailLimpio },
    select: { rol: true },
  });
  redirect(usuario?.rol === RolUsuario.ADMINISTRADOR ? "/admin" : "/operador");
}

/**
 * Cambio de la contraseña de la propia cuenta (spec
 * `plataforma/gestion-claves`). Tiene dos entradas:
 *
 * - Con sesión: la cuenta sale de la sesión, nunca del formulario. Si la cuenta
 *   trae la marca de cambio forzado (contraseña temporal repartida por el
 *   Administrador) no se exige la actual: la persona acaba de usarla para
 *   entrar.
 * - Sin sesión (formulario público enlazado en el inicio de sesión): la cuenta
 *   se identifica por el correo y SÍ se exige la contraseña actual. Se responde
 *   siempre el mismo mensaje para no revelar si el correo existe, y la
 *   superficie tiene su propio límite por IP (spec `plataforma/seguridad`).
 */
export async function cambiarClavePropia(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();

  let usuario: {
    id: string;
    passwordHash: string;
    debeCambiarClave: boolean;
    rol: RolUsuario;
  } | null;
  let forzado = false;

  if (session?.user) {
    usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true, debeCambiarClave: true, rol: true },
    });
    if (!usuario) return { error: "Tu cuenta ya no existe." };

    if (usuario.debeCambiarClave) {
      forzado = true;
    } else {
      const actual = formData.get("passwordActual");
      if (typeof actual !== "string" || !actual) {
        return { error: "Ingresa tu contraseña actual." };
      }
      if (!(await compare(actual, usuario.passwordHash))) {
        return { error: "La contraseña actual no es correcta." };
      }
    }
  } else {
    const limite = await comprobarLimite("cambio-clave", await headers());
    if (!limite.permitido) return { error: limite.mensaje };

    // El mismo mensaje para correo inexistente y contraseña incorrecta: la
    // respuesta no puede servir para enumerar cuentas.
    const generico = "El correo o la contraseña actual no son correctos.";
    const email = formData.get("email");
    const actual = formData.get("passwordActual");
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof actual !== "string" ||
      !actual
    ) {
      return { error: generico };
    }

    usuario = await prisma.usuario.findUnique({
      where: { email: email.trim() },
      select: { id: true, passwordHash: true, debeCambiarClave: true, rol: true },
    });
    if (!usuario || !(await compare(actual, usuario.passwordHash))) {
      return { error: generico };
    }
  }

  const nueva = formData.get("password");
  const confirmacion = formData.get("confirmacion");
  if (typeof nueva !== "string" || nueva.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (typeof confirmacion !== "string" || confirmacion !== nueva) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await hash(nueva, 10), debeCambiarClave: false },
  });

  // Tras un cambio forzado la persona queda sin panel hasta ahora: se le
  // lleva al suyo con la sesión ya abierta (el layout deja de redirigir
  // porque la marca quedó retirada en la línea anterior).
  if (forzado) {
    redirect(usuario.rol === RolUsuario.ADMINISTRADOR ? "/admin" : "/operador");
  }

  revalidatePath("/cambiar-clave");
  return {
    ok: session?.user
      ? "Tu contraseña fue actualizada."
      : "Tu contraseña fue actualizada. Ya puedes iniciar sesión.",
  };
}