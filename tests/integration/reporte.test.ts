import ExcelJS from "exceljs";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { GET as exportar } from "@/app/api/admin/eventos/[eventoId]/reporte/exportar/route";
import { GET as exportarPdf } from "@/app/api/admin/eventos/[eventoId]/reporte/exportar/pdf/route";
import { EstadoInscripcion } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cargarReporteEvento } from "@/lib/reportes/cargar-reporte";
import {
  descripcionFiltrosReporte,
  filtrosReporteDesdeParametros,
} from "@/lib/reportes/filtros-reporte";
import { generarPdfReporte } from "@/lib/reportes/generar-pdf-reporte";
import { construirSeccionesPdf } from "@/lib/reportes/secciones-pdf";
import {
  crearAdminPrueba,
  crearAsistenteInscrito,
  crearCheckpointPrueba,
  crearEventoPrueba,
} from "../helpers/factories";

const estado = vi.hoisted(() => ({
  sesion: { user: { rol: "ADMINISTRADOR" } } as {
    user: { rol: string };
  } | null,
}));

vi.mock("@/lib/prisma", async () => {
  const { createTestPrisma } = await import("../helpers/db");
  return { prisma: createTestPrisma() };
});

vi.mock("@/auth", () => ({ auth: async () => estado.sesion }));

