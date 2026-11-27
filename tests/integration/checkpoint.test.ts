import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/checkpoints/[token]/registro/route";
import { prisma } from "@/lib/prisma";
import {
  crearAdminPrueba,
  crearAsistenteInscrito,
  crearCheckpointPrueba,
  crearEventoPrueba,
  crearHabitacionPrueba,
} from "../helpers/factories";

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

function postRegistro(token: string, documento: string): Promise<Response> {
  return POST(
    new NextRequest(`http://localhost:3000/api/checkpoints/${token}/registro`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documento }),
    }),
    { params: Promise.resolve({ token }) }
  );
}

describe("Duplicados en checkpoint", () => {
  let admin: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    admin = await crearAdminPrueba(prisma, "check");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("peticiones concurrentes del mismo documento persisten un único registro", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 10, adminId: admin.id });
    const checkpoint = await crearCheckpointPrueba(prisma, {
      eventoId: evento.id,
      activo: true,
    });
    const asistente = await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: "100000003401",
    });

    const respuestas = await Promise.all([
      postRegistro(checkpoint.codigoQr, "100000003401"),
      postRegistro(checkpoint.codigoQr, "100000003401"),
    ]);

    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);

    const registros = await prisma.registroControl.count({
      where: { asistenteId: asistente.id, checkpointId: checkpoint.id },
    });
    expect(registros).toBe(1);
  });

  it("un checkpoint desactivado rechaza el registro aunque el asistente exista", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 10, adminId: admin.id });
    const checkpoint = await crearCheckpointPrueba(prisma, {
      eventoId: evento.id,
      activo: false,
    });
    await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: "100000003501",
    });

    const respuesta = await postRegistro(checkpoint.codigoQr, "100000003501");

    expect(respuesta.status).toBe(422);
    const registros = await prisma.registroControl.count({
      where: { checkpointId: checkpoint.id },
    });
    expect(registros).toBe(0);
  });

  it("acepta a un ocupante asignado a la habitación", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 10, adminId: admin.id });
    const asistente = await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: "100000003601",
    });
    const habitacion = await crearHabitacionPrueba(prisma, {
      eventoId: evento.id,
      identificador: "601",
      capacidad: 2,
      asistenteIds: [asistente.id],
    });

    const respuesta = await postRegistro(habitacion.codigoQr, "100000003601");

    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ resultado: "OK" });
    expect(
      await prisma.registroControl.count({
        where: { checkpointId: habitacion.checkpointId },
      })
    ).toBe(1);
  });

  it("rechaza a un inscrito no asignado a la habitación sin crear registro", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 10, adminId: admin.id });
    await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: "100000003602",
    });
    const habitacion = await crearHabitacionPrueba(prisma, {
      eventoId: evento.id,
      identificador: "602",
      capacidad: 2,
    });

    const respuesta = await postRegistro(habitacion.codigoQr, "100000003602");

    expect(respuesta.status).toBe(422);
    expect(await respuesta.json()).toMatchObject({
      resultado: "NO_ASIGNADO_A_HABITACION",
    });
    expect(
      await prisma.registroControl.count({
        where: { checkpointId: habitacion.checkpointId },
      })
    ).toBe(0);
  });
});