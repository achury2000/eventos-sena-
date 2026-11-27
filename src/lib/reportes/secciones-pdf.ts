import { formatearFecha } from "@/lib/labels";
import type { ReporteEvento } from "./cargar-reporte";

// Prepara el contenido del PDF como datos planos. El renderizador PDFKit solo
// dibuja estas estructuras, así que el contenido se puede probar sin leer el
// binario del documento. Las columnas y notas coinciden con la hoja XLSX.

export interface SeccionTablaPdf {
  encabezados: string[];
  filas: string[][];
}

export interface SeccionesPdfReporte {
  titulo: string;
  subtitulo: string;
  filtros: string;
  generado: string;
  resumen: SeccionTablaPdf;
  detalle: SeccionTablaPdf;
  notas: string[];
}

export function construirSeccionesPdf(
  reporte: ReporteEvento,
  descripcionFiltros: string
): SeccionesPdfReporte {
  const generado = `Generado: ${formatearFecha(new Date())}`;

  return {
    titulo: `Reporte de asistentes: ${reporte.nombre}`,
    subtitulo: `${reporte.lugar} · ${formatearFecha(reporte.fechaInicio)} — ${formatearFecha(reporte.fechaFin)}`,
    filtros: `Filtros: ${descripcionFiltros}`,
    generado,
    resumen: {
      encabezados: [
        "Checkpoint",
        "Tipo",
        "Personas esperadas",
        "Personas registradas",
        "Faltan por registrar",
        "% de asistencia",
      ],
      filas: reporte.checkpoints.map((cp) => [
        cp.nombre,
        cp.tipo,
        String(cp.esperados),
        String(cp.registrados),
        String(cp.faltan),
        cp.porcentaje === null ? "—" : `${cp.porcentaje}%`,
      ]),
    },
    detalle: {
      encabezados: [
        "Documento",
        "Nombre",
        "Tipo",
        "Centro de formación",
        ...reporte.checkpoints.map((cp) => cp.nombre),
        "Completados",
      ],
      filas: reporte.asistentes.map((a) => [
        a.documento,
        a.nombreCompleto,
        a.esTitular ? "Titular" : "Acompañante",
        a.centroFormacion ?? "",
        ...reporte.checkpoints.map((cp) =>
          a.registradoPorCheckpoint[cp.id] ? "SÍ" : "NO"
        ),
        `${a.completados}/${a.totalCheckpoints}`,
      ]),
    },
    notas: [
      `Evento: ${reporte.nombre}`,
      `Filtros: ${descripcionFiltros}`,
      generado,
      "",
      "Personas esperadas: asistentes de inscripciones no canceladas, según los filtros aplicados.",
      "Personas registradas: personas con registro real en el checkpoint (una sola vez por persona).",
      "Faltan por registrar: personas esperadas menos personas registradas en el checkpoint.",
      "% de asistencia: personas registradas ÷ personas esperadas.",
    ],
  };
}
