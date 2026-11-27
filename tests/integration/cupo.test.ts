import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/inscripciones/route";
import { prisma } from "@/lib/prisma";
import {
  crearAdminPrueba,
  crearEventoPrueba,
  cuerpoInscripcion,
} from "../helpers/factories";

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

vi.mock("@/lib/storage", async () => {
  const { randomUUID } = await import("node:crypto");
  return {
    subirFirma: async () => `firma-prueba-${randomUUID()}`,
    eliminarFirma: async () => undefined,
  };
});

function postInscripcion(cuerpo: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost:3000/api/inscripciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

describe("Cupo atómico del evento", () => {
  let admin: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    admin = await crearAdminPrueba(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("nunca excede cupoMaximo con inscripciones concurrentes (grupos incluidos)", async () => {
    const cupo = 5;
    const evento = await crearEventoPrueba(prisma, { cupo, adminId: admin.id });

    const peticiones = [
      cuerpoInscripcion({ eventoId: evento.id, titularDoc: "100000001101" }),
      cuerpoInscripcion({ eventoId: evento.id, titularDoc: "100000001102" }),
      cuerpoInscripcion({
        eventoId: evento.id,
        titularDoc: "100000001103",
        acompananteDocs: ["200000001121", "200000001122"],
      }),
      cuerpoInscripcion({
        eventoId: evento.id,
        titularDoc: "100000001104",
        acompananteDocs: ["200000001141", "200000001142", "200000001143"],
      }),
    ];

    const respuestas = await Promise.all(peticiones.map((p) => postInscripcion(p)));

    for (const r of respuestas) {
      expect([201, 409]).toContain(r.status);
    }
    // Con cupo 5 y grupos de 1, 1, 3 y 4 personas hay dos combinaciones que
    // llenan el cupo exacto: {1, 1, 3} o {1, 4}. Cuál de las dos se lleva el
    // cupo depende del orden en que las transacciones toman el UPDATE atómico,
    // así que el número de respuestas 201 no es determinista. Lo que sí se
    // verifica abajo es la invariante que importa: el cupo queda lleno y nunca
    // excedido, y un grupo rechazado no entra completo ni en parte.
    const exitosas = respuestas.filter((r) => r.status === 201);
    expect([2, 3]).toContain(exitosas.length);

    const personasExitosas = peticiones
      .filter((_, i) => respuestas[i].status === 201)
      .reduce((suma, p) => suma + 1 + p.acompanantes.length, 0);
    expect(personasExitosas).toBe(cupo);

    const ev = await prisma.evento.findUnique({ where: { id: evento.id } });
    expect(ev?.cuposOcupados).toBe(cupo);
    expect(ev?.cuposOcupados).toBeLessThanOrEqual(ev?.cupoMaximo ?? Infinity);

    const asistentes = await prisma.asistente.count({
      where: { eventoId: evento.id },
    });
    expect(asistentes).toBe(cupo);
  });

  it("rechaza íntegro un grupo que no cabe completo en el cupo", async () => {
    const cupo = 2;
    const evento = await crearEventoPrueba(prisma, { cupo, adminId: admin.id });

    await postInscripcion(
      cuerpoInscripcion({ eventoId: evento.id, titularDoc: "100000001201" })
    );

    const grupo = cuerpoInscripcion({
      eventoId: evento.id,
      titularDoc: "100000001202",
      acompananteDocs: ["200000001221", "200000001222"],
    });
    const respuesta = await postInscripcion(grupo);

    expect(respuesta.status).toBe(409);

    const ev = await prisma.evento.findUnique({ where: { id: evento.id } });
    expect(ev?.cuposOcupados).toBe(1);

    const asistentes = await prisma.asistente.count({
      where: { eventoId: evento.id },
    });
    expect(asistentes).toBe(1);
  });

  it("guarda el centro de formación del titular como texto y deja null el del acompañante", async () => {
    const evento = await crearEventoPrueba(prisma, {
      cupo: 2,
      adminId: admin.id,
    });

    const respuesta = await postInscripcion(
      cuerpoInscripcion({
        eventoId: evento.id,
        titularDoc: "100000001301",
        acompananteDocs: ["200000001321"],
        centroFormacion: "Centro de Prueba Integración",
      })
    );

    expect(respuesta.status).toBe(201);

    const titular = await prisma.asistente.findFirst({
      where: { eventoId: evento.id, esTitular: true },
      select: { centroFormacion: true },
    });
    expect(titular?.centroFormacion).toBe("Centro de Prueba Integración");

    const acompanante = await prisma.asistente.findFirst({
      where: { eventoId: evento.id, esTitular: false },
      select: { centroFormacion: true },
    });
    expect(acompanante?.centroFormacion).toBeNull();
  });
});