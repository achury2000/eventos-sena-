import type { Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { testDatabaseUrl } from "../helpers/db";

// Credenciales sembradas por tests/e2e/seed.ts (las mismas que en desarrollo
// para que el equipo no tenga que memorizar contraseñas distintas).
export const EMAIL_ADMIN = "admin@sena.gov.co";
export const EMAIL_OPERADOR = "operador@sena.gov.co";
export const ADMIN = { email: EMAIL_ADMIN, password: "admin123" };
export const OPERADOR = { email: EMAIL_OPERADOR, password: "operador123" };

export const NOMBRE_EVENTO = "Encuentro E2E";

// Documentos de los asistentes de prueba (6–12 dígitos, patrón permitido).
export const DOC_TITULAR = "1111111111";
export const DOC_ACOMPANANTE = "1212121212";
export const DOC_AUTO = "2222222222";
export const DOC_MANUAL = "3333333333";

export function prismaE2E(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl() }),
  });
}

export async function loginComo(
  page: Page,
  credencial: { email: string; password: string }
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(credencial.email);
  await page.getByLabel("Contraseña").fill(credencial.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(/\/admin\/?$|\/operador\/?$/);
}