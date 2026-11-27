import { hash } from "bcryptjs";
import { expect, test } from "@playwright/test";
import { RolUsuario, TipoAfiliacion } from "../../src/generated/prisma/client";
import { ADMIN, loginComo, prismaE2E } from "./soporte";

// Cubre la sección Cuentas (2026-10-12): listado con filtro por rol, creación
// de Administrador punta a punta, rechazo de correo duplicado, ocultamiento del
// botón "Eliminar" en la propia cuenta, eliminación de un Operador y redirect
// de la URL vieja /admin/operadores.
//
// La suite comparte la base de prueba con una sola worker, así que ninguna
// prueba toca el operador sembrado (lo usan login.spec/operador.spec que
// corren después). El estado vacío de Operadores se verifica en
// zz-estado-vacio.spec.ts, que corre al final.
test.describe("Sección Cuentas", () => {
  test("muestra la propia cuenta sin botón Eliminar y con filtro por rol", async ({
    page,
  }) => {
    await loginComo(page, ADMIN);

    // Nav del panel actualizada a "Usuarios" (el dashboard de /admin también
    // enlaza a Usuarios, por eso se acota a la navegación).
    await page.getByRole("navigation").getByRole("link", { name: "Usuarios" }).click();
    await expect(page).toHaveURL(/\/admin\/cuentas/);
    await expect(
      page.getByRole("link", { name: "Administradores" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Operadores" })).toBeVisible();

    // En la pestaña Administradores solo está el admin del seed (la sesión):
    // su fila se marca "(tu cuenta)" y no ofrece botón Eliminar.
    await page.goto("/admin/cuentas?rol=ADMINISTRADOR");
    await expect(page.getByText(ADMIN.email)).toBeVisible();
    await expect(page.getByText("(tu cuenta)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  });

  test("crea un Administrador de punta a punta y queda visible en su pestaña", async ({
    page,
  }) => {
    await loginComo(page, ADMIN);
    await page.goto("/admin/cuentas/nuevo?rol=ADMINISTRADOR");
    await expect(
      page.getByRole("heading", { name: "Crear Usuario" })
    ).toBeVisible();

    await page.getByLabel("Rol").selectOption("ADMINISTRADOR");
    await page.getByLabel("Nombre completo").fill("Administrador Nuevo E2E");
    await page.getByLabel("Documento").fill("76543210");
    await page.getByLabel("Correo").fill("admin-nuevo-e2e@sena.gov.co");
    await page
      .getByLabel("Contraseña (la asigna el Administrador)")
      .fill("clave-segura-1");
    await page
      .getByLabel("Centro de formación")
      .fill("Centro de Innovación E2E");

    await page.getByRole("button", { name: "Crear Usuario" }).click();

    // Regresa al listado en la pestaña del rol creado (spec: "regresa al
    // listado mostrando el nuevo usuario").
    await page.waitForURL(/\/admin\/cuentas\?rol=ADMINISTRADOR/);
    await expect(page.getByText("Administrador Nuevo E2E")).toBeVisible();
    await expect(page.getByText("admin-nuevo-e2e@sena.gov.co")).toBeVisible();
  });

  test("rechaza un correo ya registrado al crear un Administrador", async ({
    page,
  }) => {
    await loginComo(page, ADMIN);
    await page.goto("/admin/cuentas/nuevo?rol=ADMINISTRADOR");

    await page.getByLabel("Nombre completo").fill("Administrador Duplicado E2E");
    await page.getByLabel("Documento").fill("76543211");
    // El correo del admin del seed ya está registrado.
    await page.getByLabel("Correo").fill(ADMIN.email);
    await page
      .getByLabel("Contraseña (la asigna el Administrador)")
      .fill("clave-segura-1");
    await page
      .getByLabel("Centro de formación")
      .fill("Centro de Innovación E2E");

    await page.getByRole("button", { name: "Crear Usuario" }).click();

    // Se queda en el formulario (sin redirect) con el mensaje de error.
    await expect(page).toHaveURL(/\/admin\/cuentas\/nuevo/);
    await expect(
      page.getByText("Ya existe una cuenta con ese correo.")
    ).toBeVisible();
  });

  test("elimina un Operador creado para la prueba y deja de mostrarlo", async ({
    page,
  }) => {
    await loginComo(page, ADMIN);
    // El ActionForm confirma con un dialog nativo que hay que aceptar.
    page.on("dialog", (d) => d.accept());

    // Opera con un operador propio para no romper login.spec/operador.spec,
    // que dependen del operador sembrado.
    const prisma = prismaE2E();
    await prisma.usuario.create({
      data: {
        nombreCompleto: "Operador Temporal E2E",
        documento: "88888888",
        email: "temporal-eliminar-e2e@sena.gov.co",
        passwordHash: await hash("temporal123", 10),
        rol: RolUsuario.OPERADOR,
        tipoAfiliacion: TipoAfiliacion.SENA,
        centroFormacion: "Centro de Innovación E2E",
      },
      select: { id: true },
    });
    await prisma.$disconnect();

    await page.goto("/admin/cuentas?rol=OPERADOR");
    const fila = page.locator("tr", {
      hasText: "temporal-eliminar-e2e@sena.gov.co",
    });
    await expect(fila).toBeVisible();
    await fila.getByRole("button", { name: "Eliminar" }).click();

    await page.waitForURL(/\/admin\/cuentas\?rol=OPERADOR/);
    await expect(
      page.getByText("temporal-eliminar-e2e@sena.gov.co")
    ).toHaveCount(0);
  });

  test("redirige la URL vieja /admin/operadores a la sección Cuentas", async ({
    page,
  }) => {
    await loginComo(page, ADMIN);
    await page.goto("/admin/operadores");
    await page.waitForURL(/\/admin\/cuentas\?rol=OPERADOR/);
    await expect(
      page.getByRole("link", { name: "Operadores" })
    ).toBeVisible();
  });
});