import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as visorFirma } from "@/app/api/admin/eventos/[eventoId]/inscripciones/[inscripcionId]/firma/route";
import { prisma } from "@/lib/prisma";
import {
  crearAdminPrueba,
  crearAsistenteInscrito,
  crearEventoPrueba,
} from "../helpers/factories";

// ---------------------------------------------------------------------------
// El visor no debe depender de que el navegador alcance el almacenamiento
// (openspec/changes/visor-firma-servida-por-la-app): la ruta lee la firma con
// las credenciales del servidor y devuelve los bytes en su propia respuesta. El
// almacenamiento se sustituye por un doble para provocar, sin MinIO, el objeto
// ausente y el fallo del servicio.
// ---------------------------------------------------------------------------
const estado = vi.hoisted(() => ({
  sesion: null as { user: { id: string; rol: string } } | null,
}));

const almacen = vi.hoisted(() => ({
  resultado: null as { bytes: Uint8Array; contentType: string } | null,
  error: null as Error | null,
}));

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

// next-auth carga next/server en su interior, que no resuelve en el entorno
// node de vitest; la ruta solo necesita que el módulo exista.
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));

vi.mock("@/auth", () => ({ auth: async () => estado.sesion }));

vi.mock("@/lib/storage", () => ({
  leerFirma: async () => {
    if (almacen.error) throw almacen.error;
    return almacen.resultado;
  },
}));

const BYTES_FIRMA = Buffer.from("firma-png-de-prueba");
const DOC_TITULAR = "100000008001";
const MENSAJE_INEXISTENTE = "La inscripción no existe.";

function pedirVisor(eventoId: string, inscripcionId: string): Promise<Response> {
  return visorFirma(
    new Request(
      `http://localhost:3000/api/admin/eventos/${eventoId}/inscripciones/${inscripcionId}/firma`
    ),
    { params: Promise.resolve({ eventoId, inscripcionId }) }
  );
}

describe("Visor de firma servido por la aplicación", () => {
  let admin: { id: string };
  let otroAdmin: { id: string };
  let evento: { id: string };
  let inscripcion: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    admin = await crearAdminPrueba(prisma, "visoradm");
    otroAdmin = await crearAdminPrueba(prisma, "visoradm2");
    evento = await crearEventoPrueba(prisma, { cupo: 5, adminId: admin.id });
    await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: DOC_TITULAR,
    });
    inscripcion = await prisma.inscripcion.findFirstOrThrow({
      where: { eventoId: evento.id },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    estado.sesion = { user: { id: admin.id, rol: "ADMINISTRADOR" } };
    almacen.resultado = { bytes: BYTES_FIRMA, contentType: "image/png" };
    almacen.error = null;
  });

  it("sirve la imagen desde el propio visor, sin dirección del almacenamiento", async () => {
    const respuesta = await pedirVisor(evento.id, inscripcion.id);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("image/png");
    expect(respuesta.headers.get("content-disposition")).toBe("inline");
    expect(respuesta.headers.get("cache-control")).toBe("private, no-store");
    // Lo que rompía en el contenedor: la respuesta redirigía al navegador al
    // endpoint interno del almacenamiento.
    expect(respuesta.headers.get("location")).toBeNull();
    expect(Buffer.from(await respuesta.arrayBuffer())).toEqual(BYTES_FIRMA);
  });

  it("sin sesión responde no autenticado", async () => {
    estado.sesion = null;

    const respuesta = await pedirVisor(evento.id, inscripcion.id);

    expect(respuesta.status).toBe(401);
  });

  it("un Operador responde no autorizado", async () => {
    estado.sesion = { user: { id: admin.id, rol: "OPERADOR" } };

    const respuesta = await pedirVisor(evento.id, inscripcion.id);

    expect(respuesta.status).toBe(403);
  });

  it("una inscripción inexistente responde no encontrado", async () => {
    const respuesta = await pedirVisor(evento.id, "inscripcion-inexistente");

    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).error).toBe(MENSAJE_INEXISTENTE);
  });

  it("una inscripción de otro evento responde igual que una inexistente", async () => {
    const otroEvento = await crearEventoPrueba(prisma, {
      cupo: 5,
      adminId: otroAdmin.id,
    });

    const deOtroEvento = await pedirVisor(otroEvento.id, inscripcion.id);
    const inexistente = await pedirVisor(evento.id, "inscripcion-inexistente");

    expect(deOtroEvento.status).toBe(404);
    expect((await deOtroEvento.json()).error).toBe(MENSAJE_INEXISTENTE);
    expect((await inexistente.json()).error).toBe(MENSAJE_INEXISTENTE);
  });

  it("si el objeto no está en el almacenamiento responde no encontrado", async () => {
    almacen.resultado = null;

    const respuesta = await pedirVisor(evento.id, inscripcion.id);

    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).error).toBe("La firma no está disponible.");
  });

  it("si el almacenamiento falla responde error interno sin exponer detalles", async () => {
    almacen.error = new Error("conexión rechazada hacia el bucket interno");

    const respuesta = await pedirVisor(evento.id, inscripcion.id);

    expect(respuesta.status).toBe(500);
    expect((await respuesta.json()).error).toBe(
      "No se pudo abrir la firma. Inténtalo de nuevo."
    );
  });
});
