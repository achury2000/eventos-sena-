import { expect, test, type Page } from "@playwright/test";
import {
  ADMIN,
  DOC_AUTO,
  DOC_MANUAL,
  NOMBRE_EVENTO,
  OPERADOR,
  loginComo,
  prismaE2E,
} from "./soporte";
import {
  EstadoEvento,
  MetodoRegistro,
  TipoCheckpoint,
} from "../../src/generated/prisma/client";
import { crearAsistenteInscrito, crearHabitacionPrueba } from "../helpers/factories";

async function abrirCheckpoints(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Checkpoints activos/ }).click();
}

// Escenario de la habitación 601: dos ocupantes con registro (uno manual) y
// un inscrito del evento que no pertenece al cuarto. El evento de la semilla
// tiene dos asistentes, así que el total vigente queda en 5 para comprobar
// que la habitación usa su propia base de 2.
interface EscenarioHabitacion {
  habitacionId: string;
  checkpointId: string;
  codigoQr: string;
  documentoNoAsignado: string;
  inscripcionIds: string[];
}

const DOC_601_UNO = "4444444441";
const DOC_601_DOS = "4444444442";
const DOC_601_FUERA = "4444444443";

async function crearEscenarioHabitacion(): Promise<EscenarioHabitacion> {
  const prisma = prismaE2E();
  const evento = await prisma.evento.findFirst({
    where: { nombre: NOMBRE_EVENTO },
    select: { id: true },
  });
  expect(evento).not.toBeNull();

  const ocupanteUno = await crearAsistenteInscrito(prisma, {
    eventoId: evento!.id,
    documento: DOC_601_UNO,
  });
  const ocupanteDos = await crearAsistenteInscrito(prisma, {
    eventoId: evento!.id,
    documento: DOC_601_DOS,
  });
  const noAsignado = await crearAsistenteInscrito(prisma, {
    eventoId: evento!.id,
    documento: DOC_601_FUERA,
  });

  await prisma.asistente.update({
    where: { id: ocupanteUno.id },
    data: { nombreCompleto: "Ocupante 601 Uno" },
  });
  await prisma.asistente.update({
    where: { id: ocupanteDos.id },
    data: { nombreCompleto: "Ocupante 601 Dos" },
  });
  await prisma.asistente.update({
    where: { id: noAsignado.id },
    data: { nombreCompleto: "Fuera 601" },
  });

  const habitacion = await crearHabitacionPrueba(prisma, {
    eventoId: evento!.id,
    identificador: "601",
    capacidad: 2,
    asistenteIds: [ocupanteUno.id, ocupanteDos.id],
  });

  await prisma.registroControl.createMany({
    data: [
      {
        asistenteId: ocupanteUno.id,
        checkpointId: habitacion.checkpointId,
        metodo: MetodoRegistro.AUTOREGISTRO,
      },
      {
        asistenteId: ocupanteDos.id,
        checkpointId: habitacion.checkpointId,
        metodo: MetodoRegistro.MANUAL,
      },
    ],
  });

  const asistentes = await prisma.asistente.findMany({
    where: { id: { in: [ocupanteUno.id, ocupanteDos.id, noAsignado.id] } },
    select: { inscripcionId: true },
  });
  await prisma.$disconnect();

  return {
    habitacionId: habitacion.id,
    checkpointId: habitacion.checkpointId,
    codigoQr: habitacion.codigoQr,
    documentoNoAsignado: DOC_601_FUERA,
    inscripcionIds: asistentes.map((asistente) => asistente.inscripcionId),
  };
}

async function limpiarEscenarioHabitacion(
  escenario: EscenarioHabitacion
): Promise<void> {
  const prisma = prismaE2E();
  await prisma.registroControl.deleteMany({
    where: { checkpointId: escenario.checkpointId },
  });
  await prisma.habitacion.delete({ where: { id: escenario.habitacionId } });
  await prisma.inscripcion.deleteMany({
    where: { id: { in: escenario.inscripcionIds } },
  });
  await prisma.$disconnect();
}

