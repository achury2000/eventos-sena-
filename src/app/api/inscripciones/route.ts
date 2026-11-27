import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { programarConfirmacionInscripcion } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { comprobarLimite } from "@/lib/rate-limit";
import { eliminarFirma, subirFirma } from "@/lib/storage";
import {
  esquemaInscripcion,
  validarEventoParaInscripcion,
} from "@/lib/validations/inscripcion";

export const runtime = "nodejs";

// Sentinel para el rechazo del `UPDATE` atómico. Es una constante, no un
// literal suelto, porque ahora ese `filas === 0` tiene tres causas posibles y
// comparar strings a mano es justo el tipo de cosa que se desincroniza al
// editar el mensaje de error de arriba.
const EVENTO_RECHAZO_INSCRIPCION = "EVENTO_RECHAZO_INSCRIPCION";

// Mensaje único para el exceso de acompañantes, compartido entre el
// pre-chequeo y la re-consulta de desambiguación, para que el titular nunca
// reciba dos textos distintos por el mismo problema. El `0` se redacta como lo
// que es ("inscripción individual") en vez de soltarlo como un número.
function mensajeAcompanantesExcedidos(maxAcompanantes: number) {
  if (maxAcompanantes === 0) {
    return "Este evento es de inscripción individual: no admite acompañantes.";
  }
  const plural = maxAcompanantes === 1 ? "" : "s";
  return `Este evento admite hasta ${maxAcompanantes} acompañante${plural} por inscripción.`;
}

function error(mensaje: string, status: number, errors?: Record<string, string>) {
  return NextResponse.json(errors ? { error: mensaje, errors } : { error: mensaje }, {
    status,
  });
}

function aBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Buffer.from(base64, "base64");
}

function esDuplicadoDocumento(err: Prisma.PrismaClientKnownRequestError): boolean {
  const meta = err.meta ?? {};
  const interno = (
    meta.driverAdapterError as { cause?: { originalMessage?: string } } | undefined
  )?.cause?.originalMessage ?? "";
  const target = Array.isArray(meta.target)
    ? (meta.target as string[]).join(",")
    : typeof meta.target === "string"
      ? meta.target
      : "";
  return `${interno} ${target}`.includes("documento");
}

