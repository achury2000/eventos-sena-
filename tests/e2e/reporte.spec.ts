import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { ADMIN, NOMBRE_EVENTO, loginComo, prismaE2E } from "./soporte";

test("el reporte ofrece XLSX y PDF con los mismos filtros", async ({
  page,
}) => {
  const prisma = prismaE2E();
  const evento = await prisma.evento.findFirst({
    where: { nombre: NOMBRE_EVENTO },
    select: { id: true },
  });
  await prisma.$disconnect();

  expect(evento).not.toBeNull();
  const eventoId = evento!.id;

  await loginComo(page, ADMIN);
  await page.goto(`/admin/eventos/${eventoId}/reporte`);

  const xlsxLink = page.locator(`a[href*="/reporte/exportar"]`).first();
  const pdfLink = page.locator(`a[href*="/reporte/exportar/pdf"]`);
  await expect(xlsxLink).toContainText("Exportar XLSX");
  await expect(pdfLink).toContainText("Exportar PDF");
  await expect(pdfLink).toHaveAttribute(
    "href",
    `/api/admin/eventos/${eventoId}/reporte/exportar/pdf`
  );

  // Los filtros de la página se reflejan en ambos enlaces de exportación.
  await page.getByLabel("Persona").selectOption("titular");
  await expect(page).toHaveURL(/rol=titular/);
  await expect(pdfLink).toHaveAttribute(
    "href",
    `/api/admin/eventos/${eventoId}/reporte/exportar/pdf?rol=titular`
  );
  await expect(xlsxLink).toHaveAttribute(
    "href",
    `/api/admin/eventos/${eventoId}/reporte/exportar?rol=titular`
  );

  const descarga = page.waitForEvent("download");
  await pdfLink.click();
  const archivoDescargado = await descarga;

  expect(archivoDescargado.suggestedFilename()).toBe("reporte-encuentro-e2e.pdf");
  const ruta = await archivoDescargado.path();
  expect(ruta).not.toBeNull();
  const contenido = await readFile(ruta!);
  expect(contenido.subarray(0, 5).toString()).toBe("%PDF-");
  expect(contenido.length).toBeGreaterThan(1000);
});