test("cada evento abre en Cobertura y Asistentes muestra nombres sin documento", async ({
  page,
}) => {
  await loginComo(page, OPERADOR);

  const cobertura = page.getByRole("button", { name: /^Cobertura/ });
  await expect(cobertura).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Cobertura de asistencia").first()).toBeVisible();

  const registros = page.getByRole("button", { name: /^Registros/ });
  await expect(registros).toBeVisible();
  await expect(page.getByText(/Registros totales:/)).toHaveCount(0);

  await page.getByRole("button", { name: /^Asistentes/ }).click();
  await expect(
    page.getByRole("button", { name: /^Asistentes/ })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("columnheader", { name: "Nombre", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Asistente de Prueba/ })
  ).toHaveCount(2);
  await expect(page.getByText(DOC_AUTO, { exact: true })).toHaveCount(0);
  await expect(page.getByText(DOC_MANUAL, { exact: true })).toHaveCount(0);
});

test("Registros muestra el detalle por checkpoint", async ({ page }) => {
  await loginComo(page, OPERADOR);

  const registros = page.getByRole("button", { name: /^Registros/ });
  await expect(registros).toHaveAttribute("aria-pressed", "false");
  await registros.click();
  await expect(registros).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("columnheader", { name: "Registrados" })
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Autoregistro" })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Control de ingreso/ })
  ).toBeVisible();
});

test("cada evento recuerda su propia vista", async ({ page }) => {
  const prisma = prismaE2E();
  const operador = await prisma.usuario.findUnique({
    where: { email: OPERADOR.email },
    select: { id: true },
  });
  const admin = await prisma.usuario.findUnique({
    where: { email: ADMIN.email },
    select: { id: true },
  });
  expect(operador).not.toBeNull();
  expect(admin).not.toBeNull();

  const ahora = new Date();
  const sumarDias = (dias: number) =>
    new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000);
  const segundo = await prisma.evento.create({
    data: {
      nombre: "Segundo evento E2E",
      lugar: "Sala Alterna",
      fechaInicio: sumarDias(4),
      fechaFin: sumarDias(5),
      inscripcionApertura: sumarDias(-1),
      inscripcionCierre: sumarDias(3),
      cupoMaximo: 5,
      estado: EstadoEvento.INSCRIPCIONES_ABIERTAS,
      incluyeHotel: false,
      creadoPorId: admin!.id,
    },
    select: { id: true },
  });
  await prisma.eventoOperador.create({
    data: { eventoId: segundo.id, operadorId: operador!.id },
  });
  await prisma.checkpoint.create({
    data: {
      eventoId: segundo.id,
      nombre: "Control alterno E2E",
      tipo: "OTRO",
      activo: true,
    },
  });
  await prisma.$disconnect();

  try {
    await loginComo(page, OPERADOR);

    const primero = page.locator("section", {
      has: page.getByRole("heading", { name: NOMBRE_EVENTO, exact: true }),
    });
    const segundoEvento = page.locator("section", {
      has: page.getByRole("heading", {
        name: "Segundo evento E2E",
        exact: true,
      }),
    });

    await expect(primero).toBeVisible();
    await expect(segundoEvento).toBeVisible();

    await primero.getByRole("button", { name: /^Asistentes/ }).click();
    await segundoEvento.getByRole("button", { name: /^Registros/ }).click();

    await expect(
      primero.getByRole("button", { name: /^Asistentes/ })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      segundoEvento.getByRole("button", { name: /^Registros/ })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      primero.getByRole("columnheader", { name: "Nombre", exact: true })
    ).toBeVisible();
    await expect(
      segundoEvento.getByRole("columnheader", { name: "Registrados" })
    ).toBeVisible();
    await expect(
      primero.getByRole("columnheader", { name: "Registrados" })
    ).toHaveCount(0);

    await primero
      .getByPlaceholder("Buscar asistente o habitación")
      .fill("Asistente");
    await segundoEvento
      .getByPlaceholder("Buscar checkpoint en Registros")
      .fill("Control alterno");
    await expect(
      primero.getByPlaceholder("Buscar asistente o habitación")
    ).toHaveValue("Asistente");
    await expect(
      segundoEvento.getByPlaceholder("Buscar checkpoint en Registros")
    ).toHaveValue("Control alterno");
    await primero.getByRole("button", { name: /^Cobertura/ }).click();
    await expect(
      primero.getByPlaceholder("Buscar checkpoint en Cobertura")
    ).toHaveValue("");
    await expect(
      segundoEvento.getByPlaceholder("Buscar checkpoint en Registros")
    ).toHaveValue("Control alterno");
  } finally {
    const limpieza = prismaE2E();
    await limpieza.checkpoint.deleteMany({ where: { eventoId: segundo.id } });
    await limpieza.eventoOperador.deleteMany({
      where: { eventoId: segundo.id },
    });
    await limpieza.evento.delete({ where: { id: segundo.id } });
    await limpieza.$disconnect();
  }
});

