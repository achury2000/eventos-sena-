import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { RolUsuario } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  registrarAsistenciaEnCheckpoint,
  type ResultadoRegistro,
} from "@/lib/registro-checkpoint";

export const runtime = "nodejs";

const esquemaRegistroManual = z.object({
  checkpointId: z.string().uuid("Checkpoint inválido"),
  documento: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "El documento debe tener entre 6 y 12 dígitos"),
});

const MENSAJES: Record<ResultadoRegistro, string> = {
  OK: "",
  YA_REGISTRADO: "Este documento ya se registró en este checkpoint.",
  NO_ENCONTRADO: "Este documento no está inscrito en el evento.",
  CHECKPOINT_NO_ACTIVO: "Este checkpoint está desactivado.",
  NO_ASIGNADO_A_HABITACION:
    "Este asistente no está asignado a esta habitación. Asígnalo al cuarto antes de registrar.",
};

const ESTATUS: Record<ResultadoRegistro, number> = {
  OK: 201,
  YA_REGISTRADO: 409,
  NO_ENCONTRADO: 404,
  CHECKPOINT_NO_ACTIVO: 422,
  NO_ASIGNADO_A_HABITACION: 422,
};

function respuesta(resultado: ResultadoRegistro): NextResponse {
  return NextResponse.json(
    resultado === "OK" ? { resultado } : { resultado, error: MENSAJES[resultado] },
    { status: ESTATUS[resultado] }
  );
}

// Registro asistido por el Operador para asistentes sin celular o con fallas
// de conectividad. Requiere un checkpoint ACTIVO del evento asignado al
// Operador; la fila queda marcada con metodo MANUAL y operadorId.
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.rol !== RolUsuario.OPERADOR) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = esquemaRegistroManual.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "El documento debe tener entre 6 y 12 dígitos." },
      { status: 400 }
    );
  }

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: parsed.data.checkpointId },
  });
  if (!checkpoint) {
    return NextResponse.json(
      { error: "El checkpoint no existe." },
      { status: 404 }
    );
  }

  const asignado = await prisma.eventoOperador.findUnique({
    where: {
      eventoId_operadorId: {
        eventoId: checkpoint.eventoId,
        operadorId: session.user.id,
      },
    },
    select: { eventoId: true },
  });
  if (!asignado) {
    return NextResponse.json(
      { error: "No tienes asignado este evento." },
      { status: 403 }
    );
  }

  try {
    const resultado = await registrarAsistenciaEnCheckpoint(
      checkpoint,
      parsed.data.documento,
      { metodo: "MANUAL", operadorId: session.user.id }
    );
    return respuesta(resultado);
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error inesperado. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
