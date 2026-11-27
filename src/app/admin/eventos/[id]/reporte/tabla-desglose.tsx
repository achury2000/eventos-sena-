import type {
  AsistenteReporte,
  CheckpointReporte,
} from "@/lib/reportes/cargar-reporte";

// Desglose por persona: una fila por asistente esperado con el estado
// (SÍ/NO) en cada checkpoint visible y el conteo de completados.
// Componente server presentacional.
export function TablaDesglose({
  checkpoints,
  asistentes,
  etiquetaTipo,
}: {
  checkpoints: CheckpointReporte[];
  asistentes: AsistenteReporte[];
  etiquetaTipo: Record<string, string>;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Desglose por persona</h3>
      {asistentes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay asistentes esperados para este evento.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Centro</th>
                {checkpoints.map((cp) => (
                  <th
                    key={cp.id}
                    className="px-3 py-3 text-center font-medium"
                    title={`${cp.nombre} (${etiquetaTipo[cp.tipo] ?? cp.tipo})`}
                  >
                    {cp.nombre}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Completados</th>
              </tr>
            </thead>
            <tbody>
              {asistentes.map((a) => (
                <tr key={a.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 tabular-nums">{a.documento}</td>
                  <td className="px-4 py-3 font-medium">{a.nombreCompleto}</td>
                  <td className="px-4 py-3">
                    {a.esTitular ? "Titular" : "Acompañante"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.centroFormacion ?? "—"}
                  </td>
                  {checkpoints.map((cp) => (
                    <td key={cp.id} className="px-3 py-3 text-center">
                      {a.registradoPorCheckpoint[cp.id] ? (
                        <span className="font-medium text-success-foreground">SÍ</span>
                      ) : (
                        <span className="text-muted-foreground">NO</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {a.completados}/{a.totalCheckpoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}