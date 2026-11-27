import { expect, test } from "@playwright/test";
import {
  ADMIN,
  DOC_ACOMPANANTE,
  DOC_TITULAR,
  NOMBRE_EVENTO,
  loginComo,
  prismaE2E,
} from "./soporte";

test("inscripción pública completa con acompañante y firma; el Admin la ve", async ({
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

  await page.goto(`/inscripcion/${eventoId}`);

  // Titular
  await page.getByLabel("Nombre completo").fill("Titular E2E");
  await page.getByLabel("Documento").fill(DOC_TITULAR);
  await page.getByLabel("Centro de formación").fill("Centro de Innovación E2E");
  await page.getByLabel("Correo (opcional)").fill("titular-e2e@sena.gov.co");

  // Acompañante (solo nombre y documento: el centro de formación es del
  // titular — CONTEXT.md §3 paso 4; el servidor guarda null si no llega).
  await page.getByRole("button", { name: "Agregar acompañante" }).click();
  await page.getByLabel("Nombre completo").nth(1).fill("Acompañante E2E");
  await page.getByLabel("Documento").nth(1).fill(DOC_ACOMPANANTE);

  // Firma en el canvas: dibuja un trazo y suelta el cursor dentro del lienzo
  // para que react-signature-canvas dispare onEnd y habilite el botón. El
  // scroll es necesario: al agregar un acompañante el canvas queda fuera del
  // viewport y page.mouse no alcanza las coordenadas de boundingBox.
  const lienzo = page.locator("canvas").first();
  await lienzo.scrollIntoViewIfNeeded();
  const caja = await lienzo.boundingBox();
  expect(caja).not.toBeNull();
  const x = caja!.x + caja!.width / 2;
  const y = caja!.y + caja!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y + 20, { steps: 6 });
  await page.mouse.move(x + 40, y - 20, { steps: 6 });
  await page.mouse.up();

  await page.getByRole("checkbox").check();
  // El botón solo se habilita cuando el canvas capturó la firma (onEnd).
  await expect(
    page.getByRole("button", { name: "Inscribirme" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Inscribirme" }).click();

  await expect(page.getByText("¡Inscripción completada!")).toBeVisible();

  // Persistencia en la base: titular + acompañante + firma almacenada.
  const prisma2 = prismaE2E();
  const inscripcion = await prisma2.inscripcion.findFirst({
    where: { asistentes: { some: { documento: DOC_TITULAR } } },
    select: {
      id: true,
      firmaUrl: true,
      asistentes: {
        where: { esTitular: false },
        select: { documento: true },
      },
    },
  });
  await prisma2.$disconnect();

  expect(inscripcion).not.toBeNull();
  expect(inscripcion!.firmaUrl).toBeTruthy();
  expect(inscripcion!.asistentes).toHaveLength(1);
  expect(inscripcion!.asistentes[0].documento).toBe(DOC_ACOMPANANTE);

  // La inscripción aparece para el Admin en el evento.
  await loginComo(page, ADMIN);
  await page.goto(`/admin/eventos/${eventoId}/inscripciones`);
  const fila = page.locator("tbody tr", { hasText: DOC_TITULAR });
  await expect(fila).toBeVisible();
  const acompanantes = fila.getByRole("cell").nth(1);
  await expect(acompanantes).toContainText("Acompañante E2E");
  await expect(acompanantes).toContainText(DOC_ACOMPANANTE);
  await expect(fila.getByRole("cell").nth(2)).toHaveText("2");

  // El visor sirve la imagen desde la propia aplicación: el navegador no
  // necesita alcanzar el almacenamiento
  // (openspec/changes/visor-firma-servida-por-la-app).
  const rutaVisor = `/api/admin/eventos/${eventoId}/inscripciones/${inscripcion!.id}/firma`;
  await expect(fila.locator("a", { hasText: "Ver firma" })).toHaveAttribute(
    "href",
    rutaVisor
  );
  const respuesta = await page.request.get(rutaVisor);
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()["content-type"]).toContain("image/png");
  expect((await respuesta.body()).length).toBeGreaterThan(0);

  // El buscador encuentra la inscripción por el documento del acompañante,
  // no solo por el titular.
  await page.getByRole("searchbox").fill(DOC_ACOMPANANTE);
  await page.getByRole("button", { name: "Buscar" }).click();
  const filaBuscada = page.locator("tbody tr", { hasText: DOC_TITULAR });
  await expect(filaBuscada).toBeVisible();
  await expect(filaBuscada.getByRole("cell").nth(1)).toContainText(
    "Acompañante E2E"
  );
});
