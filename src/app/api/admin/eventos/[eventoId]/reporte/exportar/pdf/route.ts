import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RolUsuario } from "@/generated/prisma/client";
import { cargarReporteEvento } from "@/lib/reportes/cargar-reporte";
import {
  descripcionFiltrosReporte,
  filtrosReporteDesdeSearchParams,
  slugReporte,
} from "@/lib/reportes/filtros-reporte";
import { generarPdfReporte } from "@/lib/reportes/generar-pdf-reporte";
import { construirSeccionesPdf } from "@/lib/reportes/secciones-pdf";

export const runtime = "nodejs";

// Exporta el mismo reporte que el XLSX, pero como PDF paginado. Comparte la
// autorización, el parseo de filtros y la carga de datos con la ruta XLSX.
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

  const reporte = await cargarReporteEvento(eventoId, filtros);
  if (!reporte) {
    return NextResponse.json({ error: "El evento no existe." }, { status: 404 });
  }

  const secciones = construirSeccionesPdf(
    reporte,
    descripcionFiltrosReporte(filtros)
  );
  const buffer = await generarPdfReporte(secciones);
  const nombreArchivo = `reporte-${slugReporte(reporte.nombre)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
