"use client";

// Gráficos del panel del Operador (Recharts — excepción aprobada a la regla
// de dependencias, ver openspec/changes/…/2026-10-05-panel-operador-graficos).
// Viven dentro del módulo cliente del panel (ya "use client"), alimentados por
// el mismo sondeo de 5 s. Sin animación y con altura fija para que el
// re-render periódico no parpadee.

import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { coincideCheckpoint } from "@/lib/operador/busqueda";
import type { EventoTablero } from "@/lib/operador/tablero";
import { BuscadorVista } from "./buscador-vista";

// Paleta del tema (globals.css): verde de acción para el autoregistro y
// muted-foreground para lo manual y lo pendiente. Así ambos temas conservan
// contraste y la identidad SENA sin colores hardcodeados.
const COLOR_AUTOREGISTRO = "var(--chart-1)";
const COLOR_MANUAL = "var(--muted-foreground)";
const COLOR_PENDIENTE = "var(--muted-foreground)";

const ESTILO_TOOLTIP: CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)",
};

const ESTILO_TEXTO_TOOLTIP: CSSProperties = {
  color: "var(--popover-foreground)",
};

// Nombres largos en el eje Y: se abrevian con puntos suspensivos para no
// invadir las barras. El nombre completo sigue disponible en el tooltip y en
// la tabla accesible que acompaña al gráfico.
const MAX_CARACTERES_ETIQUETA = 18;

function abreviar(texto: string): string {
  return texto.length > MAX_CARACTERES_ETIQUETA
    ? `${texto.slice(0, MAX_CARACTERES_ETIQUETA - 1)}…`
    : texto;
}