test("cada vista recuerda su buscador durante el sondeo", async ({ page }) => {
  await loginComo(page, OPERADOR);
  const seccion = page.locator("section", {
    has: page.getByRole("heading", { name: NOMBRE_EVENTO, exact: true }),
  });
  const asistentes = seccion.getByRole("button", { name: /^Asistentes/ });
  const buscador = seccion.getByPlaceholder("Buscar asistente o habitación");

  await asistentes.click();
  await buscador.fill("Asistente de Prueba");
  await page.waitForTimeout(6000);
  await expect(asistentes).toHaveAttribute("aria-pressed", "true");
  await expect(buscador).toHaveValue("Asistente de Prueba");
  await expect(
    seccion.getByRole("columnheader", { name: "Nombre", exact: true })
  ).toBeVisible();

  await seccion.getByRole("button", { name: /^Cobertura/ }).click();
  await expect(
    seccion.getByPlaceholder("Buscar checkpoint en Cobertura")
  ).toHaveValue("");
  await asistentes.click();
  await expect(buscador).toHaveValue("Asistente de Prueba");
});

test("Asistentes filtra filas y columnas sin cambiar Completados", async ({
  page,
}) => {
  const escenario = await crearEscenarioHabitacion();
  const prisma = prismaE2E();
  const evento = await prisma.evento.findFirst({
    where: { nombre: NOMBRE_EVENTO },
    select: { id: true },
  });
  expect(evento).not.toBeNull();
  const grupoUno = await prisma.checkpoint.create({
    data: {
      eventoId: evento!.id,
      nombre: "Grupo Uno",
      tipo: TipoCheckpoint.OTRO,
      activo: true,
    },
    select: { id: true },
  });
  const grupoDos = await prisma.checkpoint.create({
    data: {
      eventoId: evento!.id,
      nombre: "Grupo Dos",
      tipo: TipoCheckpoint.OTRO,
      activo: true,
    },
    select: { id: true },
  });
  const ocupante = await prisma.asistente.findUnique({
    where: {
      eventoId_documento: { eventoId: evento!.id, documento: DOC_601_UNO },
    },
    select: { id: true },
  });
  expect(ocupante).not.toBeNull();
  await prisma.registroControl.create({
    data: {
      asistenteId: ocupante!.id,
      checkpointId: grupoUno.id,
      metodo: MetodoRegistro.AUTOREGISTRO,
    },
  });
  await prisma.$disconnect();

  try {
    await loginComo(page, OPERADOR);
    const seccion = page.locator("section", {
      has: page.getByRole("heading", { name: NOMBRE_EVENTO, exact: true }),
    });
    await seccion.getByRole("button", { name: /^Asistentes/ }).click();
    await expect(
      page.getByPlaceholder("Buscar por nombre o categoría (ej. Habitación 601)")
    ).toHaveCount(0);
    const buscador = seccion.getByPlaceholder("Buscar asistente o habitación");
    const fila = seccion.getByRole("row", { name: /Ocupante 601 Uno/ });
    await expect(fila).toContainText("2/4");

    await buscador.fill("Grupo");
    await expect(
      seccion.getByRole("columnheader", { name: "Grupo Uno", exact: true })
    ).toBeVisible();
    await expect(
      seccion.getByRole("columnheader", { name: "Grupo Dos", exact: true })
    ).toBeVisible();
    await expect(
      seccion.getByRole("columnheader", { name: "601", exact: true })
    ).toHaveCount(0);
    await expect(seccion.getByText("2 columnas visibles")).toBeVisible();
    await expect(fila).toContainText("2/4");

    await buscador.fill("Ocupante 601 Uno");
    await expect(
      seccion.getByRole("row", { name: /Ocupante 601 Uno/ })
    ).toHaveCount(1);
    await expect(
      seccion.getByRole("row", { name: /Fuera 601/ })
    ).toHaveCount(0);
    await expect(fila).toContainText("2/4");

    await buscador.fill("habitacion");
    await expect(
      seccion.getByRole("columnheader", { name: "601", exact: true })
    ).toBeVisible();
    await buscador.fill("ALOJAMIENTO");
    await expect(
      seccion.getByRole("columnheader", { name: "601", exact: true })
    ).toBeVisible();

    await buscador.fill("zzz");
    await expect(seccion.getByText("Sin resultados")).toBeVisible();
  } finally {
    const limpieza = prismaE2E();
    await limpieza.registroControl.deleteMany({
      where: { checkpointId: { in: [grupoUno.id, grupoDos.id] } },
    });
    await limpieza.checkpoint.deleteMany({
      where: { id: { in: [grupoUno.id, grupoDos.id] } },
    });
    await limpieza.$disconnect();
    await limpiarEscenarioHabitacion(escenario);
  }
});

