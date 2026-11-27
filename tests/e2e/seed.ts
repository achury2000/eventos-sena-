import { hash } from "bcryptjs";
import {
  PrismaClient,
  EstadoEvento,
  RolUsuario,
  TipoAfiliacion,
  TipoCheckpoint,
} from "../../src/generated/prisma/client";
import { crearAsistenteInscrito } from "../helpers/factories";
import {
  ADMIN,
  DOC_AUTO,
  DOC_MANUAL,
  EMAIL_ADMIN,
  EMAIL_OPERADOR,
  NOMBRE_EVENTO,
  OPERADOR,
  prismaE2E,
} from "./soporte";

// Siembra el escenario e2e sobre la base de pruebas recién migrada. Se ejecuta
// en el globalSetup, así que cada corrida empieza desde cero (idempotente).
export async function semillaE2E(): Promise<void> {
  const prisma: PrismaClient = prismaE2E();
  try {
    const admin = await prisma.usuario.create({
      data: {
        nombreCompleto: "Administrador E2E",
        documento: "1000000001",
        email: EMAIL_ADMIN,
        passwordHash: await hash(ADMIN.password, 10),
        rol: RolUsuario.ADMINISTRADOR,
        tipoAfiliacion: TipoAfiliacion.SENA,
        centroFormacion: "Centro de Innovación E2E",
      },
      select: { id: true },
    });
    const operador = await prisma.usuario.create({
      data: {
        nombreCompleto: "Operador E2E",
        documento: "1000000002",
        email: EMAIL_OPERADOR,
        passwordHash: await hash(OPERADOR.password, 10),
        rol: RolUsuario.OPERADOR,
        tipoAfiliacion: TipoAfiliacion.SENA,
        centroFormacion: "Centro de Innovación E2E",
      },
      select: { id: true },
    });

    const ahora = new Date();
    const evento = await prisma.evento.create({
      data: {
        nombre: NOMBRE_EVENTO,
        lugar: "Auditorio Central",
        fechaInicio: nuevoAgregando(ahora, 2),
        fechaFin: nuevoAgregando(ahora, 3),
        inscripcionApertura: nuevoAgregando(ahora, -1),
        inscripcionCierre: nuevoAgregando(ahora, 1),
        cupoMaximo: 5,
        estado: EstadoEvento.INSCRIPCIONES_ABIERTAS,
        incluyeHotel: false,
        creadoPorId: admin.id,
      },
      select: { id: true },
    });

    await prisma.eventoOperador.create({
      data: { eventoId: evento.id, operadorId: operador.id },
    });

    await prisma.checkpoint.create({
      data: {
        eventoId: evento.id,
        nombre: "Control de ingreso",
        tipo: TipoCheckpoint.COMIDA,
        activo: true,
      },
      select: { id: true, codigoQr: true },
    });

    // Dos asistentes inscritos: DOC_AUTO para autoregistro, DOC_MANUAL para el
    // registro manual del Operador. El tablero parte en 0 registros.
    await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: DOC_AUTO,
    });
    await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: DOC_MANUAL,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function nuevoAgregando(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}