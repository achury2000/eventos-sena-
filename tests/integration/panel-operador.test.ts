import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as dashboard } from "@/app/api/operador/dashboard/route";
import { POST as registroManual } from "@/app/api/operador/registro-manual/route";
import { EstadoInscripcion } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cargarTableroOperador } from "@/lib/operador/tablero";
import {
  crearAdminPrueba,
  crearAsistenteInscrito,
  crearCheckpointPrueba,
  crearEventoPrueba,
  crearHabitacionPrueba,
  crearOperadorPrueba,
} from "../helpers/factories";

type SesionPrueba = { user: { id: string; rol: string } } | null;

const estado = vi.hoisted(() => ({ sesion: null as SesionPrueba }));

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

vi.mock("@/auth", () => ({ auth: async () => estado.sesion }));

describe("Tablero del Operador: vista de asistentes", () => {
  let operadorId: string;
  let eventoId: string;
  let otroEventoId: string;
  let checkpointId: string;
  let asistenteId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await crearAdminPrueba(prisma, "panel-operador");
    const operador = await crearOperadorPrueba(prisma, "panel-operador");
    operadorId = operador.id;

    const evento = await crearEventoPrueba(prisma, {
      cupo: 10,
      adminId: admin.id,
    });
    eventoId = evento.id;
    const otroEvento = await crearEventoPrueba(prisma, {
      cupo: 10,
      adminId: admin.id,
    });
    otroEventoId = otroEvento.id;

    await prisma.eventoOperador.create({
      data: { eventoId, operadorId },
    });

    const checkpoint = await crearCheckpointPrueba(prisma, {
      eventoId,
      activo: true,
    });
    checkpointId = checkpoint.id;
    const otroCheckpoint = await crearCheckpointPrueba(prisma, {
      eventoId: otroEventoId,
      activo: true,
    });

    const vigente = await crearAsistenteInscrito(prisma, {
      eventoId,
      documento: "400000000101",
    });
    asistenteId = vigente.id;
    const cancelado = await crearAsistenteInscrito(prisma, {
      eventoId,
      documento: "400000000102",
    });
    const ajeno = await crearAsistenteInscrito(prisma, {
      eventoId: otroEventoId,
      documento: "400000000103",
    });

    const { inscripcionId } = await prisma.asistente.findUniqueOrThrow({
      where: { id: cancelado.id },
      select: { inscripcionId: true },
    });
    await prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: { estado: EstadoInscripcion.CANCELADO },
    });

    await prisma.registroControl.createMany({
      data: [
        {
          asistenteId: vigente.id,
          checkpointId,
          metodo: "AUTOREGISTRO",
        },
        {
          asistenteId: cancelado.id,
          checkpointId,
          metodo: "MANUAL",
        },
        {
          asistenteId: ajeno.id,
          checkpointId: otroCheckpoint.id,
          metodo: "AUTOREGISTRO",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("devuelve nombres y estados por checkpoint sin exponer documentos", async () => {
    const tablero = await cargarTableroOperador(operadorId);

    expect(tablero.eventos.map((evento) => evento.id)).toEqual([eventoId]);
    const evento = tablero.eventos[0];
    expect(evento.asistentes).toHaveLength(1);
    expect(evento.asistentes[0]).toMatchObject({
      id: asistenteId,
      nombreCompleto: "Asistente de Prueba",
    });
    expect(evento.asistentes[0].registradoPorCheckpoint[checkpointId]).toBe(
      true
    );
    expect(evento.asistentes[0]).not.toHaveProperty("documento");

    const serialized = JSON.stringify(tablero);
    expect(serialized).not.toContain('"documento"');
    expect(serialized).not.toContain("400000000101");
    expect(serialized).not.toContain("400000000102");
    expect(serialized).not.toContain("400000000103");
  });

  it("rechaza el tablero sin sesión", async () => {
    estado.sesion = null;
    const respuesta = await dashboard();
    expect(respuesta.status).toBe(401);
  });

  it("rechaza el tablero a un rol distinto de Operador", async () => {
    estado.sesion = { user: { id: operadorId, rol: "ADMINISTRADOR" } };
    const respuesta = await dashboard();
    expect(respuesta.status).toBe(403);
  });

  it("la ruta solo entrega los eventos asignados y sin documentos", async () => {
    estado.sesion = { user: { id: operadorId, rol: "OPERADOR" } };
    const respuesta = await dashboard();

    expect(respuesta.status).toBe(200);
    const datos = (await respuesta.json()) as {
      eventos: { id: string; asistentes: unknown[] }[];
    };
    expect(datos.eventos.map((evento) => evento.id)).toEqual([eventoId]);
    expect(datos.eventos[0].asistentes).toHaveLength(1);
    expect(JSON.stringify(datos)).not.toContain('"documento"');
  });
});

describe("Registro manual en una habitación", () => {
  let operadorId: string;
  let checkpointHabitacionId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await crearAdminPrueba(prisma, "manual-habitacion");
    const operador = await crearOperadorPrueba(prisma, "manual-habitacion");
    operadorId = operador.id;

    const evento = await crearEventoPrueba(prisma, {
      cupo: 10,
      adminId: admin.id,
    });
    await prisma.eventoOperador.create({
      data: { eventoId: evento.id, operadorId },
    });
    await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: "500000000601",
    });
    const habitacion = await crearHabitacionPrueba(prisma, {
      eventoId: evento.id,
      identificador: "601",
      capacidad: 2,
    });
    checkpointHabitacionId = habitacion.checkpointId;

    estado.sesion = { user: { id: operadorId, rol: "OPERADOR" } };

    const respuesta = await registroManual(
      new NextRequest("http://localhost:3000/api/operador/registro-manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checkpointId: habitacion.checkpointId,
          documento: "500000000601",
        }),
      })
    );

    expect(respuesta.status).toBe(422);
    const cuerpo = (await respuesta.json()) as {
      resultado?: string;
      error?: string;
    };
    expect(cuerpo.resultado).toBe("NO_ASIGNADO_A_HABITACION");
    expect(cuerpo.error).toContain("no está asignado a esta habitación");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("no crea registro de un asistente no asignado", async () => {
    expect(
      await prisma.registroControl.count({
        where: { checkpointId: checkpointHabitacionId },
      })
    ).toBe(0);
  });
});

