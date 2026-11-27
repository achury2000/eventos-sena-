import type { CheckpointReporte } from "@/lib/reportes/cargar-reporte";

function porcentaje(porcentaje: number | null): string {
  return porcentaje === null ? "—" : `${porcentaje}%`;
}

// Tabla de resumen por checkpoint: esperados vs. registrados (real),
// faltantes por registrar y porcentaje. Componente server presentacional.
export function TablaResumen({
  checkpoints,
  totalAsistentes,
  etiquetaTipo,
}: {
  checkpoints: CheckpointReporte[];
  totalAsistentes: number;
  etiquetaTipo: Record<string, string>;
}) {
  if (checkpoints.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Resumen por checkpoint</h3>
        <p className="text-sm text-muted-foreground">
          Este evento aún no tiene checkpoints configurados.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Resumen por checkpoint</h3>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Checkpoint</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th
                className="px-4 py-3 text-right font-medium"
                title="Asistentes de inscripciones no canceladas, según los filtros aplicados."
              >
                Personas esperadas
              </th>
              <th
                className="px-4 py-3 text-right font-medium"
                title="Personas con registro real en este checkpoint (una sola vez por persona)."
              >
                Personas registradas
              </th>
              <th
                className="px-4 py-3 text-right font-medium"
                title="Personas esperadas menos personas registradas en este checkpoint."
              >
                Faltan por registrar
              </th>
              <th
                className="px-4 py-3 text-right font-medium"
                title="Personas registradas ÷ personas esperadas."
              >
                % de asistencia
              </th>
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((cp) => {
              return (
                <tr key={cp.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{cp.nombre}</td>
                  <td className="px-4 py-3">{etiquetaTipo[cp.tipo] ?? cp.tipo}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{cp.esperados}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{cp.registrados}</td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      cp.faltan > 0 ? "text-muted-foreground" : ""
                    }`}
                  >
                    {cp.faltan}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {porcentaje(cp.porcentaje)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Personas esperadas: asistentes de inscripciones no canceladas, según
        los filtros aplicados. Faltan por registrar: personas esperadas menos las
        personas registradas en el checkpoint. Total esperado:{" "}
        {totalAsistentes}.
      </p>
    </section>
  );
}