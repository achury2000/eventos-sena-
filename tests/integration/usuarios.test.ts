import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { compare, hash } from "bcryptjs";
import {
  crearUsuario,
  eliminarUsuario,
  restablecerClave,
} from "@/lib/actions/admin/usuarios";
import { prisma } from "@/lib/prisma";
import { TipoAfiliacion } from "@/generated/prisma/client";
import { crearAdminPrueba } from "../helpers/factories";

// ---------------------------------------------------------------------------
// Sesión mutable: requireAdmin() devuelve auth() tal cual, así que el id de la
// sesión se cambia entre tests para cubrir auto-eliminación vs. último-admin.
// ---------------------------------------------------------------------------
const sesion = vi.hoisted(() => ({
  user: { id: "sesion-admin-test", rol: "ADMINISTRADOR" },
}));

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

// redirect() y revalidatePath() son no-ops de servidor; en node lanzarían.
// Se reemplazan para poder invocar las Server Actions directamente y observar
// el redirect final como una excepción marcada (el equivalente de NEXT_REDIRECT).
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    const e = new Error(`NEXT_REDIRECT:${path}`);
    throw e;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: async () => sesion,
}));

function formCrearUsuario(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base = {
    rol: "ADMINISTRADOR",
    nombreCompleto: "Admin Nuevo Test",
    documento: "100000000001",
    email: "nuevo-admin@test.local",
    password: "clave-segura-123",
    tipoAfiliacion: TipoAfiliacion.SENA,
    centroFormacion: "Centro Test",
    ...overrides,
  } as const;
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

function formEliminarUsuario(id: string, rol: string): FormData {
  const fd = new FormData();
  fd.set("id", id);
  fd.set("rol", rol);
  return fd;
}

describe("Gestión de usuarios (crearUsary eliminarUsuario)", () => {
  beforeAll(async () => {
    await prisma.$connect();
    // La BD de test es compartida entre archivos y la suite corre en serie
    // (vitest.config.ts fileParallelism: false), así que se restablece el
    // estado completo para que el conteo de admins del test del "último
    // admin" sea determinista. CASCADE limpia todas las tablas con FK.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "usuarios", "eventos" CASCADE'
    );
    // El admin de la sesión existe en BD y es la cuenta con la que se compara
    // la auto-eliminación.
    await prisma.usuario.create({
      data: {
        id: sesion.user.id,
        nombreCompleto: "Admin Sesión",
        documento: "111111111111",
        email: "sesion-admin@test.local",
        passwordHash: "no-usado",
        rol: "ADMINISTRADOR",
        tipoAfiliacion: TipoAfiliacion.SENA,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("crea un Administrador exitosamente y regresa al listado (redirect final)", async () => {
    const fd = formCrearUsuario();

    await expect(crearUsuario(undefined, fd)).rejects.toThrow(
      "NEXT_REDIRECT:/admin/cuentas?rol=ADMINISTRADOR"
    );

    const creado = await prisma.usuario.findUnique({
      where: { email: "nuevo-admin@test.local" },
    });
    expect(creado).not.toBeNull();
    expect(creado?.rol).toBe("ADMINISTRADOR");
    expect(creado?.centroFormacion).toBe("Centro Test");
    // La contraseña va hasheada, nunca en claro.
    expect(creado?.passwordHash).not.toBe("clave-segura-123");
  });

  it("rechaza un Administrador sin centro de formación", async () => {
    const fd = formCrearUsuario({
      centroFormacion: "",
      email: "admin-sin-centro@test.local",
      documento: "100000000004",
    });

    const estado = await crearUsuario(undefined, fd);

    expect(estado?.errors?.centroFormacion).toContain(
      "obligatorio para un Administrador"
    );
    const total = await prisma.usuario.count({
      where: { email: "admin-sin-centro@test.local" },
    });
    expect(total).toBe(0);
  });

  it("crea un Operador sin centro de formación (puede ser externo)", async () => {
    const fd = formCrearUsuario({
      rol: "OPERADOR",
      centroFormacion: "",
      email: "operador-sin-centro@test.local",
      documento: "100000000005",
    });

    await expect(crearUsuario(undefined, fd)).rejects.toThrow(
      "NEXT_REDIRECT:/admin/cuentas?rol=OPERADOR"
    );

    const creado = await prisma.usuario.findUnique({
      where: { email: "operador-sin-centro@test.local" },
    });
    expect(creado).not.toBeNull();
    expect(creado?.rol).toBe("OPERADOR");
    expect(creado?.centroFormacion).toBeNull();
  });

  it("rechaza un correo duplicado (P2002) sin crear la cuenta", async () => {
    const fd = formCrearUsuario({
      email: "sesion-admin@test.local",
      documento: "100000000002",
    });

    const estado = await crearUsuario(undefined, fd);

    expect(estado?.error).toBe("Ya existe una cuenta con ese correo.");
    const total = await prisma.usuario.count({ where: { email: "sesion-admin@test.local" } });
    expect(total).toBe(1);
  });

  it("rechaza un documento duplicado (P2002) sin crear la cuenta", async () => {
    const fd = formCrearUsuario({
      email: "otro-admin@test.local",
      documento: "111111111111",
    });

    const estado = await crearUsuario(undefined, fd);

    expect(estado?.error).toBe("Ya existe una cuenta con ese documento.");
    const total = await prisma.usuario.count({ where: { documento: "111111111111" } });
    expect(total).toBe(1);
  });

  it("rechaza que un Administrador elimine su propia cuenta", async () => {
    const estado = await eliminarUsuario(
      undefined,
      formEliminarUsuario(sesion.user.id, "ADMINISTRADOR")
    );

    expect(estado?.error).toContain("tu propia cuenta");
    const sigue = await prisma.usuario.findUnique({ where: { id: sesion.user.id } });
    expect(sigue).not.toBeNull();
  });

  it("rechaza eliminar el último Administrador activo", async () => {
    // Para que el conteo atómico vea UN solo admin, la sesión queda fuera de
    // la BD y se limpian los admins creados por tests anteriores: el objetivo
    // debe ser la única cuenta ADMINISTRADOR que exista. El TRUNCATE de
    // beforeAll garantiza que no llegan filas residuales de otros archivos.
    await prisma.usuario.deleteMany({ where: { rol: "ADMINISTRADOR" } });
    sesion.user.id = "sesion-fuera-de-bd";
    const objetivo = await crearAdminPrueba(prisma, "ultimo-admin");

    const estado = await eliminarUsuario(
      undefined,
      formEliminarUsuario(objetivo.id, "ADMINISTRADOR")
    );

    expect(estado?.error).toContain("última cuenta de Administrador");
    const sigue = await prisma.usuario.findUnique({ where: { id: objetivo.id } });
    expect(sigue).not.toBeNull();

    // Restaura la sesión dentro de la BD para los tests siguientes.
    await prisma.usuario.delete({ where: { id: objetivo.id } });
    sesion.user.id = "sesion-admin-test";
    await prisma.usuario.create({
      data: {
        id: sesion.user.id,
        nombreCompleto: "Admin Sesión",
        documento: "111111111111",
        email: "sesion-admin@test.local",
        passwordHash: "no-usado",
        rol: "ADMINISTRADOR",
        tipoAfiliacion: TipoAfiliacion.SENA,
      },
    });
  });

  it("rechaza de la pestaña Operadores un id de Administrador (no elimina nada)", async () => {
    const admin = await crearAdminPrueba(prisma, "admin-de-otra-pestana");

    const estado = await eliminarUsuario(
      undefined,
      formEliminarUsuario(admin.id, "OPERADOR")
    );

    // Un id de rol ADMINISTRADOR nunca se procesa desde la pestaña Operadores.
    expect(estado?.error).toBe("La cuenta no pertenece a esta sección.");
    const sigue = await prisma.usuario.findUnique({ where: { id: admin.id } });
    expect(sigue).not.toBeNull();
  });

  it("elimina un Operador exitosamente cuando el rol coincide (bandera de seguridad)", async () => {
    const operador = await prisma.usuario.create({
      data: {
        nombreCompleto: "Operador a eliminar",
        documento: "100000000003",
        email: "operador-eliminar@test.local",
        passwordHash: "no-usado",
        rol: "OPERADOR",
        tipoAfiliacion: TipoAfiliacion.SENA,
      },
      select: { id: true },
    });

    await expect(
      eliminarUsuario(undefined, formEliminarUsuario(operador.id, "OPERADOR"))
    ).rejects.toThrow("NEXT_REDIRECT:/admin/cuentas?rol=OPERADOR");

    const sigue = await prisma.usuario.findUnique({ where: { id: operador.id } });
    expect(sigue).toBeNull();
  });
});

describe("Restablecer contraseña (restablecerClave)", () => {
  let operadorId = "";
  const CLAVE_ANTERIOR = "clave-anterior-99";

  beforeAll(async () => {
    await prisma.$connect();
    // La suite anterior desconectó el cliente en su afterAll; se reconecta y
    // se crea el operador objetivo con una contraseña conocida.
    operadorId = (
      await prisma.usuario.create({
        data: {
          nombreCompleto: "Operador con clave olvidada",
          documento: "100000000010",
          email: "operador-clave@test.local",
          passwordHash: await hash(CLAVE_ANTERIOR, 10),
          rol: "OPERADOR",
          tipoAfiliacion: TipoAfiliacion.SENA,
        },
        select: { id: true },
      })
    ).id;
    // Garantiza que la sesión es Administrador existente (estado tras la
    // suite anterior).
    await prisma.usuario.upsert({
      where: { id: sesion.user.id },
      create: {
        id: sesion.user.id,
        nombreCompleto: "Admin Sesión",
        documento: "111111111111",
        email: "sesion-admin@test.local",
        passwordHash: "no-usado",
        rol: "ADMINISTRADOR",
        tipoAfiliacion: TipoAfiliacion.SENA,
      },
      update: {},
    });
  });

  afterAll(async () => {
    sesion.user.rol = "ADMINISTRADOR";
    await prisma.$disconnect();
  });

  function formRestablecer(id: string): FormData {
    const fd = new FormData();
    fd.set("id", id);
    return fd;
  }

  it("rechaza a cuentas que no son Administrador", async () => {
    sesion.user.rol = "OPERADOR";
    await expect(
      restablecerClave(undefined, formRestablecer(operadorId))
    ).rejects.toThrow("NEXT_REDIRECT:/");
    sesion.user.rol = "ADMINISTRADOR";

    // Nada cambió: la contraseña anterior sigue siendo la del hash.
    const u = await prisma.usuario.findUniqueOrThrow({
      where: { id: operadorId },
      select: { passwordHash: true },
    });
    expect(await compare(CLAVE_ANTERIOR, u.passwordHash)).toBe(true);
  });

  it("rechaza un id de usuario inexistente", async () => {
    const estado = await restablecerClave(
      undefined,
      formRestablecer("id-que-no-existe")
    );

    expect(estado?.error).toBe("El usuario no existe.");
    expect(estado?.temporal).toBeUndefined();
  });

  it("restablece con una temporal de un solo uso y activa el cambio forzado", async () => {
    const estado = await restablecerClave(
      undefined,
      formRestablecer(operadorId)
    );

    expect(estado?.error).toBeUndefined();
    expect(estado?.temporal).toBeDefined();
    const temporal = estado?.temporal as string;

    // 14 caracteres, sin ambiguos (0/O/1/l/I) y sin caracteres raros.
    expect(temporal).toHaveLength(14);
    expect(temporal).toMatch(/^[A-HJ-NP-Za-km-no-z2-9]+$/);

    const u = await prisma.usuario.findUniqueOrThrow({
      where: { id: operadorId },
      select: { passwordHash: true, debeCambiarClave: true },
    });
    // La marca de cambio forzado queda activa y el hash NO es la temporal
    // en claro.
    expect(u.debeCambiarClave).toBe(true);
    expect(u.passwordHash).not.toBe(temporal);
    // La temporal sirve para entrar; la anterior ya no.
    expect(await compare(temporal, u.passwordHash)).toBe(true);
    expect(await compare(CLAVE_ANTERIOR, u.passwordHash)).toBe(false);
  });

  it("genera una temporal distinta en cada restablecimiento (la anterior deja de servir)", async () => {
    const primera = await restablecerClave(
      undefined,
      formRestablecer(operadorId)
    );
    const segunda = await restablecerClave(
      undefined,
      formRestablecer(operadorId)
    );

    expect(segunda?.temporal).toBeDefined();
    expect(segunda?.temporal).not.toBe(primera?.temporal);

    const u = await prisma.usuario.findUniqueOrThrow({
      where: { id: operadorId },
      select: { passwordHash: true },
    });
    expect(await compare(segunda?.temporal as string, u.passwordHash)).toBe(
      true
    );
    // La primera temporal ya no abre la cuenta: se entregó y murió con ella.
    expect(await compare(primera?.temporal as string, u.passwordHash)).toBe(
      false
    );
  });
});