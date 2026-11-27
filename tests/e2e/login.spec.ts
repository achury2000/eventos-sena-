import { expect, test } from "@playwright/test";
import { ADMIN, OPERADOR } from "./soporte";

test.describe("inicio de sesión", () => {
  test("el administrador entra a su panel", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(ADMIN.email);
    await page.getByLabel("Contraseña").fill(ADMIN.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test("el operador entra a su panel", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(OPERADOR.email);
    await page.getByLabel("Contraseña").fill(OPERADOR.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/operador\/?$/);
  });

  test("credenciales inválidas muestran error y no ingresan", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill("nadie@sena.gov.co");
    await page.getByLabel("Contraseña").fill("clave-equivocada");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText("Credenciales inválidas.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});