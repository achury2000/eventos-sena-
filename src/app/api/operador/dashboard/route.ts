import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RolUsuario } from "@/generated/prisma/client";
import { cargarTableroOperador } from "@/lib/operador/tablero";

export const runtime = "nodejs";

// Alimenta el sondeo del panel del Operador. Solo devuelve los eventos
// asignados al Operador autenticado.
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.rol !== RolUsuario.OPERADOR) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const tablero = await cargarTableroOperador(session.user.id);
  return NextResponse.json(tablero);
}
