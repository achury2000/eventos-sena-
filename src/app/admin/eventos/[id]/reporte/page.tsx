import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { ETIQUETA_TIPO_CHECKPOINT, formatearFecha } from "@/lib/labels";
import { cargarReporteEvento } from "@/lib/reportes/cargar-reporte";
import { filtrosReporteDesdeParametros } from "@/lib/reportes/filtros-reporte";
import { FiltrosReporteForm } from "./filtros-reporte";
import { TablaDesglose } from "./tabla-desglose";
import { TablaResumen } from "./tabla-resumen";

type SearchParams = {
  tipo?: string;
  rol?: string;
};

export default async function ReporteEventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const { id } = await params;
  const sp = await searchParams;
  const filtros = filtrosReporteDesdeParametros(sp);

  const reporte = await cargarReporteEvento(id, filtros);
  if (!reporte) notFound();

  const paramsFiltro = new URLSearchParams();
  if (filtros.tipoCheckpoint) paramsFiltro.set("tipo", filtros.tipoCheckpoint);
  if (filtros.rol) paramsFiltro.set("rol", filtros.rol);
  const sufijo = paramsFiltro.size ? `?${paramsFiltro.toString()}` : "";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Reporte de asistentes
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {reporte.nombre}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reporte.lugar} · {formatearFecha(reporte.fechaInicio)} —{" "}
            {formatearFecha(reporte.fechaFin)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/eventos/${id}/inscripciones`}>
            <Button variant="outline" size="sm">
              Inscripciones
            </Button>
          </Link>
          <Link href={`/admin/eventos/${id}`}>
            <Button variant="outline" size="sm">
              Volver al evento
            </Button>
          </Link>
          <a href={`/api/admin/eventos/${id}/reporte/exportar${sufijo}`}>
            <Button size="sm">Exportar XLSX</Button>
          </a>
          <a href={`/api/admin/eventos/${id}/reporte/exportar/pdf${sufijo}`}>
            <Button variant="outline" size="sm">
              Exportar PDF
            </Button>
          </a>
        </div>
      </div>

      <FiltrosReporteForm filtros={filtros} />

      <TablaResumen
        checkpoints={reporte.checkpoints}
        totalAsistentes={reporte.asistentes.length}
        etiquetaTipo={ETIQUETA_TIPO_CHECKPOINT}
      />

      <TablaDesglose
        checkpoints={reporte.checkpoints}
        asistentes={reporte.asistentes}
        etiquetaTipo={ETIQUETA_TIPO_CHECKPOINT}
      />
    </section>
  );
}