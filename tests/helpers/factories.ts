import { EstadoEvento, PrismaClient, TipoAfiliacion } from "../../src/generated/prisma/client";

export interface CuerpoInscripcion {
  eventoId: string;
  titular: { nombreCompleto: string; documento: string; centroFormacion?: string };
  acompanantes: { nombreCompleto: string; documento: string; centroFormacion?: string }[];
  correo?: string;
  firmaBase64: string;
  aceptoTratamientoDatos: true;
}

export function firmaFake(): string {
  return "data:image/png;base64," + "a".repeat(64);
}

export async function crearAdminPrueba(
  prisma: PrismaClient,
  sufijo?: string
): Promise<{ id: string }> {
  const s = sufijo ?? `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return prisma.usuario.create({
    data: {
      nombreCompleto: `Admin Prueba ${s}`,
      documento: `9${s}`.slice(0, 12),
      email: `admin-prueba-${s}@test.local`,
      passwordHash: "no-usado-en-tests",
      rol: "ADMINISTRADOR",
      tipoAfiliacion: TipoAfiliacion.SENA,
    },
    select: { id: true },
  });
}

export async function crearOperadorPrueba(
  prisma: PrismaClient,
  sufijo?: string
): Promise<{ id: string }> {
  const s = sufijo ?? `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return prisma.usuario.create({
    data: {
      nombreCompleto: `Operador Prueba ${s}`,
      documento: `8${s}`.slice(0, 12),
      email: `operador-prueba-${s}@test.local`,
      passwordHash: "no-usado-en-tests",
      rol: "OPERADOR",
      tipoAfiliacion: TipoAfiliacion.SENA,
    },
    select: { id: true },
  });
}

export async function crearEventoPrueba(
  prisma: PrismaClient,
  opciones: {
    cupo: number;
    adminId: string;
    estado?: EstadoEvento;
    incluyeHotel?: boolean;
  }
): Promise<{ id: string }> {
  const ahora = new Date();
  return prisma.evento.create({
    data: {
      nombre: "Evento de prueba",
      lugar: "Centro de prueba",
      fechaInicio: nuevoAgregando(ahora, -1),
      fechaFin: nuevoAgregando(ahora, 2),
      inscripcionApertura: nuevoAgregando(ahora, -1),
      inscripcionCierre: nuevoAgregando(ahora, 1),
      cupoMaximo: opciones.cupo,
      estado: opciones.estado ?? EstadoEvento.INSCRIPCIONES_ABIERTAS,
      incluyeHotel: opciones.incluyeHotel ?? false,
      creadoPorId: opciones.adminId,
    },
    select: { id: true },
  });
}

export function cuerpoInscripcion(opciones: {
  eventoId: string;
  titularDoc: string;
  acompananteDocs?: string[];
  correo?: string;
  centroFormacion?: string;
}): CuerpoInscripcion {
  return {
    eventoId: opciones.eventoId,
    titular: {
      nombreCompleto: "Titular de Prueba",
      documento: opciones.titularDoc,
      ...(opciones.centroFormacion
        ? { centroFormacion: opciones.centroFormacion }
        : {}),
    },
    acompanantes: (opciones.acompananteDocs ?? []).map((d) => ({
      nombreCompleto: "Acompañante de Prueba",
      documento: d,
    })),
    correo: opciones.correo,
    firmaBase64: firmaFake(),
    aceptoTratamientoDatos: true,
  };
}

export async function crearAsistenteInscrito(
  prisma: PrismaClient,
  opciones: { eventoId: string; documento: string; esTitular?: boolean }
): Promise<{ id: string }> {
  const inscripcion = await prisma.inscripcion.create({
    data: {
      eventoId: opciones.eventoId,
      firmaUrl: "firma-test",
      aceptoTratamientoDatos: true,
      fechaAceptacionTratamiento: new Date(),
      asistentes: {
        create: {
          eventoId: opciones.eventoId,
          esTitular: opciones.esTitular ?? true,
          nombreCompleto: "Asistente de Prueba",
          documento: opciones.documento,
        },
      },
    },
    select: { asistentes: { select: { id: true } } },
  });
  return { id: inscripcion.asistentes[0].id };
}

export async function crearCheckpointPrueba(
  prisma: PrismaClient,
  opciones: { eventoId: string; activo: boolean }
): Promise<{ id: string; codigoQr: string }> {
  return prisma.checkpoint.create({
    data: {
      eventoId: opciones.eventoId,
      nombre: "Checkpoint de prueba",
      tipo: "COMIDA",
      activo: opciones.activo,
    },
    select: { id: true, codigoQr: true },
  });
}

export async function crearHabitacionPrueba(
  prisma: PrismaClient,
  opciones: {
    eventoId: string;
    identificador: string;
    capacidad: number;
    asistenteIds?: string[];
  }
): Promise<{ id: string; checkpointId: string; codigoQr: string }> {
  const habitacion = await prisma.habitacion.create({
    data: {
      eventoId: opciones.eventoId,
      identificador: opciones.identificador,
      capacidad: opciones.capacidad,
      checkpoint: {
        create: {
          evento: { connect: { id: opciones.eventoId } },
          nombre: `Habitación ${opciones.identificador}`,
          tipo: "ALOJAMIENTO",
          activo: true,
        },
      },
    },
    select: {
      id: true,
      checkpoint: { select: { id: true, codigoQr: true } },
    },
  });

  for (const asistenteId of opciones.asistenteIds ?? []) {
    await prisma.asistenteHabitacion.create({
      data: { asistenteId, habitacionId: habitacion.id },
    });
  }

  return {
    id: habitacion.id,
    checkpointId: habitacion.checkpoint!.id,
    codigoQr: habitacion.checkpoint!.codigoQr,
  };
}

function nuevoAgregando(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}