export async function POST(request: Request): Promise<NextResponse> {
  // Va PRIMERO, antes del parseo, de la lectura del evento y —sobre todo—
  // antes de `subirFirma`. Una inscripción rechazada por límite no debe dejar
  // un PNG en el bucket que nadie va a leer ni avanzar un cupo. Ver design.md,
  // D6: comprobar el límite al final no cerraría el ataque.
  const limite = await comprobarLimite("inscripcion", request.headers);
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
    return error("Solicitud inválida.", 400);
  }

  const parsed = esquemaInscripcion.safeParse(cuerpo);
  if (!parsed.success) {
    const errores: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errores[key]) errores[key] = issue.message;
    }
    return error("Datos inválidos.", 400, errores);
  }

  const { eventoId, titular, acompanantes, correo, firmaBase64 } = parsed.data;

  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento) return error("El evento no existe.", 404);

  const validacion = validarEventoParaInscripcion(evento);
  if (!validacion.ok) {
    const mensaje =
      validacion.razon === "NO_ABIERTAS"
        ? "Las inscripciones para este evento no están abiertas."
        : "El periodo de inscripción para este evento aún no inicia o ya cerró.";
    return error(mensaje, 403);
  }

  // Pre-chequeo de acompañantes, antes de subir la firma. No es la autoridad:
  // la guarda real está dentro del `UPDATE` atómico de más abajo, que la
  // aplica dentro de la transacción y por eso no tiene ventana de TOCTOU. Este
  // chequeo existe para no escribir un PNG en el bucket y luego deshacerlo
  // cuando la respuesta va a ser rechazada de todos modos. Que el valor pueda
  // haber cambiado entre esta lectura y el `UPDATE` es un residuo aceptado: la
  // guarda del `UPDATE` rechaza igual, solo que con un mensaje algo menos
  // preciso. Ver design.md, decisión D6.
  if (acompanantes.length > evento.maxAcompanantes) {
    return error(mensajeAcompanantesExcedidos(evento.maxAcompanantes), 422);
  }

  let claveFirma: string | undefined;
  try {
    claveFirma = await subirFirma(aBuffer(firmaBase64));
  } catch {
    return error("No se pudo guardar la firma. Inténtalo de nuevo.", 500);
  }

  const totalPersonas = 1 + acompanantes.length;

  try {
    const inscripcion = await prisma.$transaction(async (tx) => {
      const filas = await tx.$executeRaw`
        UPDATE "eventos"
        SET "cuposOcupados" = "cuposOcupados" + ${totalPersonas}
        WHERE id = ${eventoId}
          AND "cuposOcupados" + ${totalPersonas} <= "cupoMaximo"
          AND "estado" = 'INSCRIPCIONES_ABIERTAS'
          AND ${totalPersonas} <= 1 + "maxAcompanantes"
      `;
      if (filas === 0) throw new Error(EVENTO_RECHAZO_INSCRIPCION);

      const insc = await tx.inscripcion.create({
        data: {
          eventoId,
          correo: correo ?? null,
          firmaUrl: claveFirma as string,
          aceptoTratamientoDatos: true,
          fechaAceptacionTratamiento: new Date(),
        },
      });

      await tx.asistente.create({
        data: {
          inscripcionId: insc.id,
          eventoId,
          esTitular: true,
          nombreCompleto: titular.nombreCompleto,
          documento: titular.documento,
          centroFormacion: titular.centroFormacion ?? null,
        },
      });

      for (const a of acompanantes) {
        await tx.asistente.create({
          data: {
            inscripcionId: insc.id,
            eventoId,
            esTitular: false,
            nombreCompleto: a.nombreCompleto,
            documento: a.documento,
            centroFormacion: a.centroFormacion ?? null,
          },
        });
      }

      return insc;
    });

    // El correo se programa SOLO tras el commit exitoso y solo si el titular
    // dejó un correo (es opcional). `programarConfirmacionInscripcion` no lanza
    // y envía después de responder: si el proveedor falla, la inscripción ya
    // quedó registrada y la persona ya vio la confirmación en pantalla
    // (design.md, D2 y D4).
    if (correo) {
      programarConfirmacionInscripcion({
        destinatario: correo,
        nombreTitular: titular.nombreCompleto,
        nombreEvento: evento.nombre,
        lugar: evento.lugar,
        fechaInicio: evento.fechaInicio,
        fechaFin: evento.fechaFin,
        totalPersonas,
      });
    }

    return NextResponse.json({ id: inscripcion.id }, { status: 201 });
  } catch (err) {
    if (claveFirma) {
      await eliminarFirma(claveFirma).catch(() => {});
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return error(
        esDuplicadoDocumento(err)
          ? "Este documento ya está inscrito en este evento."
          : "La inscripción no pudo completarse.",
        409
      );
    }

    if (err instanceof Error && err.message === EVENTO_RECHAZO_INSCRIPCION) {
      // El `UPDATE` se rechazó, pero no dice POR QUÉ: su `WHERE` combina tres
      // condiciones. Una sola re-consulta trae los datos de las tres y se decide
      // en orden, del motivo más estructural al más cuantitativo. Se hace una
      // re-consulta y no dos `UPDATE` separados para no duplicar la línea que
      // serializa los cupos, que es la parte sensible a la concurrencia.
      // Ver design.md, decisión D7.
      const ev = await prisma.evento
        .findUnique({
          where: { id: eventoId },
          // Solo lo que las dos decisiones anteriores necesitan. El cupo no se
          // consulta: su caso residual es indistinguible del de una carrera
          // perdida, y ambos se responden igual.
          select: { estado: true, maxAcompanantes: true },
        })
        .catch(() => null);

      if (!ev || ev.estado !== "INSCRIPCIONES_ABIERTAS") {
        return error("Las inscripciones para este evento ya cerraron.", 403);
      }
      if (totalPersonas > 1 + ev.maxAcompanantes) {
        return error(mensajeAcompanantesExcedidos(ev.maxAcompanantes), 422);
      }
      // Si ninguna de las dos anteriores aplica, la causa es el cupo: o ya está
      // lleno, o alguien más se lo llevó entre nuestra re-consulta y el
      // `UPDATE` (la carrera que el `UPDATE` atómico existe para arbitrar).
      // Ambas se responden igual.
      return error("El evento ya alcanzó su cupo.", 409);
    }

    return error("Ocurrió un error inesperado. Inténtalo de nuevo.", 500);
  }
}