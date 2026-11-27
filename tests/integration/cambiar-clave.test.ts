import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { compare, hash } from "bcryptjs";
import { cambiarClavePropia } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";
import { TipoAfiliacion } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// La sesión se controla con `estado.sesion`: con sesión, la cuenta a cambiar
// sale de la sesión (nunca del formulario); con `estado.sesion` en null se
// prueba el camino público (enlace del inicio de sesión), donde la cuenta se
// identifica por el correo.
// ---------------------------------------------------------------------------
const estado = vi.hoisted(() => ({
  sesion: null as { user: { id: string; rol: string } } | null,
}));
const limite = vi.hoisted(() => ({ permitido: true, mensaje: "" }));

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

// El limitador real necesita Upstash (no configurado en las pruebas); aquí se
// sustituye por un doble controlado para poder probar el rechazo por límite.
vi.mock("@/lib/rate-limit", () => ({
  comprobarLimite: async () =>
    limite.permitido
      ? { permitido: true }
      : {
          permitido: false,
          mensaje: limite.mensaje,
          reintentarEnSegundos: 60,
        },
  ipDeOrigen: () => "127.0.0.1",
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// redirect() es no-op de servidor; en node lanza el equivalente a NEXT_REDIRECT.
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// next-auth carga next/server en su interior, que no resuelve en el entorno
// node de vitest. Solo se necesita AuthError (que cambiarClavePropia no usa).
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
vi.mock("@/auth", () => ({
  auth: async () => estado.sesion,
  signIn: vi.fn(),
}));

const SESION_ID = "sesion-clave-test";
const CLAVE_VIEJA = "clave-vieja-123";
const CLAVE_PUBLICA = "clave-publica-123";
const EMAIL_PUBLICO = "publico-clave@test.local";
// Mismo texto para correo inexistente y contraseña actual incorrecta.
const GENERICO = "El correo o la contraseña actual no son correctos.";

let hashViejo = "";
let hashPublico = "";

function formulario(datos: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [clave, valor] of Object.entries(datos)) fd.set(clave, valor);
  return fd;
}

async function cuentaSesion() {
  return prisma.usuario.findUniqueOrThrow({
    where: { id: SESION_ID },
    select: { passwordHash: true, debeCambiarClave: true },
  });
}

async function cuentaPublica() {
  return prisma.usuario.findUniqueOrThrow({
    where: { email: EMAIL_PUBLICO },
    select: { passwordHash: true, debeCambiarClave: true },
  });
}

beforeAll(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "usuarios" CASCADE`;
  hashViejo = await hash(CLAVE_VIEJA, 10);
  hashPublico = await hash(CLAVE_PUBLICA, 10);

  await prisma.usuario.create({
    data: {
      id: SESION_ID,
      nombreCompleto: "Operador con sesión",
      documento: "11111111",
      email: "operador-sesion@test.local",
      passwordHash: hashViejo,
      rol: "OPERADOR",
      tipoAfiliacion: TipoAfiliacion.SENA,
    },
  });

  await prisma.usuario.create({
    data: {
      nombreCompleto: "Cuenta pública",
      documento: "33333333",
      email: EMAIL_PUBLICO,
      passwordHash: hashPublico,
      rol: "OPERADOR",
      tipoAfiliacion: TipoAfiliacion.SENA,
    },
  });

  await prisma.usuario.create({
    data: {
      nombreCompleto: "Otra cuenta",
      documento: "22222222",
      email: "otra-cuenta@test.local",
      passwordHash: await hash("clave-ajena-456", 10),
      rol: "OPERADOR",
      tipoAfiliacion: TipoAfiliacion.SENA,
    },
  });
});

// Cada prueba parte de la contraseña original: el cambio de clave es una
// mutación y encadenarlas haría depender unas pruebas de otras.
beforeEach(async () => {
  estado.sesion = { user: { id: SESION_ID, rol: "OPERADOR" } };
  limite.permitido = true;
  limite.mensaje = "";
  await prisma.usuario.update({
    where: { id: SESION_ID },
    data: { passwordHash: hashViejo, debeCambiarClave: false },
  });
  await prisma.usuario.update({
    where: { email: EMAIL_PUBLICO },
    data: { passwordHash: hashPublico, debeCambiarClave: false },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("cambiarClavePropia con sesión", () => {
  it("cambia la contraseña cuando la actual es correcta", async () => {
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        passwordActual: CLAVE_VIEJA,
        password: "clave-nueva-789",
        confirmacion: "clave-nueva-789",
      })
    );

    expect(estadoAccion?.error).toBeUndefined();
    expect(estadoAccion?.ok).toBe("Tu contraseña fue actualizada.");

    const u = await cuentaSesion();
    expect(u.passwordHash).not.toBe(hashViejo);
    expect(u.debeCambiarClave).toBe(false);
  });

  it("rechaza la contraseña actual incorrecta y no cambia el hash", async () => {
    const antes = (await cuentaSesion()).passwordHash;
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        passwordActual: "esta-no-es",
        password: "clave-nueva-789",
        confirmacion: "clave-nueva-789",
      })
    );

    expect(estadoAccion?.error).toBe("La contraseña actual no es correcta.");
    expect((await cuentaSesion()).passwordHash).toBe(antes);
  });

  it("rechaza una contraseña nueva más corta que 8 caracteres", async () => {
    const antes = (await cuentaSesion()).passwordHash;
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        passwordActual: CLAVE_VIEJA,
        password: "corta12",
        confirmacion: "corta12",
      })
    );

    expect(estadoAccion?.error).toBe(
      "La contraseña debe tener al menos 8 caracteres."
    );
    expect((await cuentaSesion()).passwordHash).toBe(antes);
  });

  it("rechaza una confirmación que no coincide", async () => {
    const antes = (await cuentaSesion()).passwordHash;
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        passwordActual: CLAVE_VIEJA,
        password: "clave-distinta-1",
        confirmacion: "clave-distinta-2",
      })
    );

    expect(estadoAccion?.error).toBe(
      "La confirmación no coincide con la nueva contraseña."
    );
    expect((await cuentaSesion()).passwordHash).toBe(antes);
  });

  it("no afecta a otras cuentas", async () => {
    const ajenaAntes = await prisma.usuario.findUniqueOrThrow({
      where: { email: "otra-cuenta@test.local" },
      select: { passwordHash: true },
    });

    await cambiarClavePropia(
      undefined,
      formulario({
        passwordActual: CLAVE_VIEJA,
        password: "clave-nueva-000",
        confirmacion: "clave-nueva-000",
      })
    );

    const ajenaDespues = await prisma.usuario.findUniqueOrThrow({
      where: { email: "otra-cuenta@test.local" },
      select: { passwordHash: true },
    });
    expect(ajenaDespues.passwordHash).toBe(ajenaAntes.passwordHash);
  });

  it("en cambio forzado no exige la actual, retira la marca y redirige al panel", async () => {
    await prisma.usuario.update({
      where: { id: SESION_ID },
      data: { debeCambiarClave: true },
    });

    await expect(
      cambiarClavePropia(
        undefined,
        formulario({
          password: "clave-propia-123",
          confirmacion: "clave-propia-123",
        })
      )
    ).rejects.toThrow("NEXT_REDIRECT:/operador");

    const u = await cuentaSesion();
    expect(u.debeCambiarClave).toBe(false);
    expect(await compare("clave-propia-123", u.passwordHash)).toBe(true);
  });
});

describe("cambiarClavePropia sin sesión (desde el acceso)", () => {
  beforeEach(() => {
    estado.sesion = null;
  });

  it("cambia la contraseña identificando la cuenta por el correo", async () => {
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        email: EMAIL_PUBLICO,
        passwordActual: CLAVE_PUBLICA,
        password: "clave-nueva-pub-1",
        confirmacion: "clave-nueva-pub-1",
      })
    );

    expect(estadoAccion?.error).toBeUndefined();
    expect(estadoAccion?.ok).toBe(
      "Tu contraseña fue actualizada. Ya puedes iniciar sesión."
    );

    const u = await cuentaPublica();
    expect(await compare("clave-nueva-pub-1", u.passwordHash)).toBe(true);
    expect(u.debeCambiarClave).toBe(false);
  });

  it("responde el mismo mensaje genérico si el correo no existe", async () => {
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        email: "nadie@test.local",
        passwordActual: CLAVE_PUBLICA,
        password: "clave-nueva-pub-1",
        confirmacion: "clave-nueva-pub-1",
      })
    );

    expect(estadoAccion?.error).toBe(GENERICO);
  });

  it("responde el mismo mensaje genérico si la contraseña actual no coincide", async () => {
    const antes = (await cuentaPublica()).passwordHash;
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        email: EMAIL_PUBLICO,
        passwordActual: "esta-no-es",
        password: "clave-nueva-pub-1",
        confirmacion: "clave-nueva-pub-1",
      })
    );

    expect(estadoAccion?.error).toBe(GENERICO);
    expect((await cuentaPublica()).passwordHash).toBe(antes);
  });

  it("sin correo tampoco revela nada", async () => {
    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        passwordActual: CLAVE_PUBLICA,
        password: "clave-nueva-pub-1",
        confirmacion: "clave-nueva-pub-1",
      })
    );

    expect(estadoAccion?.error).toBe(GENERICO);
  });

  it("no cambia nada ni consulta credenciales cuando el límite rechaza", async () => {
    limite.permitido = false;
    limite.mensaje = "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
    const antes = (await cuentaPublica()).passwordHash;

    const estadoAccion = await cambiarClavePropia(
      undefined,
      formulario({
        email: EMAIL_PUBLICO,
        passwordActual: CLAVE_PUBLICA,
        password: "clave-nueva-pub-1",
        confirmacion: "clave-nueva-pub-1",
      })
    );

    expect(estadoAccion?.error).toBe(limite.mensaje);
    expect((await cuentaPublica()).passwordHash).toBe(antes);
  });
});