describe("Base de destinatarios por checkpoint", () => {
  let operadorId: string;
  let eventoId: string;
  let checkpointHabitacionId: string;
  let checkpointManualId: string;
  let ocupante1Id: string;
  let ocupante2Id: string;
  let noAsignadoId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await crearAdminPrueba(prisma, "base-destinatarios");
    const operador = await crearOperadorPrueba(prisma, "base-destinatarios");
    operadorId = operador.id;

    const evento = await crearEventoPrueba(prisma, {
      cupo: 10,
      adminId: admin.id,
    });
    eventoId = evento.id;
    await prisma.eventoOperador.create({
      data: { eventoId: evento.id, operadorId },
    });

    const documentos = [
      "600000000701",
      "600000000702",
      "600000000703",
      "600000000704",
      "600000000705",
      "600000000706",
    ];
    const asistentes = [];
    for (const documento of documentos) {
      asistentes.push(
        await crearAsistenteInscrito(prisma, { eventoId: evento.id, documento })
      );
    }
    ocupante1Id = asistentes[0].id;
    ocupante2Id = asistentes[1].id;
    noAsignadoId = asistentes[2].id;

    // El sexto inscrito está cancelado: la base del checkpoint manual sigue
    // siendo 5 asistentes vigentes.
    const cancelado = await prisma.asistente.findUniqueOrThrow({
      where: { id: asistentes[5].id },
      select: { inscripcionId: true },
    });
    await prisma.inscripcion.update({
      where: { id: cancelado.inscripcionId },
      data: { estado: EstadoInscripcion.CANCELADO },
    });

    const habitacion = await crearHabitacionPrueba(prisma, {
      eventoId: evento.id,
      identificador: "601",
      capacidad: 2,
      asistenteIds: [ocupante1Id, ocupante2Id],
    });
    checkpointHabitacionId = habitacion.checkpointId;
    const manual = await crearCheckpointPrueba(prisma, {
      eventoId: evento.id,
      activo: true,
    });
    checkpointManualId = manual.id;

    await prisma.registroControl.createMany({
      data: [
        {
          asistenteId: ocupante1Id,
          checkpointId: habitacion.checkpointId,
          metodo: "AUTOREGISTRO",
        },
        {
          asistenteId: ocupante2Id,
          checkpointId: habitacion.checkpointId,
          metodo: "MANUAL",
        },
        // Registro histórico de un asistente hoy no asignado: permanece en la
        // base de datos pero no cuenta para el avance de la habitación.
        {
          asistenteId: noAsignadoId,
          checkpointId: habitacion.checkpointId,
          metodo: "AUTOREGISTRO",
        },
        {
          asistenteId: asistentes[3].id,
          checkpointId: manual.id,
          metodo: "AUTOREGISTRO",
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("una habitación con 2 de 2 ocupantes muestra 100% aunque el evento tenga 5 asistentes", async () => {
    const tablero = await cargarTableroOperador(operadorId);
    const evento = tablero.eventos.find((item) => item.id === eventoId);
    expect(evento).toBeDefined();
    expect(evento!.totalAsistentes).toBe(5);

    const habitacion = evento!.checkpoints.find(
      (checkpoint) => checkpoint.id === checkpointHabitacionId
    );
    expect(habitacion).toMatchObject({
      registros: 2,
      manuales: 1,
      baseDestinatarios: 2,
    });
    expect(habitacion!.habitacion).toMatchObject({
      capacidad: 2,
      ocupados: 2,
    });
    expect(habitacion!.habitacion!.asignados).toEqual(
      expect.arrayContaining([ocupante1Id, ocupante2Id])
    );
    expect(habitacion!.habitacion!.asignados).not.toContain(noAsignadoId);

    const manual = evento!.checkpoints.find(
      (checkpoint) => checkpoint.id === checkpointManualId
    );
    expect(manual).toMatchObject({
      registros: 1,
      manuales: 0,
      baseDestinatarios: 5,
    });
  });

  it("conserva el registro histórico del asistente no asignado", async () => {
    expect(
      await prisma.registroControl.count({
        where: {
          checkpointId: checkpointHabitacionId,
          asistenteId: noAsignadoId,
        },
      })
    ).toBe(1);
  });
});
