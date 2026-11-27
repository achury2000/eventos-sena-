import { prisma } from "@/lib/prisma";

export type ResultadoCambioCheckpoint =
  | { ok: true }
  | { ok: false; error: string };

// Núcleo del toggle, separado de la Server Action para poder verificarlo
// contra la base de datos sin contexto de request. Valida que el checkpoint
// pertenezca a un evento asignado al Operador antes de cambiar el estado.
// Recibe el estado objetivo (idempotente) y deja activadoPorId en el Operador
// que ejecutó el cambio (CONTEXT.md §5).
export async function cambiarEstadoCheckpointDeEvento(
  checkpointId: string,
  operadorId: string,
  activo: boolean,
): Promise<ResultadoCambioCheckpoint> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    select: { id: true, eventoId: true },
  });
  if (!checkpoint) {
    return { ok: false, error: "El checkpoint no existe." };
  }

  const asignado = await prisma.eventoOperador.findUnique({
    where: {
      eventoId_operadorId: { eventoId: checkpoint.eventoId, operadorId },
    },
    select: { eventoId: true },
  });
  if (!asignado) {
    return { ok: false, error: "No tienes asignado este evento." };
  }

  await prisma.checkpoint.update({
    where: { id: checkpoint.id },
    data: { activo, activadoPorId: operadorId },
  });

  return { ok: true };
}
