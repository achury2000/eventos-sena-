import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Tipo de la capa de API, NO un enum de la base de datos (CONTEXT.md §7).
// Solo "OK" llega a persistirse como fila real; el resto son rechazos de la
// capa de aplicación.
export type ResultadoRegistro =
  | "OK"
  | "YA_REGISTRADO"
  | "NO_ENCONTRADO"
  | "CHECKPOINT_NO_ACTIVO"
  | "NO_ASIGNADO_A_HABITACION";

export interface CheckpointParaRegistro {
  id: string;
  eventoId: string;
  activo: boolean;
  // Solo presente en checkpoints respaldados por una habitación. Permite
  // validar que el asistente pertenezca a ese cuarto antes de registrar.
  habitacionId?: string | null;
}

export interface OpcionesRegistro {
  metodo: "AUTOREGISTRO" | "MANUAL";
  operadorId?: string | null;
}

// Lógica de registro de asistencia compartida entre el autoregistro por QR
// (route handler público) y el registro manual del dashboard del Operador.
// Regla de CONTEXT.md §7: SIEMPRE intentar insertar y capturar el duplicado
// (P2002), nunca "verificar y luego insertar".
export async function registrarAsistenciaEnCheckpoint(
  checkpoint: CheckpointParaRegistro,
  documento: string,
  opciones: OpcionesRegistro
): Promise<ResultadoRegistro> {
  if (!checkpoint.activo) {
    return "CHECKPOINT_NO_ACTIVO";
  }

  const asistente = await prisma.asistente.findUnique({
    where: { eventoId_documento: { eventoId: checkpoint.eventoId, documento } },
  });
  if (!asistente) {
    return "NO_ENCONTRADO";
  }

  // Los checkpoints respaldados por habitación son estaciones exclusivas de
  // sus ocupantes. Se valida la relación antes de insertar para no persistir
  // registros de asistentes ajenos al cuarto (los históricos se conservan).
  if (checkpoint.habitacionId) {
    const asignado = await prisma.asistenteHabitacion.findUnique({
      where: {
        asistenteId_habitacionId: {
          asistenteId: asistente.id,
          habitacionId: checkpoint.habitacionId,
        },
      },
      select: { asistenteId: true },
    });
    if (!asignado) {
      return "NO_ASIGNADO_A_HABITACION";
    }
  }

  try {
    await prisma.registroControl.create({
      data: {
        asistenteId: asistente.id,
        checkpointId: checkpoint.id,
        metodo: opciones.metodo,
        operadorId: opciones.operadorId ?? null,
      },
    });
    return "OK";
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return "YA_REGISTRADO";
    }
    throw err;
  }
}