import { expect, test } from "@playwright/test";
import {
  DOC_AUTO,
  NOMBRE_EVENTO,
  OPERADOR,
  loginComo,
  prismaE2E,
} from "./soporte";

test("el autoregistro cuenta la asistencia y el panel del Operador lo refleja", async ({
  page,
}) => {
  // Estado inicial calculado al vuelo para no depender del orden de los specs.
  const prisma = prismaE2E();
  const evento = await prisma.evento.findFirst({
    where: { nombre: NOMBRE_EVENTO },
    select: { id: true },
  });
  expect(evento).not.toBeNull();
  const checkpoint = await prisma.checkpoint.findFirst({
    where: { eventoId: evento!.id, activo: true },
    select: { id: true, codigoQr: true },
  });
  const cuentaInicial = checkpoint
    ? await prisma.registroControl.count({
        where: { checkpointId: checkpoint.id },
      })
    : -1;
  const totalAsistentes = await prisma.asistente.count({
    where: { eventoId: evento!.id },
  });
  await prisma.$disconnect();

  expect(checkpoint).not.toBeNull();
  expect(totalAsistentes).toBeGreaterThan(0);
  const codigoQr = checkpoint!.codigoQr;

  await page.goto(`/checkpoint/${codigoQr}`);
  await page.getByLabel("Documento de identidad").fill(DOC_AUTO);
  await page.getByRole("button", { name: "Registrar asistencia" }).click();
  await expect(page.getByText("Registro exitoso.")).toBeVisible();

  // En la base queda exactamente un registro para ese asistente+checkpoint.
  const prisma2 = prismaE2E();
  const conteo = await prisma2.registroControl.count({
    where: { checkpointId: checkpoint!.id, asistente: { documento: DOC_AUTO } },
  });
  await prisma2.$disconnect();
  expect(conteo).toBe(1);

  // El tablero del Operador refleja el incremento en la vista Checkpoints.
  await loginComo(page, OPERADOR);
  await page.getByRole("button", { name: /^Checkpoints activos/ }).click();
  await expect(
    page.getByText(
      new RegExp(`${cuentaInicial + 1}/${totalAsistentes} registrados`)
    )
  ).toBeVisible();
});
