"use client";

import { useEffect, useRef, useState } from "react";
import {
  BedDouble,
  Bus,
  CalendarDays,
  ClipboardList,
  Gauge,
  MapPin,
  Radio,
  UserRound,
  Users,
  Utensils,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { BarraProgreso } from "@/components/shared/barra-progreso";
import { ETIQUETA_TIPO_CHECKPOINT } from "@/lib/labels";
import { coincideCheckpoint } from "@/lib/operador/busqueda";
import type { EventoTablero, TableroOperador } from "@/lib/operador/tablero";
import { BuscadorVista } from "./buscador-vista";
import { BotonToggleCheckpoint } from "./boton-toggle-checkpoint";
import { FormRegistroManual } from "./form-registro-manual";
import { GraficosEvento } from "./graficos-panel";
import { TablaAsistentes } from "./tabla-asistentes";
import { TablaRegistros } from "./tabla-registros";

// Sondeo del tablero (CONTEXT.md §6): intervalo dentro del rango 5–10 s y sin
// solicitudes solapadas -- si una respuesta tarda, el siguiente tick se omite.
const INTERVALO_SONDEO_MS = 5000;

// Icono por categoría: refuerza la lectura rápida de cada checkpoint sin
// depender solo del texto del tipo.
const ICONO_CHECKPOINT: Record<string, LucideIcon> = {
  COMIDA: Utensils,
  TRANSPORTE: Bus,
  ALOJAMIENTO: BedDouble,
  OTRO: ClipboardList,
};

// Los cuatro cuadros originales de cada evento pasan a ser botones de ese
// evento. El estado es por evento para que cambiar uno no afecte a los demás.
const VISTAS_EVENTO = [
  { id: "asistentes", etiqueta: "Asistentes", icono: Users },
  { id: "cobertura", etiqueta: "Cobertura", icono: Gauge },
  { id: "checkpointsActivos", etiqueta: "Checkpoints activos", icono: Radio },
  { id: "registros", etiqueta: "Registros", icono: ClipboardList },
] as const;

type VistaEvento = (typeof VISTAS_EVENTO)[number]["id"];

// Indicadores derivados del DTO que ya entrega el sondeo. No cambian ninguna
// consulta: solo resumen lo que el panel ya tiene en memoria.
function resumirEvento(evento: EventoTablero) {
  const registrados = Math.min(
    evento.asistentesRegistrados,
    evento.totalAsistentes
  );
  return {
    registrados,
    cobertura:
      evento.totalAsistentes > 0
        ? Math.round((registrados / evento.totalAsistentes) * 100)
        : 0,
    activos: evento.checkpoints.filter((checkpoint) => checkpoint.activo).length,
    registros: evento.checkpoints.reduce(
      (total, checkpoint) => total + checkpoint.registros,
      0
    ),
  };
}

export function PanelOperador({
  tableroInicial,
}: {
  tableroInicial: TableroOperador;
}) {
  const [tablero, setTablero] = useState(tableroInicial);
  const [errorSondeo, setErrorSondeo] = useState(false);
  // Un estado por evento: cambiar la vista de uno no afecta a los demás y
  // sobrevive a los setTablero del sondeo. Cada evento abre en Cobertura.
  const [vistasPorEvento, setVistasPorEvento] = useState<
    Record<string, VistaEvento>
  >({});
  // Cada vista recuerda su propio texto, sin cruzar eventos ni vistas. Vive
  // fuera del DTO para que el sondeo no lo reinicie.
  const [busquedasPorEvento, setBusquedasPorEvento] = useState<
    Record<string, Partial<Record<VistaEvento, string>>>
  >({});
  const enCurso = useRef(false);

  function vistaDe(eventoId: string): VistaEvento {
    return vistasPorEvento[eventoId] ?? "cobertura";
  }

  function seleccionarVista(eventoId: string, vista: VistaEvento) {
    setVistasPorEvento((actual) => ({ ...actual, [eventoId]: vista }));
  }

  function busquedaDe(eventoId: string, vista: VistaEvento): string {
    return busquedasPorEvento[eventoId]?.[vista] ?? "";
  }

  function actualizarBusqueda(eventoId: string, vista: VistaEvento, valor: string) {
    setBusquedasPorEvento((actual) => ({
      ...actual,
      [eventoId]: { ...actual[eventoId], [vista]: valor },
    }));
  }

  useEffect(() => {
    let activo = true;

    async function refrescar() {
      if (enCurso.current) return;
      enCurso.current = true;
      try {
        const respuesta = await fetch("/api/operador/dashboard", {
          cache: "no-store",
        });
        if (!respuesta.ok) throw new Error("Respuesta no válida");
        const datos = (await respuesta.json()) as TableroOperador;
        if (activo) {
          setTablero(datos);
          setErrorSondeo(false);
        }
      } catch {
        if (activo) setErrorSondeo(true);
      } finally {
        enCurso.current = false;
      }
    }

    const id = setInterval(refrescar, INTERVALO_SONDEO_MS);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, []);

  const avisoSondeo = errorSondeo ? (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        No se pudo actualizar el tablero. Se reintentará automáticamente.
      </span>
    </p>
  ) : null;

  const encabezado = (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Control de asistencia
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Sigue la cobertura de tus eventos, administra los checkpoints y
          registra la asistencia de los aprendices.
        </p>
      </div>
      <span
        className={cn(
          "inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
          errorSondeo
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-success/40 bg-success/10 text-success-foreground"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            errorSondeo ? "bg-destructive" : "bg-success"
          )}
        />
        {errorSondeo
          ? "Sin conexión · reintentando"
          : "En vivo · actualización cada 5 s"}
      </span>
    </header>
  );

  if (tablero.eventos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {encabezado}
        {avisoSondeo}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium">Sin eventos asignados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contacta al administrador para que te asigne un evento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {encabezado}
      {avisoSondeo}

      <div id="lista-eventos-operador" className="flex flex-col gap-6">
        {tablero.eventos.map((evento) => {
            const resumen = resumirEvento(evento);
            const vista = vistaDe(evento.id);
            const busquedaCobertura = busquedaDe(evento.id, "cobertura");
            const busquedaAsistentes = busquedaDe(evento.id, "asistentes");
            const busquedaCheckpoints = busquedaDe(evento.id, "checkpointsActivos");
            const busquedaRegistros = busquedaDe(evento.id, "registros");
            const checkpointsFiltrados = evento.checkpoints.filter((checkpoint) => coincideCheckpoint(checkpoint, busquedaCheckpoints));
            const sinCoincidenciasCheckpoints = busquedaCheckpoints.trim().length > 0 && checkpointsFiltrados.length === 0;

            return (
              <section
                key={evento.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <header className="flex flex-col gap-4 border-b bg-muted/30 p-4 sm:p-5">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                      {evento.nombre}
                    </h3>
                    <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 break-words">
                        {evento.lugar}
                      </span>
                    </p>
                  </div>

                  <div
                    role="group"
                    aria-label={`Vistas de ${evento.nombre}`}
                    className="grid grid-cols-2 gap-2 lg:grid-cols-4"
                  >
                    {VISTAS_EVENTO.map(({ id, etiqueta, icono: Icono }) => {
                      const activa = vista === id;
                      const datos = {
                        asistentes: {
                          valor: String(evento.totalAsistentes),
                          detalle: "Inscritos vigentes",
                        },
                        cobertura: {
                          valor: `${resumen.cobertura}%`,
                          detalle: `${resumen.registrados} de ${evento.totalAsistentes} con registro`,
                        },
                        checkpointsActivos: {
                          valor: `${resumen.activos}/${evento.checkpoints.length}`,
                          detalle: "Disponibles para registrar",
                        },
                        registros: {
                          valor: String(resumen.registros),
                          detalle: "En todos los checkpoints",
                        },
                      }[id];

                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={activa}
                          onClick={() => seleccionarVista(evento.id, id)}
                          className={cn(
                            "min-w-0 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            activa
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-background/60 hover:bg-muted/60"
                          )}
                        >
                          <span
                            className={cn(
                              "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide",
                              activa ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            <Icono
                              className={cn(
                                "size-3.5 shrink-0",
                                activa ? "text-primary" : "text-muted-foreground"
                              )}
                              aria-hidden="true"
                            />
                            {etiqueta}
                          </span>
                          <span
                            className={cn(
                              "mt-1 block text-lg font-semibold leading-none tabular-nums",
                              activa && "text-primary"
                            )}
                          >
                            {datos.valor}
                          </span>
                          <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                            {datos.detalle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </header>

                <div className="p-4 sm:p-5">
                  {vista === "cobertura" ? (
                    <GraficosEvento
                    evento={evento}
                    busqueda={busquedaCobertura}
                    onBusquedaChange={(valor) => actualizarBusqueda(evento.id, "cobertura", valor)}
                  />
                  ) : null}

                  {vista === "asistentes" ? (
                    <TablaAsistentes
                    evento={evento}
                    busqueda={busquedaAsistentes}
                    onBusquedaChange={(valor) => actualizarBusqueda(evento.id, "asistentes", valor)}
                  />
                  ) : null}

                  {vista === "registros" ? (
                    <TablaRegistros
                    evento={evento}
                    busqueda={busquedaRegistros}
                    onBusquedaChange={(valor) => actualizarBusqueda(evento.id, "registros", valor)}
                  />
                  ) : null}

                  {vista === "checkpointsActivos" ? (
                    <div className="flex flex-col gap-3 border-t pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold">
                          Checkpoints activos
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Estado y avance de cada punto de control.
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                        {busquedaCheckpoints.trim() ? `${checkpointsFiltrados.length} de ${evento.checkpoints.length}` : evento.checkpoints.length}{" "}
                        {evento.checkpoints.length === 1 ? "configurado" : "configurados"}
                      </span>
                    </div>

                    <BuscadorVista
                      valor={busquedaCheckpoints}
                      onChange={(valor) => actualizarBusqueda(evento.id, "checkpointsActivos", valor)}
                      etiqueta={`Buscar checkpoints activos de ${evento.nombre}`}
                      placeholder="Buscar checkpoint activo"
                    />

                    {evento.checkpoints.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Este evento aún no tiene checkpoints.
                      </p>
                    ) : sinCoincidenciasCheckpoints ? (
                      <p className="text-sm text-muted-foreground">
                        Ningún checkpoint coincide con «{busquedaCheckpoints}».
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {checkpointsFiltrados.map((checkpoint) => {
                          const IconoTipo =
                            ICONO_CHECKPOINT[checkpoint.tipo] ??
                            ClipboardList;

                          return (
                            <li
                              key={checkpoint.id}
                              className={cn(
                                "min-w-0 rounded-lg border p-4",
                                checkpoint.activo
                                  ? "bg-background/40"
                                  : "border-dashed bg-muted/20"
                              )}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                  <span
                                    className={cn(
                                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                      checkpoint.activo
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    <IconoTipo
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  </span>

                                  <div className="flex min-w-0 flex-col gap-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h5
                                        title={checkpoint.nombre}
                                        className="min-w-0 max-w-full truncate font-medium"
                                      >
                                        {checkpoint.nombre}
                                      </h5>
                                      <BadgeCheckpoint
                                        activo={checkpoint.activo}
                                      />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-2 py-0.5">
                                        {ETIQUETA_TIPO_CHECKPOINT[
                                          checkpoint.tipo
                                        ] ?? checkpoint.tipo}
                                      </span>
                                      {checkpoint.habitacion ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-2 py-0.5 tabular-nums">
                                          Ocupación{" "}
                                          {checkpoint.habitacion.ocupados}/
                                          {checkpoint.habitacion.capacidad}
                                        </span>
                                      ) : null}
                                      {checkpoint.manuales > 0 ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-2 py-0.5 tabular-nums">
                                          <UserRound
                                            className="size-3"
                                            aria-hidden="true"
                                          />
                                          {checkpoint.manuales}{" "}
                                          {checkpoint.manuales === 1
                                            ? "manual"
                                            : "manuales"}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
                                  <BarraProgreso
                                    valor={checkpoint.registros}
                                    maximo={checkpoint.baseDestinatarios}
                                    etiqueta="Avance"
                                    ariaLabel={`Avance de ${checkpoint.nombre}`}
                                    detalle={`${checkpoint.registros}/${checkpoint.baseDestinatarios} registrados · ${
                                      checkpoint.baseDestinatarios > 0
                                        ? Math.min(
                                            100,
                                            Math.round(
                                              (checkpoint.registros /
                                                checkpoint.baseDestinatarios) *
                                                100
                                            )
                                          )
                                        : 0
                                    }%`}
                                    className="min-w-0 sm:w-52"
                                  />
                                  <BotonToggleCheckpoint
                                    checkpointId={checkpoint.id}
                                    activo={checkpoint.activo}
                                    nombreCheckpoint={checkpoint.nombre}
                                  />
                                </div>
                              </div>

                              <div className="mt-3 border-t pt-3">
                                <FormRegistroManual
                                  checkpointId={checkpoint.id}
                                  nombreCheckpoint={checkpoint.nombre}
                                  activo={checkpoint.activo}
                                  esHabitacion={Boolean(checkpoint.habitacion)}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  ) : null}
                </div>
              </section>
            );
        })}
      </div>
    </div>
  );
}

function BadgeCheckpoint({ activo }: { activo: boolean }) {
  return (
    <span
      className={
        activo
          ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-medium text-success-foreground"
          : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      }
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          activo ? "bg-success" : "bg-muted-foreground"
        }`}
      />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}
