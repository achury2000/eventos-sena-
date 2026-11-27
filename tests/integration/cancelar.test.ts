import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as cancelar } from "@/app/api/inscripciones/[id]/cancelar/route";
import { POST as inscribir } from "@/app/api/inscripciones/route";
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

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { rol: "ADMINISTRADOR" } }),
}));

function postInscripcion(cuerpo: unknown): Promise<Response> {
  return inscribir(
    new NextRequest("http://localhost:3000/api/inscripciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

function postCancelar(id: string): Promise<Response> {
  return cancelar(
    new NextRequest(`http://localhost:3000/api/inscripciones/${id}/cancelar`, {
      method: "POST",
    }),
    { params: Promise.resolve({ id }) }
  );
}

describe("Cancelación de inscripción libera cupos", () => {
  let admin: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    admin = await crearAdminPrueba(prisma, "cancel");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("libera exactamente las personas del grupo y una doble cancelación no libera dos veces", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 10, adminId: admin.id });

    const inscripcionRespuesta = await postInscripcion(
      cuerpoInscripcion({
        eventoId: evento.id,
        titularDoc: "100000003601",
        acompananteDocs: ["200000003621", "200000003622"],
      })
    );
    expect(inscripcionRespuesta.status).toBe(201);
    const { id: inscripcionId } = (await inscripcionRespuesta.json()) as { id: string };

    let ev = await prisma.evento.findUnique({ where: { id: evento.id } });
    expect(ev?.cuposOcupados).toBe(3);

    const primera = await postCancelar(inscripcionId);
    expect(primera.status).toBe(204);

    ev = await prisma.evento.findUnique({ where: { id: evento.id } });
    expect(ev?.cuposOcupados).toBe(0);

    const segunda = await postCancelar(inscripcionId);
    expect(segunda.status).toBe(409);

    ev = await prisma.evento.findUnique({ where: { id: evento.id } });
    expect(ev?.cuposOcupados).toBe(0);

    const reapertura = await postInscripcion(
      cuerpoInscripcion({
        eventoId: evento.id,
        titularDoc: "100000003602",
        acompananteDocs: ["200000003641", "200000003642"],
      })
    );
    expect(reapertura.status).toBe(201);
    ev = await prisma.evento.findUnique({ where: { id: evento.id } });
    expect(ev?.cuposOcupados).toBe(3);
  });
});