describe("Reporte de asistentes: filtro de rol en las métricas", () => {
  let admin: { id: string };
  let eventoId: string;
  let checkpointId: string;

  beforeEach(() => {
    estado.sesion = { user: { rol: "ADMINISTRADOR" } };
  });

  function pedirPdf(eventoId: string, consulta = ""): Promise<Response> {
    return exportarPdf(
      new Request(
        `http://localhost:3000/api/admin/eventos/${eventoId}/reporte/exportar/pdf${consulta}`
      ),
      { params: Promise.resolve({ eventoId }) }
    );
  }

  beforeAll(async () => {
    await prisma.$connect();
    admin = await crearAdminPrueba(prisma, "reporte");

    const evento = await crearEventoPrueba(prisma, {
      cupo: 10,
      adminId: admin.id,
    });
    eventoId = evento.id;

    const titular = await crearAsistenteInscrito(prisma, {
      eventoId,
      documento: "300000000101",
      esTitular: true,
    });
    const acompanante = await crearAsistenteInscrito(prisma, {
      eventoId,
      documento: "300000000102",
      esTitular: false,
    });
    // Este titular no se registra: explica el faltante en el checkpoint.
    await crearAsistenteInscrito(prisma, {
      eventoId,
      documento: "300000000103",
      esTitular: true,
    });

    const checkpoint = await crearCheckpointPrueba(prisma, {
      eventoId,
      activo: true,
    });
    checkpointId = checkpoint.id;

    await prisma.registroControl.createMany({
      data: [
        { asistenteId: titular.id, checkpointId, metodo: "MANUAL" },
        { asistenteId: acompanante.id, checkpointId, metodo: "AUTOREGISTRO" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sin filtro cuenta titulares y acompañantes esperados", async () => {
    const reporte = await cargarReporteEvento(eventoId);
    expect(reporte).not.toBeNull();
    expect(reporte?.checkpoints[0]).toMatchObject({
      esperados: 3,
      registrados: 2,
      faltan: 1,
      porcentaje: 66.7,
    });
  });

  it("con filtro de titulares, registrados respeta el mismo universo que esperados", async () => {
    const reporte = await cargarReporteEvento(eventoId, { rol: "titular" });
    expect(reporte?.checkpoints[0]).toMatchObject({
      esperados: 2,
      registrados: 1,
      faltan: 1,
      porcentaje: 50,
    });
  });

  it("con filtro de acompañantes, registrados respeta el mismo universo que esperados", async () => {
    const reporte = await cargarReporteEvento(eventoId, { rol: "acompanante" });
    expect(reporte?.checkpoints[0]).toMatchObject({
      esperados: 1,
      registrados: 1,
      faltan: 0,
      porcentaje: 100,
    });
  });

  it("excluye de esperados y registrados las inscripciones canceladas", async () => {
    const evento = await crearEventoPrueba(prisma, {
      cupo: 5,
      adminId: admin.id,
    });
    const checkpoint = await crearCheckpointPrueba(prisma, {
      eventoId: evento.id,
      activo: true,
    });
    const asistente = await crearAsistenteInscrito(prisma, {
      eventoId: evento.id,
      documento: "300000000201",
      esTitular: true,
    });
    await prisma.registroControl.create({
      data: {
        asistenteId: asistente.id,
        checkpointId: checkpoint.id,
        metodo: "MANUAL",
      },
    });

    const { inscripcionId } = await prisma.asistente.findUniqueOrThrow({
      where: { id: asistente.id },
      select: { inscripcionId: true },
    });
    await prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: { estado: EstadoInscripcion.CANCELADO },
    });

    const reporte = await cargarReporteEvento(evento.id);
    expect(reporte?.checkpoints[0]).toMatchObject({
      esperados: 0,
      registrados: 0,
      faltan: 0,
      porcentaje: null,
    });
  });

  it("el XLSX exportado usa los encabezados claros y agrega las notas al pie", async () => {
    const respuesta = await exportar(
      new Request(
        `http://localhost:3000/api/admin/eventos/${eventoId}/reporte/exportar`
      ),
      { params: Promise.resolve({ eventoId }) }
    );
    expect(respuesta.status).toBe(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await respuesta.arrayBuffer());
    const resumen = workbook.getWorksheet("Resumen");
    expect(resumen).toBeDefined();
    if (!resumen) return;

    const encabezados = (resumen.getRow(1).values as unknown[]).slice(1);
    expect(encabezados).toEqual([
      "Checkpoint",
      "Tipo",
      "Personas esperadas",
      "Personas registradas",
      "Faltan por registrar",
      "% de asistencia",
    ]);

    const textos: string[] = [];
    resumen.eachRow((fila) => {
      const valor = fila.getCell(1).value;
      if (typeof valor === "string") textos.push(valor);
    });
    expect(textos).toContain("Evento: Evento de prueba");
    expect(textos).toContain("Filtros: Todos (sin filtros)");
    expect(textos).toContain(
      "Faltan por registrar: personas esperadas menos personas registradas en el checkpoint."
    );
  });

  it("los filtros compartidos son idénticos para la página y las exportaciones", () => {
    expect(
      filtrosReporteDesdeParametros({ tipo: "COMIDA", rol: "titular" })
    ).toEqual({ tipoCheckpoint: "COMIDA", rol: "titular" });
    expect(filtrosReporteDesdeParametros({ tipo: "NO_VALIDO", rol: "otro" })).toEqual(
      {}
    );
    expect(descripcionFiltrosReporte({ rol: "acompanante" })).toBe(
      "Persona: Acompañantes"
    );
  });

  it("las secciones del PDF reflejan el mismo resumen y desglose que el XLSX", async () => {
    const reporte = await cargarReporteEvento(eventoId);
    expect(reporte).not.toBeNull();

    const secciones = construirSeccionesPdf(reporte!, "Todos (sin filtros)");

    expect(secciones.resumen.encabezados).toEqual([
      "Checkpoint",
      "Tipo",
      "Personas esperadas",
      "Personas registradas",
      "Faltan por registrar",
      "% de asistencia",
    ]);
    expect(secciones.resumen.filas[0]).toEqual([
      "Checkpoint de prueba",
      "COMIDA",
      "3",
      "2",
      "1",
      "66.7%",
    ]);
    expect(secciones.detalle.encabezados).toEqual([
      "Documento",
      "Nombre",
      "Tipo",
      "Centro de formación",
      "Checkpoint de prueba",
      "Completados",
    ]);
    expect(secciones.detalle.filas).toHaveLength(3);
    expect(
      secciones.detalle.filas.some(
        (fila) => fila[0] === "300000000101" && fila[2] === "Titular"
      )
    ).toBe(true);
    expect(secciones.notas).toContain("Evento: Evento de prueba");
  });

  it("las secciones del PDF respetan los filtros activos", async () => {
    const filtros = filtrosReporteDesdeParametros({
      tipo: "COMIDA",
      rol: "titular",
    });
    const reporte = await cargarReporteEvento(eventoId, filtros);
    expect(reporte).not.toBeNull();

    const secciones = construirSeccionesPdf(
      reporte!,
      descripcionFiltrosReporte(filtros)
    );

    expect(secciones.filtros).toBe(
      "Filtros: Tipo de checkpoint: Comida · Persona: Titulares"
    );
    expect(secciones.detalle.filas).toHaveLength(2);
    expect(secciones.resumen.filas[0]).toEqual([
      "Checkpoint de prueba",
      "COMIDA",
      "2",
      "1",
      "1",
      "50%",
    ]);
  });

  it("genera un PDF válido incluso con acentos y ñ en el título", async () => {
    const reporte = await cargarReporteEvento(eventoId);
    const secciones = construirSeccionesPdf(reporte!, "Todos (sin filtros)");
    const buffer = await generarPdfReporte({
      ...secciones,
      titulo: "Reporte de asistencia: Ñ Acentuación",
    });

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("puede paginar un reporte con muchos checkpoints y asistentes", async () => {
    const reporte = await cargarReporteEvento(eventoId);
    expect(reporte).not.toBeNull();

    const checkpoints = Array.from({ length: 30 }, (_, indice) => ({
      ...reporte!.checkpoints[0],
      id: `cp-${indice}`,
      nombre: `Checkpoint ${indice}`,
    }));
    const asistentes = Array.from({ length: 120 }, (_, indice) => ({
      ...reporte!.asistentes[0],
      id: `asistente-${indice}`,
      documento: `9000000000${indice}`.slice(0, 12),
      registradoPorCheckpoint: Object.fromEntries(
        checkpoints.map((cp) => [cp.id, indice % 2 === 0])
      ),
    }));

    const buffer = await generarPdfReporte(
      construirSeccionesPdf(
        { ...reporte!, checkpoints, asistentes },
        "Todos (sin filtros)"
      )
    );

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("el endpoint PDF devuelve un archivo válido con cabeceras de descarga", async () => {
    const respuesta = await pedirPdf(eventoId);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toContain("application/pdf");
    expect(respuesta.headers.get("content-disposition")).toBe(
      'attachment; filename="reporte-evento-de-prueba.pdf"'
    );

    const buffer = Buffer.from(await respuesta.arrayBuffer());
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("el endpoint PDF funciona con un evento sin datos", async () => {
    const evento = await crearEventoPrueba(prisma, {
      cupo: 2,
      adminId: admin.id,
    });
    const respuesta = await pedirPdf(evento.id);

    expect(respuesta.status).toBe(200);
    expect(Buffer.from(await respuesta.arrayBuffer()).subarray(0, 5).toString()).toBe(
      "%PDF-"
    );
  });

  it("el endpoint PDF responde 404 para un evento inexistente", async () => {
    const respuesta = await pedirPdf("evento-que-no-existe");
    expect(respuesta.status).toBe(404);
  });

  it("el endpoint PDF rechaza peticiones sin sesión", async () => {
    estado.sesion = null;
    const respuesta = await pedirPdf(eventoId);
    expect(respuesta.status).toBe(401);
  });

  it("el endpoint PDF rechaza a un Operador", async () => {
    estado.sesion = { user: { rol: "OPERADOR" } };
    const respuesta = await pedirPdf(eventoId);
    expect(respuesta.status).toBe(403);
  });
});
