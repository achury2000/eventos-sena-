import { hash } from "bcryptjs";
import { expect, test } from "@playwright/test";
import { RolUsuario, TipoAfiliacion } from "../../src/generated/prisma/client";
import { ADMIN, OPERADOR, loginComo, prismaE2E } from "./soporte";

// Cubre la gestión de claves sin correo (change gestion-de-claves):
//  - /cambiar-clave es PÚBLICA (ya no exige sesión) y se enlaza bajo el botón
//    del inicio de sesión.
//  - Cambio desde el acceso: correo + contraseña actual, sin sesión.
//  - Restablecimiento por el Administrador: temporal visible UNA vez,
//    cambio forzado al iniciar con ella y anterior que deja de servir.
//  - Los paneles ya NO enlazan "Cambiar contraseña".
//
// Usa cuentas PROPIAS (no el operador sembrado) porque el resto de la suite
// depende de las credenciales del seed; se borran en afterAll para no romper
// zz-estado-vacio.spec, que espera cero Operadores al final.

const OPERADOR_ACCESO = "operador-acceso-e2e@sena.gov.co";
const OPERADOR_RESET = "operador-reset-e2e@sena.gov.co";
const CLAVE_INICIAL = "clave-inicial-1";

test.describe("Gestión de claves", () => {
  test.beforeAll(async () => {
    const prisma = prismaE2E();
    for (const email of [OPERADOR_ACCESO, OPERADOR_RESET]) {
      await prisma.usuario.deleteMany({ where: { email } });
    }
    await prisma.usuario.create({
      data: {
        nombreCompleto: "Operador Acceso E2E",
        documento: "900000001",
        email: OPERADOR_ACCESO,
        passwordHash: await hash(CLAVE_INICIAL, 10),
        rol: RolUsuario.OPERADOR,
        tipoAfiliacion: TipoAfiliacion.SENA,
      },
    });
    await prisma.usuario.create({
      data: {
        nombreCompleto: "Operador Reset E2E",
        documento: "900000002",
        email: OPERADOR_RESET,
        passwordHash: await hash(CLAVE_INICIAL, 10),
        rol: RolUsuario.OPERADOR,
        tipoAfiliacion: TipoAfiliacion.SENA,
      },
    });
    await prisma.$disconnect();
  });

  test.afterAll(async () => {
    const prisma = prismaE2E();
    await prisma.usuario.deleteMany({
      where: { email: { in: [OPERADOR_ACCESO, OPERADOR_RESET] } },
    });
    await prisma.$disconnect();
  });

  test("sin sesión, /cambiar-clave muestra el formulario público", async ({
    page,
  }) => {
    await page.goto("/cambiar-clave");
    await expect(page).toHaveURL(/\/cambiar-clave/);
    await expect(
      page.getByRole("heading", { name: "Cambiar contraseña" })
    ).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Contraseña actual")).toBeVisible();
  });

  test("el enlace 'Cambiar contraseña' está bajo el botón del inicio de sesión", async ({
    page,
  }) => {
    await page.goto("/login");
    const enlace = page.getByRole("link", { name: "Cambiar contraseña" });
    await expect(enlace).toBeVisible();
    await enlace.click();
    await page.waitForURL(/\/cambiar-clave/);
    await expect(page.getByLabel("Contraseña actual")).toBeVisible();
  });

  test("los paneles ya no enlazan el cambio de contraseña", async ({ page }) => {
    await loginComo(page, OPERADOR);
    await expect(
      page.getByRole("link", { name: "Cambiar contraseña" })
    ).toHaveCount(0);
  });

  test("cambio desde el acceso: sin sesión actualiza la contraseña y la nueva sirve", async ({
    page,
  }) => {
    await page.goto("/cambiar-clave");

    await page.getByLabel("Correo electrónico").fill(OPERADOR_ACCESO);
    await page.getByLabel("Contraseña actual").fill(CLAVE_INICIAL);
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("clave-nueva-e2e-1");
    await page
      .getByLabel("Confirmar nueva contraseña")
      .fill("clave-nueva-e2e-1");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    await expect(page.getByText("Tu contraseña fue actualizada.")).toBeVisible();

    // La contraseña nueva abre sesión (el cambio no dejó sesión abierta).
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(OPERADOR_ACCESO);
    await page.getByLabel("Contraseña").fill("clave-nueva-e2e-1");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/operador\/?$/);
  });

  test("credenciales genéricas desde el acceso no revelan si el correo existe", async ({
    page,
  }) => {
    await page.goto("/cambiar-clave");

    await page.getByLabel("Correo electrónico").fill("nadie-e2e@sena.gov.co");
    await page.getByLabel("Contraseña actual").fill("lo-que-sea-1");
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("clave-nueva-e2e-1");
    await page
      .getByLabel("Confirmar nueva contraseña")
      .fill("clave-nueva-e2e-1");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    await expect(
      page.getByText("El correo o la contraseña actual no son correctos.")
    ).toBeVisible();
  });

  test("restablecimiento del Administrador y cambio forzado al entrar con la temporal", async ({
    page,
  }) => {
    await loginComo(page, ADMIN);
    // El panel de Administración ya no enlaza el cambio de contraseña.
    await expect(
      page.getByRole("link", { name: "Cambiar contraseña" })
    ).toHaveCount(0);
    page.on("dialog", (dialogo) => dialogo.accept());

    await page.goto("/admin/cuentas?rol=OPERADOR");
    const fila = page.locator("tr", { hasText: OPERADOR_RESET });
    await expect(fila).toBeVisible();
    await fila.getByRole("button", { name: "Restablecer" }).click();

    // La temporal aparece UNA sola vez en la fila, con el aviso de entrega.
    await expect(fila.getByText(/única vez/i).first()).toBeVisible();
    const temporal = (await fila.locator("code").textContent())?.trim() ?? "";
    expect(temporal).toHaveLength(14);

    // El Administrador cierra su sesión; el operador entra con la temporal.
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(/\/login/);
    await page.getByLabel("Correo electrónico").fill(OPERADOR_RESET);
    await page.getByLabel("Contraseña").fill(temporal);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    // Cambio forzado: cae en /cambiar-clave y no se le pide la actual ni el
    // correo (la cuenta es la de la sesión recién abierta).
    await page.waitForURL(/\/cambiar-clave/);
    await expect(page.getByLabel("Contraseña actual")).toHaveCount(0);
    await expect(page.getByLabel("Correo electrónico")).toHaveCount(0);
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("clave-propia-e2e-1");
    await page
      .getByLabel("Confirmar nueva contraseña")
      .fill("clave-propia-e2e-1");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    // Queda en su panel con la sesión abierta.
    await page.waitForURL(/\/operador\/?$/);

    // La temporal ya no sirve: se entregó y murió con el cambio.
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(/\/login/);
    await page.getByLabel("Correo electrónico").fill(OPERADOR_RESET);
    await page.getByLabel("Contraseña").fill(temporal);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText("Credenciales inválidas.")).toBeVisible();
  });
});
