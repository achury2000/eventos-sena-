import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RolUsuario } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function error(mensaje: string, status: number) {
  return NextResponse.json({ error: mensaje }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return error("No autenticado.", 401);
  }
  if (session.user.rol !== RolUsuario.ADMINISTRADOR) {
    return error("No autorizado.", 403);
  }

  const { id } = await params;

  type Resultado = { tipo: "OK" } | { tipo: "NO_ENCONTRADA" } | { tipo: "NO_CANCELABLE" };

  const resultado = await prisma.$transaction(async (tx): Promise<Resultado> => {
    const inscripcion = await tx.inscripcion.findUnique({
      where: { id },
      select: {
        estado: true,
        evento: { select: { id: true, estado: true } },
        _count: { select: { asistentes: true } },
      },
    });

    if (!inscripcion) return { tipo: "NO_ENCONTRADA" };

    if (inscripcion.evento.estado === "FINALIZADO" || inscripcion.evento.estado === "CANCELADO") {
      return { tipo: "NO_CANCELABLE" };
    }

    const totalPersonas = inscripcion._count.asistentes;

    const actualizada = await tx.inscripcion.updateMany({
      where: { id, estado: { not: "CANCELADO" } },
      data: { estado: "CANCELADO" },
    });
    if (actualizada.count === 0) return { tipo: "NO_CANCELABLE" };

    // Liberar las habitaciones asignadas a los asistentes de esta inscripción
    // en la misma transacción (CONTEXT.md §3 paso 5 y patrón de cancelación).
    await tx.asistenteHabitacion.deleteMany({
      where: { asistente: { inscripcionId: id } },
    });

    await tx.$executeRaw`
      UPDATE "eventos"
      SET "cuposOcupados" = "cuposOcupados" - ${totalPersonas}
      WHERE id = ${inscripcion.evento.id}
        AND "cuposOcupados" - ${totalPersonas} >= 0
    `;

    return { tipo: "OK" };
  });

  switch (resultado.tipo) {
    case "OK":
      return new NextResponse(null, { status: 204 });
    case "NO_ENCONTRADA":
      return error("La inscripción no existe.", 404);
    case "NO_CANCELABLE":
      return error(
        "La inscripción ya está cancelada o no se puede cancelar en este estado.",
        409
      );
  }
}