import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/inscripciones/route";
import { prisma } from "@/lib/prisma";
import {
  crearAdminPrueba,
  crearEventoPrueba,
  cuerpoInscripcion,
} from "../helpers/factories";

/**
 * Verifica que el route handler programe la confirmación por correo sin que el
 * envío condicione la respuesta (design.md, D2/D4). El módulo de correo se
 * mockea: aquí no se prueba el transporte (eso es email.test.ts) sino CUÁNDO y
 * CON QUÉ datos el handler lo invoca.
 */
const { programarMock } = vi.hoisted(() => ({ programarMock: vi.fn() }));

vi.mock("@/lib/email", () => ({
  programarConfirmacionInscripcion: programarMock,
}));

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

interface DatosProgramados {
  destinatario: string;
  nombreTitular: string;
  nombreEvento: string;
  lugar: string;
  totalPersonas: number;
}

describe("Confirmación por correo al inscribirse", () => {
  let admin: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    admin = await crearAdminPrueba(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    programarMock.mockReset();
  });

  it("programa la confirmación al titular tras una inscripción exitosa", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 5, adminId: admin.id });

    const respuesta = await postInscripcion(
      cuerpoInscripcion({
        eventoId: evento.id,
        titularDoc: "100000003101",
        acompananteDocs: ["200000003111"],
        correo: "titular@test.local",
      })
    );

    expect(respuesta.status).toBe(201);
    expect(programarMock).toHaveBeenCalledTimes(1);

    const datos = programarMock.mock.calls[0][0] as DatosProgramados;
    expect(datos.destinatario).toBe("titular@test.local");
    expect(datos.nombreTitular).toBe("Titular de Prueba");
    expect(datos.nombreEvento).toBe("Evento de prueba");
    expect(datos.lugar).toBe("Centro de prueba");
    expect(datos.totalPersonas).toBe(2);
  });

  it("no programa correo si el titular no dejó correo (es opcional)", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 5, adminId: admin.id });

    const respuesta = await postInscripcion(
      cuerpoInscripcion({ eventoId: evento.id, titularDoc: "100000003102" })
    );

    expect(respuesta.status).toBe(201);
    expect(programarMock).not.toHaveBeenCalled();
  });

  it("no programa correo si la inscripción se rechaza", async () => {
    const evento = await crearEventoPrueba(prisma, { cupo: 1, adminId: admin.id });
    await postInscripcion(
      cuerpoInscripcion({ eventoId: evento.id, titularDoc: "100000003103" })
    );
    programarMock.mockReset();

    const respuesta = await postInscripcion(
      cuerpoInscripcion({
        eventoId: evento.id,
        titularDoc: "100000003104",
        correo: "otro@test.local",
      })
    );

    expect(respuesta.status).toBe(409);
    expect(programarMock).not.toHaveBeenCalled();
  });
});