test("Cobertura, Checkpoints activos y Registros filtran por checkpoint", async ({
  page,
}) => {
  const escenario = await crearEscenarioHabitacion();

  try {
    await loginComo(page, OPERADOR);
    const seccion = page.locator("section", {
      has: page.getByRole("heading", { name: NOMBRE_EVENTO, exact: true }),
    });

    const cobertura = seccion.getByPlaceholder("Buscar checkpoint en Cobertura");
    await expect(
      seccion.getByRole("row", { name: /Habitación 601/ })
    ).toBeVisible();
    const textoCobertura = await seccion
      .getByText(/de \d+/)
      .first()
      .textContent();
    await cobertura.fill("601");
    await expect(
      seccion.getByRole("row", { name: /Habitación 601/ })
    ).toBeVisible();
    await expect(
      seccion.getByRole("row", { name: /Control de ingreso/ })
    ).toHaveCount(0);
    expect(await seccion.getByText(/de \d+/).first().textContent()).toBe(
      textoCobertura
    );
    await cobertura.fill("zzz");
    await expect(
      seccion.getByText(/Ningún checkpoint coincide/)
    ).toBeVisible();

    await seccion
      .getByRole("button", { name: /^Checkpoints activos/ })
      .click();
    await seccion.getByPlaceholder("Buscar checkpoint activo").fill("601");
    await expect(
      seccion.locator("li", { hasText: "Habitación 601" })
    ).toBeVisible();
    await expect(
      seccion.locator("li", { hasText: "Control de ingreso" })
    ).toHaveCount(0);
    await expect(
      seccion.getByRole("button", { name: "Desactivar Habitación 601" })
    ).toBeVisible();

    await seccion.getByRole("button", { name: /^Registros/ }).click();
    await seccion.getByPlaceholder("Buscar checkpoint en Registros").fill("601");
    await expect(
      seccion.getByRole("row", { name: /Habitación 601/ })
    ).toBeVisible();
    await expect(
      seccion.getByRole("row", { name: /Control de ingreso/ })
    ).toHaveCount(0);
    await expect(seccion.getByText("100%")).toBeVisible();
  } finally {
    await limpiarEscenarioHabitacion(escenario);
  }
});

test("el registro manual se deshabilita en un checkpoint inactivo", async ({
  page,
}) => {
  const prisma = prismaE2E();
  const evento = await prisma.evento.findFirst({
    where: { nombre: NOMBRE_EVENTO },
    select: { id: true },
  });
  expect(evento).not.toBeNull();
  const inactivo = await prisma.checkpoint.create({
    data: {
      eventoId: evento!.id,
      nombre: "Checkpoint inactivo E2E",
      tipo: "OTRO",
      activo: false,
    },
    select: { id: true },
  });
  await prisma.$disconnect();

  try {
    await loginComo(page, OPERADOR);
    await abrirCheckpoints(page);

    const tarjeta = page.locator("li", {
      hasText: "Checkpoint inactivo E2E",
    });
    await expect(
      tarjeta.getByPlaceholder("Documento del asistente")
    ).toBeDisabled();
    await expect(
      tarjeta.getByRole("button", { name: "Registrar", exact: true })
    ).toBeDisabled();
    await expect(
      tarjeta.getByText("Active el checkpoint para registrar.")
    ).toBeVisible();
  } finally {
    const limpieza = prismaE2E();
    await limpieza.checkpoint.delete({ where: { id: inactivo.id } });
    await limpieza.$disconnect();
  }
});

