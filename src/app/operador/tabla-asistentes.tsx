"use client";

import { SearchX, Users } from "lucide-react";
import type { EventoTablero } from "@/lib/operador/tablero";
import {
  coincideAsistente,
  coincideCheckpoint,
  etiquetaCortaCheckpoint,
  normalizarBusqueda,
  textoColumnasVisibles,
} from "@/lib/operador/busqueda";
import { BuscadorVista } from "./buscador-vista";

// Vista Asistentes del tablero: nombres y estado por checkpoint, sin
// documento. El DTO ya viene filtrado por eventos asignados al Operador y
// ordenado por nombre desde `cargarTableroOperador`.
export function TablaAsistentes({
  evento,
  busqueda,
  onBusquedaChange,
}: {
  evento: EventoTablero;
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
}) {
  const termino = normalizarBusqueda(busqueda);
  const asistentesCoincidentes = evento.asistentes.filter((asistente) =>
    coincideAsistente(asistente.nombreCompleto, busqueda)
  );
  const checkpointsCoincidentes = evento.checkpoints.filter((checkpoint) =>
    coincideCheckpoint(checkpoint, busqueda)
  );

  // El texto solo estrecha un eje cuando hay coincidencias en ese eje. Así,
  // buscar una persona no vacía las columnas y buscar un cuarto no vacía las
  // filas; si coincide en ambos, se aplican los dos filtros a la vez.
  const filtrarFilas = termino.length > 0 && asistentesCoincidentes.length > 0;
  const filtrarColumnas =
    termino.length > 0 && checkpointsCoincidentes.length > 0;
  const asistentesVisibles = filtrarFilas
    ? asistentesCoincidentes
    : evento.asistentes;
  const checkpointsVisibles = filtrarColumnas
    ? checkpointsCoincidentes
    : evento.checkpoints;
  const sinCoincidencias =
    termino.length > 0 &&
    asistentesCoincidentes.length === 0 &&
    checkpointsCoincidentes.length === 0;
  const hayColumnasOcultas =
    checkpointsVisibles.length < evento.checkpoints.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Asistentes</h4>
            <p className="text-xs text-muted-foreground">
              Nombres y estado de registro por checkpoint.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {asistentesVisibles.length}{" "}
            {asistentesVisibles.length === 1 ? "asistente" : "asistentes"}
          </span>
        </div>

        <BuscadorVista
          valor={busqueda}
          onChange={onBusquedaChange}
          etiqueta={`Buscar asistentes o habitaciones de ${evento.nombre}`}
          placeholder="Buscar asistente o habitación"
        />
      </div>

      {evento.asistentes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Users className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium">Sin asistentes vigentes</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Este evento aún no tiene inscripciones vigentes para mostrar.
          </p>
        </div>
      ) : sinCoincidencias ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <SearchX className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium">Sin resultados</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Ningún asistente ni habitación coincide con «{busqueda}».
          </p>
        </div>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-lg border">
          <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Asistentes del evento {evento.nombre} y su registro por checkpoint
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 min-w-[16rem] whitespace-nowrap border-b bg-muted px-3 py-2 text-left font-medium"
                >
                  Nombre
                </th>
                {checkpointsVisibles.map((checkpoint) => (
                  <th
                    key={checkpoint.id}
                    scope="col"
                    title={checkpoint.nombre}
                    className="sticky top-0 z-20 min-w-[10rem] whitespace-nowrap border-b bg-muted px-3 py-2 text-center font-medium"
                  >
                    {etiquetaCortaCheckpoint(checkpoint)}
                  </th>
                ))}
                <th
                  scope="col"
                  className="sticky right-0 top-0 z-30 min-w-[9rem] whitespace-nowrap border-b bg-muted px-3 py-2 text-center font-medium"
                >
                  Completados
                  {hayColumnasOcultas ? (
                    <span
                      aria-hidden="true"
                      className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-muted-foreground"
                    >
                      {textoColumnasVisibles(checkpointsVisibles.length)}
                    </span>
                  ) : null}
                </th>
              </tr>
            </thead>
            <tbody>
              {asistentesVisibles.map((asistente) => {
                // Los checkpoints de habitación solo aplican a sus ocupantes.
                // Los demás no cuentan ni como completados ni en el denominador,
                // con independencia de qué columnas estén visibles.
                const aplicables = evento.checkpoints.filter(
                  (checkpoint) =>
                    checkpoint.habitacion?.asignados.includes(asistente.id) ??
                    true
                );
                const completados = aplicables.filter(
                  (checkpoint) =>
                    asistente.registradoPorCheckpoint[checkpoint.id] === true
                ).length;

                return (
                  <tr key={asistente.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 min-w-[16rem] border-b bg-card px-3 py-2 text-left font-medium text-foreground"
                    >
                      {asistente.nombreCompleto}
                    </th>
                    {checkpointsVisibles.map((checkpoint) => {
                      const aplicable =
                        checkpoint.habitacion?.asignados.includes(
                          asistente.id
                        ) ?? true;

                      return (
                        <td
                          key={checkpoint.id}
                          className="min-w-[10rem] border-b px-3 py-2 text-center tabular-nums"
                        >
                          {!aplicable ? (
                            <span
                              className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                              aria-label={`No aplicable en ${checkpoint.nombre}`}
                            >
                              N/A
                            </span>
                          ) : asistente.registradoPorCheckpoint[checkpoint.id] ? (
                            <span className="inline-flex items-center rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-medium text-success-foreground">
                              SÍ
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              NO
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 min-w-[9rem] border-b bg-card px-3 py-2 text-center font-medium tabular-nums">
                      {completados}/{aplicables.length}
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
