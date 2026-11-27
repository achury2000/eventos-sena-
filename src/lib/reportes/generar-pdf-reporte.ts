import PDFDocument from "pdfkit";
import type { SeccionesPdfReporte, SeccionTablaPdf } from "./secciones-pdf";

// Genera el PDF en Node.js. Se dibuja de forma directa en lugar de renderizar
// HTML para mantener la imagen de producción libre de Chromium y usar las
// fuentes estándar compatibles con acentos españoles.

const MARGEN = 36;
const TAMANO_FUENTE = 8;
const PADDING = 4;
const LINE_GAP = 2;
const FUENTE = "Helvetica";
const FUENTE_NEGRITA = "Helvetica-Bold";

function anchoUtil(doc: PDFKit.PDFDocument): number {
  return doc.page.width - MARGEN * 2;
}

function escribirLinea(
  doc: PDFKit.PDFDocument,
  texto: string,
  y: number,
  opciones: {
    fuente?: string;
    tamano?: number;
    color?: string;
    salto?: number;
  } = {}
): number {
  const fuente = opciones.fuente ?? FUENTE;
  const tamano = opciones.tamano ?? 9;
  const ancho = anchoUtil(doc);

  doc
    .font(fuente)
    .fontSize(tamano)
    .fillColor(opciones.color ?? "#4B5563")
    .text(texto, MARGEN, y, { width: ancho });

  doc.font(fuente).fontSize(tamano);
  return (
    y +
    doc.heightOfString(texto, { width: ancho, lineGap: LINE_GAP }) +
    (opciones.salto ?? 4)
  );
}

function anchosResumen(ancho: number): number[] {
  const pesos = [3, 1.5, 1.5, 1.7, 1.5, 1.3];
  const total = pesos.reduce((suma, peso) => suma + peso, 0);
  return pesos.map((peso) => (peso / total) * ancho);
}

function anchosDetalle(cantidadCheckpoints: number, ancho: number): number[] {
  const deseados = [
    80,
    140,
    65,
    150,
    ...Array.from({ length: cantidadCheckpoints }, () => 58),
    75,
  ];
  const total = deseados.reduce((suma, valor) => suma + valor, 0);
  const escala = ancho / total;
  return deseados.map((valor) => valor * escala);
}

function alturaCelda(
  doc: PDFKit.PDFDocument,
  texto: string,
  ancho: number,
  fuente: string
): number {
  doc.font(fuente).fontSize(TAMANO_FUENTE);
  return (
    doc.heightOfString(texto || " ", {
      width: Math.max(1, ancho - PADDING * 2),
    }) +
    PADDING * 2
  );
}

function dibujarTabla(
  doc: PDFKit.PDFDocument,
  tabla: SeccionTablaPdf,
  anchos: number[],
  yInicial: number
): number {
  const ancho = anchoUtil(doc);
  const limiteInferior = doc.page.height - doc.page.margins.bottom;
  let y = yInicial;

  const dibujarEncabezado = (yHeader: number): number => {
    const alturas = tabla.encabezados.map((texto, indice) =>
      alturaCelda(doc, texto, anchos[indice], FUENTE_NEGRITA)
    );
    const alto = Math.max(...alturas, TAMANO_FUENTE + LINE_GAP + PADDING * 2);

    doc.rect(MARGEN, yHeader, ancho, alto).fill("#E5E7EB");

    let x = MARGEN;
    tabla.encabezados.forEach((texto, indice) => {
      doc
        .font(FUENTE_NEGRITA)
        .fontSize(TAMANO_FUENTE)
        .fillColor("#111827")
        .text(texto, x + PADDING, yHeader + PADDING, {
          width: Math.max(1, anchos[indice] - PADDING * 2),
          lineGap: LINE_GAP,
        });
      x += anchos[indice];
    });

    doc
      .moveTo(MARGEN, yHeader + alto)
      .lineTo(MARGEN + ancho, yHeader + alto)
      .strokeColor("#9CA3AF")
      .stroke();

    return alto;
  };

  y += dibujarEncabezado(y);

  for (const fila of tabla.filas) {
    const alturas = fila.map((texto, indice) =>
      alturaCelda(doc, texto, anchos[indice], FUENTE)
    );
    const altoFila = Math.max(
      ...alturas,
      TAMANO_FUENTE + LINE_GAP + PADDING * 2
    );

    if (y + altoFila > limiteInferior) {
      doc.addPage();
      y = MARGEN + dibujarEncabezado(MARGEN);
    }

    let x = MARGEN;
    fila.forEach((texto, indice) => {
      doc
        .font(FUENTE)
        .fontSize(TAMANO_FUENTE)
        .fillColor("#111827")
        .text(texto, x + PADDING, y + PADDING, {
          width: Math.max(1, anchos[indice] - PADDING * 2),
          lineGap: LINE_GAP,
        });
      x += anchos[indice];
    });

    doc
      .moveTo(MARGEN, y + altoFila)
      .lineTo(MARGEN + ancho, y + altoFila)
      .strokeColor("#E5E7EB")
      .stroke();

    y += altoFila;
  }

  return y + 12;
}