test("el Operador registra manualmente, el dashboard incrementa y rechaza duplicados", async ({
  page,
}) => {
  const prisma = prismaE2E();
  const evento = await prisma.evento.findFirst({
    where: { nombre: NOMBRE_EVENTO },
    select: { id: true },
  });
  expect(evento).not.toBeNull();
  const checkpoint = await prisma.checkpoint.findFirst({
    where: { eventoId: evento!.id, activo: true },
    select: { id: true },
  });
  expect(checkpoint).not.toBeNull();
  const cuentaInicial = await prisma.registroControl.count({
    where: { checkpointId: checkpoint!.id },
  });
  const totalAsistentes = await prisma.asistente.count({
    where: { eventoId: evento!.id },
  });
  await prisma.$disconnect();

  await loginComo(page, OPERADOR);
  await abrirCheckpoints(page);
  await expect(
    page.getByText(new RegExp(`${cuentaInicial}/${totalAsistentes} registrados`))
  ).toBeVisible();

  await page.getByPlaceholder("Documento del asistente").fill(DOC_MANUAL);
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByText("Asistencia registrada correctamente.")
  ).toBeVisible();
  await page.reload();
  await abrirCheckpoints(page);
  await expect(
    page.getByText(
      new RegExp(`${cuentaInicial + 1}/${totalAsistentes} registrados`)
    )
  ).toBeVisible();

  await page.getByPlaceholder("Documento del asistente").fill(DOC_MANUAL);
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByText("Este documento ya se registró en este checkpoint.")
  ).toBeVisible();
  await page.reload();
  await abrirCheckpoints(page);
  await expect(
    page.getByText(
      new RegExp(`${cuentaInicial + 1}/${totalAsistentes} registrados`)
    )
  ).toBeVisible();
});

test("la habitación 601 usa su base de ocupantes en tarjeta, gráficos y tablas", async ({
  page,
}) => {
  const escenario = await crearEscenarioHabitacion();

  try {
    await loginComo(page, OPERADOR);
    await abrirCheckpoints(page);

    const tarjeta = page.locator("li", { hasText: "Habitación 601" });
    await expect(tarjeta.getByText("2/2 registrados · 100%")).toBeVisible();
    await expect(tarjeta.getByText("Ocupación 2/2")).toBeVisible();
    const barra = tarjeta.getByRole("progressbar", {
      name: "Avance de Habitación 601",
    });
    await expect(barra).toHaveAttribute("aria-valuenow", "2");
    await expect(barra).toHaveAttribute("aria-valuemax", "2");

    await page.getByRole("button", { name: /^Cobertura/ }).click();
    const filaGrafico = page.getByRole("row", { name: /Habitación 601/ });
    await expect(filaGrafico.locator("td").last()).toHaveText("2");
    await expect(filaGrafico.locator("td").last()).not.toHaveText("5");

    await page.getByRole("button", { name: /^Asistentes/ }).click();
    const filaOcupante = page.getByRole("row", {
      name: /Ocupante 601 Uno/,
    });
    await expect(filaOcupante.getByText("SÍ", { exact: true })).toHaveCount(1);
    await expect(filaOcupante.getByText("NO", { exact: true })).toHaveCount(1);
    await expect(filaOcupante.getByText("1/2", { exact: true })).toBeVisible();

    const filaFuera = page.getByRole("row", { name: /Fuera 601/ });
    await expect(filaFuera.getByText("N/A", { exact: true })).toBeVisible();
    await expect(filaFuera.getByText("0/1", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^Registros/ }).click();
    await expect(
      page.getByRole("columnheader", { name: "Base", exact: true })
    ).toBeVisible();
    const filaRegistros = page.getByRole("row", { name: /Habitación 601/ });
    await expect(filaRegistros.locator("td").nth(3)).toHaveText("2");
    await expect(filaRegistros.getByText("100%", { exact: true })).toBeVisible();
  } finally {
    await limpiarEscenarioHabitacion(escenario);
  }
});

test("el registro manual en habitación avisa y rechaza con 422 a un no asignado", async ({
  page,
}) => {
  const escenario = await crearEscenarioHabitacion();

  try {
    await loginComo(page, OPERADOR);
    await abrirCheckpoints(page);

    const tarjeta = page.locator("li", { hasText: "Habitación 601" });
    await expect(
      tarjeta.getByText(
        "Solo se pueden registrar asistentes asignados a esta habitación."
      )
    ).toBeVisible();

    const respuestaPromise = page.waitForResponse(
      (respuesta) =>
        respuesta.url().includes("/api/operador/registro-manual") &&
        respuesta.request().method() === "POST"
    );
    await tarjeta
      .getByPlaceholder("Documento del asistente")
      .fill(escenario.documentoNoAsignado);
    await tarjeta.getByRole("button", { name: "Registrar", exact: true }).click();

    const respuesta = await respuestaPromise;
    expect(respuesta.status()).toBe(422);
    await expect(
      tarjeta.getByText(/no está asignado a esta habitación/)
    ).toBeVisible();
  } finally {
    await limpiarEscenarioHabitacion(escenario);
  }
});
