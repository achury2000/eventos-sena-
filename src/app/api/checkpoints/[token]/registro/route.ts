import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comprobarLimite } from "@/lib/rate-limit";
import {
  registrarAsistenciaEnCheckpoint,
  type ResultadoRegistro,
} from "@/lib/registro-checkpoint";

export const runtime = "nodejs";

const esquemaDocumento = z.object({
  documento: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "El documento debe tener entre 6 y 12 dígitos"),
});

const MENSAJES: Record<ResultadoRegistro, string> = {
  OK: "",
  YA_REGISTRADO: "Ya estás registrado en este checkpoint.",
  NO_ENCONTRADO: "Este documento no está inscrito en el evento.",
  CHECKPOINT_NO_ACTIVO: "Este checkpoint está desactivado.",
  NO_ASIGNADO_A_HABITACION:
    "Este documento no está asignado a esta habitación. Solicita al administrador que lo asigne al cuarto.",
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  // Antes de tocar la base de datos y no después: la respuesta del endpoint
  // distingue "documento no inscrito" de "ya registrado", así que un endpoint
  // ilimitado sirve para enumerar quién va a un evento. El límite de 30/min es
  // alto a propósito por el NAT de la red del sitio (design.md, D2 y D7).
  const limite = await comprobarLimite("checkpoint", request.headers);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: limite.mensaje },
      {
        status: 429,
        headers: { "retry-after": String(limite.reintentarEnSegundos) },
      }
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = esquemaDocumento.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "El documento debe tener entre 6 y 12 dígitos." },
      { status: 400 }
    );
  }

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { codigoQr: token },
  });
  if (!checkpoint) {
    return NextResponse.json({ error: "El checkpoint no existe." }, { status: 404 });
  }

  try {
    const resultado = await registrarAsistenciaEnCheckpoint(
      checkpoint,
      parsed.data.documento,
      { metodo: "AUTOREGISTRO" }
    );
    return respuesta(resultado);
  } catch {
    return NextResponse.json(
      { error: "Ocurrió un error inesperado. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}