export async function generarPdfReporte(
  secciones: SeccionesPdfReporte
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    bufferPages: true,
    margins: { top: MARGEN, bottom: 48, left: MARGEN, right: MARGEN },
    info: {
      Title: secciones.titulo,
      Author: "Bienestar al Aprendiz",
      Subject: "Reporte de asistentes por checkpoint",
    },
  });

  const partes: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (parte: Uint8Array) => partes.push(Buffer.from(parte)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(partes)));

    let y = MARGEN;
    y = escribirLinea(doc, secciones.titulo, y, {
      fuente: FUENTE_NEGRITA,
      tamano: 15,
      color: "#111827",
      salto: 3,
    });
    y = escribirLinea(doc, secciones.subtitulo, y, { tamano: 9, salto: 2 });
    y = escribirLinea(doc, secciones.filtros, y, { tamano: 9, salto: 2 });
    y = escribirLinea(doc, secciones.generado, y, { tamano: 9, salto: 10 });

    y = escribirLinea(doc, "Resumen", y, {
      fuente: FUENTE_NEGRITA,
      tamano: 12,
      color: "#111827",
      salto: 6,
    });
    y = dibujarTabla(doc, secciones.resumen, anchosResumen(anchoUtil(doc)), y);

    y = escribirLinea(doc, "Detalle", y, {
      fuente: FUENTE_NEGRITA,
      tamano: 12,
      color: "#111827",
      salto: 6,
    });
    y = dibujarTabla(
      doc,
      secciones.detalle,
      anchosDetalle(
        Math.max(0, secciones.detalle.encabezados.length - 5),
        anchoUtil(doc)
      ),
      y
    );

    y = escribirLinea(doc, "Notas", y, {
      fuente: FUENTE_NEGRITA,
      tamano: 11,
      color: "#111827",
      salto: 4,
    });
    for (const nota of secciones.notas) {
      if (!nota) {
        y += 3;
        continue;
      }
      if (y > doc.page.height - doc.page.margins.bottom - 12) {
        doc.addPage();
        y = MARGEN;
      }
      y = escribirLinea(doc, nota, y, { tamano: 8, color: "#6B7280", salto: 2 });
    }

    const rango = doc.bufferedPageRange();
    for (let pagina = rango.start; pagina < rango.start + rango.count; pagina += 1) {
      doc.switchToPage(pagina);
      doc
        .font(FUENTE)
        .fontSize(8)
        .fillColor("#9CA3AF")
        .text(
          `Página ${pagina - rango.start + 1} de ${rango.count}`,
          MARGEN,
          doc.page.height - 26,
          { width: anchoUtil(doc), align: "right" }
        );
    }

    doc.end();
  });
}
