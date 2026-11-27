import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RolUsuario } from "@/generated/prisma/client";

// Las Server Actions no pasan por el proxy de src/proxy.ts, así que cada
// acción del operador debe validar su propia sesión y rol como defensa en
// profundidad (CONTEXT.md §6). redirect() lanza internamente, por lo que una
// acción que la invoque queda protegida incluso sin un return explícito.
export async function requireOperador() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== RolUsuario.OPERADOR) redirect("/");
  return session;
}
