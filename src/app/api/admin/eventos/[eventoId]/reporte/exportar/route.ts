import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RolUsuario } from "@/generated/prisma/client";
import { formatearFecha } from "@/lib/labels";
import { cargarReporteEvento } from "@/lib/reportes/cargar-reporte";
import {
  descripcionFiltrosReporte,
  filtrosReporteDesdeSearchParams,
  slugReporte,
} from "@/lib/reportes/filtros-reporte";

export const runtime = "nodejs";

// Exporta el reporte de asistentes de un evento a un único .xlsx con dos
// hojas ("Resumen" y "Detalle"), respetando los mismos filtros del reporte
// visible (?tipo=...&rol=...). Solo Administrador (patrón asistentes/route).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.rol !== RolUsuario.ADMINISTRADOR) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { eventoId } = await params;
  const { searchParams } = new URL(request.url);
  const filtros = filtrosReporteDesdeSearchParams(searchParams);
  const descripcionFiltros = descripcionFiltrosReporte(filtros);

  const reporte = await cargarReporteEvento(eventoId, filtros);
  if (!reporte) {
    return NextResponse.json({ error: "El evento no existe." }, { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bienestar al Aprendiz";
  workbook.created = new Date();

  // Hoja 1: resumen por checkpoint.
  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Checkpoint", key: "checkpoint", width: 28 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Personas esperadas", key: "esperados", width: 20 },
    { header: "Personas registradas", key: "registrados", width: 20 },
    { header: "Faltan por registrar", key: "faltan", width: 20 },
    { header: "% de asistencia", key: "porcentaje", width: 16 },
  ];
  for (const cp of reporte.checkpoints) {
    resumen.addRow({
      checkpoint: cp.nombre,
      tipo: cp.tipo,
      esperados: cp.esperados,
      registrados: cp.registrados,
      faltan: cp.faltan,
      porcentaje: cp.porcentaje === null ? null : cp.porcentaje,
    });
  }
  resumen.getRow(1).font = { bold: true };
  resumen.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: resumen.rowCount, column: resumen.columnCount },
  };

  // Notas al pie: contexto del archivo y glosario de las métricas. Se agregan
  // después del autoFilter para que el rango del filtro termine en la última
  // fila de datos.
  const notas = [
    `Evento: ${reporte.nombre}`,
    `Filtros: ${descripcionFiltros}`,
    `Generado: ${formatearFecha(new Date())}`,
    "",
    "Personas esperadas: asistentes de inscripciones no canceladas, según los filtros aplicados.",
    "Personas registradas: personas con registro real en el checkpoint (una sola vez por persona).",
    "Faltan por registrar: personas esperadas menos personas registradas en el checkpoint.",
    "% de asistencia: personas registradas ÷ personas esperadas.",
  ];
  for (const texto of notas) {
    const fila = resumen.addRow([texto]);
    resumen.mergeCells(fila.number, 1, fila.number, resumen.columnCount);
    const celda = fila.getCell(1);
    celda.font = { italic: true, size: 10 };
    celda.alignment = { wrapText: true, vertical: "top" };
  }

  // Hoja 2: desglose por persona.
  const detalle = workbook.addWorksheet("Detalle");
  const baseColumns = [
    { header: "Documento", key: "documento", width: 14 },
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Tipo", key: "tipoPersona", width: 12 },
    { header: "Centro de formación", key: "centro", width: 34 },
  ];
  for (const cp of reporte.checkpoints) {
    baseColumns.push({ header: cp.nombre, key: cp.id, width: 12 });
  }
  baseColumns.push({ header: "Completados", key: "completados", width: 12 });
  detalle.columns = baseColumns;

  for (const a of reporte.asistentes) {
    const fila: Record<string, unknown> = {
      documento: a.documento,
      nombre: a.nombreCompleto,
      tipoPersona: a.esTitular ? "Titular" : "Acompañante",
      centro: a.centroFormacion ?? "",
      completados: `${a.completados}/${a.totalCheckpoints}`,
    };
    for (const cp of reporte.checkpoints) {
      fila[cp.id] = a.registradoPorCheckpoint[cp.id] ? "SÍ" : "NO";
    }
    detalle.addRow(fila);
  }
  detalle.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const nombreArchivo = `reporte-${slugReporte(reporte.nombre)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}