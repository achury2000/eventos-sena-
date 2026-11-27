"use client";

import { ClipboardList, SearchX } from "lucide-react";
import { cn } from "cn";
import { ETIQUETA_TIPO_CHECKPOINT } from "@/lib/labels";
import { coincideCheckpoint } from "@/lib/operador/busqueda";
import type { EventoTablero } from "@/lib/operador/tablero";
import { BuscadorVista } from "./buscador-vista";

// Vista Registros del tablero: desglose de los agregados que ya trae el DTO.
// No añade consultas y muestra el mismo total que el botón Registros.
export function TablaRegistros({
  evento,
  busqueda,
  onBusquedaChange,
}: {
  evento: EventoTablero;
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
}) {
  const checkpointsVisibles = evento.checkpoints.filter((checkpoint) =>
    coincideCheckpoint(checkpoint, busqueda)
  );
  const sinCoincidencias =
    busqueda.trim().length > 0 && checkpointsVisibles.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Registros</h4>
            <p className="text-xs text-muted-foreground">
              Detalle de los registros por checkpoint del evento.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {busqueda.trim()
              ? `${checkpointsVisibles.length} de ${evento.checkpoints.length}`
              : evento.checkpoints.length}{" "}
            {evento.checkpoints.length === 1 ? "checkpoint" : "checkpoints"}
          </span>
        </div>

        <BuscadorVista
          valor={busqueda}
          onChange={onBusquedaChange}
          etiqueta={`Buscar checkpoints en Registros de ${evento.nombre}`}
          placeholder="Buscar checkpoint en Registros"
        />
      </div>

      {evento.checkpoints.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <ClipboardList className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium">Sin checkpoints</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Este evento aún no tiene puntos de control cuyos registros mostrar.
          </p>
        </div>
      ) : sinCoincidencias ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <SearchX className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium">Sin resultados</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Ningún checkpoint coincide con «{busqueda}».
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">
              Registros por checkpoint del evento {evento.nombre}
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Checkpoint
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  Registrados
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  Manuales
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  Autoregistro
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  Base
                </th>
                <th scope="col" className="px-3 py-2 text-center font-medium">
                  Avance
                </th>
              </tr>
            </thead>
            <tbody>
              {checkpointsVisibles.map((checkpoint) => {
                const autorregistro = Math.max(
                  0,
                  checkpoint.registros - checkpoint.manuales,
                );
                const avance =
                  checkpoint.baseDestinatarios > 0
                    ? Math.round(
                        (checkpoint.registros / checkpoint.baseDestinatarios) * 100
                      )
                    : 0;

                return (
                  <tr key={checkpoint.id} className="border-t">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      <span className="block min-w-0 break-words">
                        {checkpoint.nombre}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {ETIQUETA_TIPO_CHECKPOINT[checkpoint.tipo] ??
                          checkpoint.tipo}
                      </span>
                    </th>
                    <td className="px-3 py-2 text-center font-medium tabular-nums">
                      {checkpoint.registros}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {checkpoint.manuales}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {autorregistro}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {checkpoint.baseDestinatarios}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          avance >= 100
                            ? "border-success/40 bg-success/10 text-success-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                        aria-label={`Avance de ${checkpoint.nombre}: ${avance} por ciento`}
                      >
                        {avance}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
