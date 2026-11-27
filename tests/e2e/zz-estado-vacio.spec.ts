import { expect, test } from "@playwright/test";
import { RolUsuario } from "../../src/generated/prisma/client";
import { ADMIN, loginComo, prismaE2E } from "./soporte";

// Verifica el escenario del spec "Sin Operadores registrados": al no quedar
// cuentas OPERADOR, la pestaña muestra el estado vacío con la invitación a
// crear el primero.
//
// Corre al final de la suite (orden alfabético zz > operador) porque borra a
// los Operadores de la base compartida; las specs que usan el operador
// sembrado (login.spec, operador.spec) ya ejecutaron.
test.describe("Estado vacío de la sección Cuentas", () => {
  test("muestra el estado vacío cuando no quedan Operadores", async ({
    page,
  }) => {
    await loginComo(page, ADMIN);

    const prisma = prismaE2E();
    await prisma.usuario.deleteMany({ where: { rol: RolUsuario.OPERADOR } });
    await prisma.$disconnect();

    await page.goto("/admin/cuentas?rol=OPERADOR");
    await expect(
      page.getByText("Aún no hay Operadores. Crea el primero.")
    ).toBeVisible();
  });
});