// Donut de cobertura: asistentes distintos ya registrados frente al total.
// Con total 0 no se dibuja ningún Pie (evita dividir entre cero); se muestra
// el texto "0 / 0".
function DonutCobertura({ evento }: { evento: EventoTablero }) {
  const { asistentesRegistrados, totalAsistentes } = evento;

  if (totalAsistentes === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm font-medium text-muted-foreground">
        0 / 0
      </div>
    );
  }

  const registrados = Math.min(asistentesRegistrados, totalAsistentes);
  const pendientes = totalAsistentes - registrados;
  const cobertura = Math.round((registrados / totalAsistentes) * 100);
  const datos = [
    { nombre: "Registrados", valor: registrados, color: COLOR_AUTOREGISTRO },
    { nombre: "Pendientes", valor: pendientes, color: COLOR_PENDIENTE },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-40">
        <div className="h-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datos}
                dataKey="valor"
                nameKey="nombre"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {datos.map((dato) => (
                  <Cell key={dato.nombre} fill={dato.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={ESTILO_TOOLTIP}
                labelStyle={ESTILO_TEXTO_TOOLTIP}
                itemStyle={ESTILO_TEXTO_TOOLTIP}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold leading-none tabular-nums">
            {cobertura}%
          </span>
          <span className="mt-1 text-xs text-muted-foreground tabular-nums">
            {registrados} de {totalAsistentes}
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            con registro
          </span>
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>Cobertura de asistencia de {evento.nombre}</caption>
          <thead>
            <tr>
              <th scope="col">Indicador</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Cobertura</th>
              <td>{cobertura}%</td>
            </tr>
            <tr>
              <th scope="row">Asistentes registrados</th>
              <td>{registrados}</td>
            </tr>
            <tr>
              <th scope="row">Asistentes pendientes</th>
              <td>{pendientes}</td>
            </tr>
            <tr>
              <th scope="row">Total de asistentes</th>
              <td>{totalAsistentes}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Barras horizontales apiladas por checkpoint: registros del checkpoint frente
// a su base de destinatarios (asistentes vigentes para checkpoints manuales,
// ocupantes asignados para habitaciones), divididos entre autoregistro (verde)
// y manual (oliva). Un tercer segmento transparente completa hasta la base,
// así cada barra termina en su propio denominador sin una línea global que
// mezcle bases distintas. Orientación horizontal para que los nombres vivan en
// el eje Y (no chocan aunque haya muchas habitaciones). Solo se renderiza si
// al menos un checkpoint (ya filtrado por el panel) existe.
function BarrasPorCheckpoint({ evento }: { evento: EventoTablero }) {
  if (evento.checkpoints.length === 0) return null;

  const datos = evento.checkpoints.map((checkpoint) => ({
    nombre: checkpoint.nombre,
    autoregistros: Math.max(checkpoint.registros - checkpoint.manuales, 0),
    manuales: checkpoint.manuales,
    // Segmento invisible que completa la barra hasta la base real del
    // checkpoint. Mantiene el denominador de cada barra sin distorsionar el
    // desglose de métodos registrados.
    pendientes: Math.max(checkpoint.baseDestinatarios - checkpoint.registros, 0),
  }));

  // Altura según la cantidad de checkpoints: cada barra reserva ~44 px para
  // mantenerse legible (etiqueta + barra); el contenedor limita a 340 px y
  // hace scroll vertical cuando la lista es larga (eventos con muchas
  // habitaciones), en vez de comprimir las barras.
  const altura = Math.max(datos.length * 44 + 48, 176);

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[340px] overflow-y-auto" aria-hidden="true">
        <div style={{ height: altura }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={datos}
              layout="vertical"
              margin={{ top: 24, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                width={132}
                interval={0}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickFormatter={(valor) => abreviar(String(valor))}
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={ESTILO_TOOLTIP}
                labelStyle={ESTILO_TEXTO_TOOLTIP}
                itemStyle={ESTILO_TEXTO_TOOLTIP}
                cursor={{ fill: "var(--muted)" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                formatter={(valor) => (
                  <span className="text-muted-foreground">{valor}</span>
                )}
              />
              <Bar
                dataKey="autoregistros"
                name="Autoregistro"
                stackId="total"
                fill={COLOR_AUTOREGISTRO}
                isAnimationActive={false}
                barSize={18}
              />
              <Bar
                dataKey="manuales"
                name="Manual"
                stackId="total"
                fill={COLOR_MANUAL}
                isAnimationActive={false}
                barSize={18}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="pendientes"
                name="Pendiente"
                stackId="total"
                fill="transparent"
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>Registros por checkpoint de {evento.nombre}</caption>
          <thead>
            <tr>
              <th scope="col">Checkpoint</th>
              <th scope="col">Autoregistro</th>
              <th scope="col">Manual</th>
              <th scope="col">Total</th>
              <th scope="col">Base</th>
            </tr>
          </thead>
          <tbody>
            {evento.checkpoints.map((checkpoint) => (
              <tr key={checkpoint.id}>
                <th scope="row">{checkpoint.nombre}</th>
                <td>
                  {Math.max(checkpoint.registros - checkpoint.manuales, 0)}
                </td>
                <td>{checkpoint.manuales}</td>
                <td>{checkpoint.registros}</td>
                <td>{checkpoint.baseDestinatarios}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Encabezado de estadísticas de un evento del panel: donut de cobertura
// (independiente del buscador porque usa los totales del evento) y barras por
// checkpoint filtradas por el buscador local de esta vista.
export function GraficosEvento({
  evento,
  busqueda,
  onBusquedaChange,
}: {
  evento: EventoTablero;
  busqueda: string;
  onBusquedaChange: (valor: string) => void;
}) {
  const idBase = `graficos-${evento.id}`;
  const checkpointsVisibles = evento.checkpoints.filter((checkpoint) =>
    coincideCheckpoint(checkpoint, busqueda)
  );
  const sinCoincidencias =
    busqueda.trim().length > 0 && checkpointsVisibles.length === 0;
  const eventoConBarras = {
    ...evento,
    checkpoints: checkpointsVisibles,
  };

  return (
    <div className="flex flex-col gap-3">
      <BuscadorVista
        valor={busqueda}
        onChange={onBusquedaChange}
        etiqueta={`Buscar checkpoints en Cobertura de ${evento.nombre}`}
        placeholder="Buscar checkpoint en Cobertura"
      />

      <div className="grid gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <section
          aria-labelledby={`${idBase}-cobertura`}
          className="min-w-0 rounded-lg border bg-background/40 p-3"
        >
          <h4
            id={`${idBase}-cobertura`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Cobertura de asistencia
          </h4>
          <DonutCobertura evento={evento} />
        </section>

        {evento.checkpoints.length > 0 ? (
          <section
            aria-labelledby={`${idBase}-registros`}
            className="min-w-0 rounded-lg border bg-background/40 p-3"
          >
            <h4
              id={`${idBase}-registros`}
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Registros por checkpoint
            </h4>
            {sinCoincidencias ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ningún checkpoint coincide con «{busqueda}».
              </p>
            ) : (
              <BarrasPorCheckpoint evento={eventoConBarras} />
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
