import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EstadoInscripcion, RolUsuario } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Búsqueda de asistentes asignables a habitaciones. Devuelve asistentes del
// evento (buscando por nombre o documento) cuya inscripción no está cancelada
// y que aún no tienen habitación asignada. Solo Administrador.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.rol !== RolUsuario.ADMINISTRADOR) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { eventoId } = await params;

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: { id: true },
  });
  if (!evento) {
    return NextResponse.json({ error: "El evento no existe." }, { status: 404 });
  }

  const { searchParams } = new URL(_request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const asistentes = await prisma.asistente.findMany({
    where: {
      eventoId,
      inscripcion: { estado: { not: EstadoInscripcion.CANCELADO } },
      habitaciones: { none: {} },
      ...(q
        ? {
            OR: [
              { nombreCompleto: { contains: q, mode: "insensitive" as const } },
              { documento: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      nombreCompleto: true,
      documento: true,
    },
    orderBy: { nombreCompleto: "asc" },
    take: 20,
  });

  return NextResponse.json({ asistentes });
}