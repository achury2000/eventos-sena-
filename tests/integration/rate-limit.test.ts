import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as registrar } from "@/app/api/checkpoints/[token]/registro/route";
import { POST as inscribir } from "@/app/api/inscripciones/route";
import { prisma } from "@/lib/prisma";
import { comprobarLimite, ipDeOrigen } from "@/lib/rate-limit";
import {
  crearAdminPrueba,
  crearAsistenteInscrito,
  crearCheckpointPrueba,
  crearEventoPrueba,
  cuerpoInscripcion,
} from "../helpers/factories";

/**
 * El limitador real se sustituye por un doble controlado. La suite no puede
 * depender de Upstash: lo que importa verificar aquí es que CADA punto de
 * entrada respete el resultado del límite y que lo haga ANTES de tocar la base
 * de datos o el bucket (design.md, D6).
 */
let limiteSimulado: { permitido: boolean; mensaje?: string } = {
  permitido: true,
};

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...original,
    comprobarLimite: async () => limiteSimulado,
  };
});

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

// Espía de escritura: si el endpoint sube la firma antes de mirar el límite,
// el ataque no se cerró aunque responda 429.
const firmasSubidas: string[] = [];

vi.mock("@/lib/storage", async () => {
  const { randomUUID } = await import("node:crypto");
  return {
    subirFirma: async () => {
      firmasSubidas.push(randomUUID());
      return `firma-prueba-${randomUUID()}`;
    },
    eliminarFirma: async () => undefined,
  };
});

function postInscripcion(cuerpo: unknown): Promise<Response> {
  return inscribir(
    new NextRequest("http://localhost:3000/api/inscripciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

function postRegistro(token: string, documento: string): Promise<Response> {
  return registrar(
    new NextRequest(`http://localhost:3000/api/checkpoints/${token}/registro`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documento }),
    }),
    { params: Promise.resolve({ token }) }
  );
}

describe("Rate limiting y headers de seguridad", () => {
  let admin: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    admin = await crearAdminPrueba(prisma, "ratelimit");
    limiteSimulado = { permitido: true };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Identificación de la IP de origen", () => {
    it("toma el primer valor de la cadena de reenvío", () => {
      const headers = new Headers({
        "x-forwarded-for": "203.0.113.7, 198.51.100.1, 10.0.0.1",
      });
      expect(ipDeOrigen(headers)).toBe("203.0.113.7");
    });

    it("cae a x-real-ip cuando no hay cadena de reenvío", () => {
      expect(ipDeOrigen(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe(
        "203.0.113.9"
      );
    });

    it("sin ningún encabezado aplica un límite compartido en vez de ninguno", () => {
      expect(ipDeOrigen(new Headers())).toBe("ip-desconocida");
    });
  });

  describe("Falla abierta sin el servicio de conteo configurado", () => {
    it("permite la petición y no lanza", async () => {
      // Sin credenciales reales (vacías o ausentes — `.env.example` las deja en
      // blanco, que es el caso por defecto en CI), que es exactamente lo que
      // la falla abierta debe cubrir.
      expect(process.env.UPSTASH_REDIS_REST_URL).toBeFalsy();
      expect(process.env.UPSTASH_REDIS_REST_TOKEN).toBeFalsy();
      const resultado = await comprobarLimite(
        "login",
        new Headers({ "x-forwarded-for": "203.0.113.1" })
      );
      expect(resultado.permitido).toBe(true);
    });

    it("las peticiones normales a los endpoints públicos siguen funcionando", async () => {
      limiteSimulado = { permitido: true };
      const evento = await crearEventoPrueba(prisma, { cupo: 5, adminId: admin.id });
      const respuesta = await postInscripcion(
        cuerpoInscripcion({ eventoId: evento.id, titularDoc: "100000007001" })
      );
      expect(respuesta.status).toBe(201);
    });
  });

  describe("Inscripción pública: el límite se aplica antes de la firma", () => {
    it("responde 429 sin escribir la firma ni tocar los cupos", async () => {
      limiteSimulado = {
        permitido: false,
        mensaje: "Demasiados envíos seguidos desde esta conexión.",
      };
      firmasSubidas.length = 0;

      const evento = await crearEventoPrueba(prisma, { cupo: 5, adminId: admin.id });
      const antes = await prisma.evento.findUnique({
        where: { id: evento.id },
        select: { cuposOcupados: true },
      });

      const respuesta = await postInscripcion(
        cuerpoInscripcion({ eventoId: evento.id, titularDoc: "100000007101" })
      );

      expect(respuesta.status).toBe(429);
      expect(respuesta.headers.get("retry-after")).toBeTruthy();
      expect((await respuesta.json()).error).toBe(
        "Demasiados envíos seguidos desde esta conexión."
      );

      // Lo importante: el rechazo por límite no deja residuos.
      expect(firmasSubidas).toHaveLength(0);
      const despues = await prisma.evento.findUnique({
        where: { id: evento.id },
        select: { cuposOcupados: true },
      });
      expect(despues?.cuposOcupados).toBe(antes?.cuposOcupados);
      const inscripciones = await prisma.inscripcion.count({
        where: { eventoId: evento.id },
      });
      expect(inscripciones).toBe(0);
    });
  });

  describe("Autoregistro en checkpoint: el límite se aplica antes de la base de datos", () => {
    it("responde 429 y no registra a nadie", async () => {
      limiteSimulado = {
        permitido: false,
        mensaje: "Demasiadas consultas seguidas desde esta conexión.",
      };

      const evento = await crearEventoPrueba(prisma, { cupo: 5, adminId: admin.id });
      const checkpoint = await crearCheckpointPrueba(prisma, {
        eventoId: evento.id,
        activo: true,
      });
      await crearAsistenteInscrito(prisma, {
        eventoId: evento.id,
        documento: "100000007201",
      });

      const respuesta = await postRegistro(checkpoint.codigoQr, "100000007201");

      expect(respuesta.status).toBe(429);
      expect((await respuesta.json()).error).toBe(
        "Demasiadas consultas seguidas desde esta conexión."
      );

      // Ni un RegistroControl: un 429 que llegara después de insertar dejaría
      // constancia de que el asistente "asistió" sin que nadie lo pidiera.
      const registros = await prisma.registroControl.count({
        where: { checkpointId: checkpoint.id },
      });
      expect(registros).toBe(0);
    });
  });
});
