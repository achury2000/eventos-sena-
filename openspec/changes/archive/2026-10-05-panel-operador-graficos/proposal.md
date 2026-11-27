# Proposal

## Why

El panel del Operador hoy muestra los conteos numéricos por tarjeta (registros/total, ocupación
del cuarto), pero no hay una lectura rápida del pulso del evento: cuántos asistentes distintos ya
llegaron (cobertura), cómo va cada checkpoint respecto al total, y cuánta gente requirió apoyo
manual. Con muchos checkpoints por evento, el Operador pierde la visión global y tiene que sumar
mentalmente.

## What Changes

- **Nueva dependencia:** `recharts` (3.10.1, fijada exacta). Es la excepción explícitamente
  aprobada por el usuario a la regla "sin dependencias nuevas" del proyecto: el panel del Operador
  es el único lugar donde se usará.
- **API (`/api/operador/dashboard`) — payload aditivo, sin romper:** `cargarTableroOperador`
  agrega por evento `asistentesRegistrados` (asistentes distintos con ≥1 registro en cualquier
  checkpoint del evento) y por checkpoint `manuales` (registros con `metodo = MANUAL`). Los campos
  existentes (`registros`, `totalAsistentes`, `habitacion`, etc.) no cambian. Se mantiene un número
  constante de consultas sin N+1 (CONTEXT.md §6): el `groupBy` actual de registros pasa a agrupar
  por `[checkpointId, metodo]` (de ahí se deriva el total y el manual) y la cobertura requiere un
  `groupBy` por `asistenteId` + un `findMany` de `Asistente` para mapear cada uno a su evento.
- **Panel del Operador — gráficos en tiempo real por evento:** un **donut de cobertura**
  (asistentes distintos registrados frente al total, ej. "2 de 5") y un **gráfico de barras
  apiladas** por checkpoint que muestra el progreso (registros vs. total de asistentes) dividido en
  segmentos **autoregistro vs manual**. Los gráficos se refrescan con el sondeo de 5 s existente.
- **Convivencia con el filtro de búsqueda:** las barras se calculan sobre el mismo conjunto filtrado
  de checkpoints que las tarjetas (con "60" solo se ve la barra de Habitación 601), y la sección de
  un evento — con sus gráficos — se oculta cuando el filtro no coincide con ningún checkpoint. El
  donut de cobertura depende solo del evento y no del filtro.
- **Estados límite:** evento con 0 asistentes vigentes muestra "0 / 0" sin dividir entre cero;
  evento sin checkpoints no muestra barras.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `panel-operador`: nuevo requisito de gráficos de estadísticas en vivo (cobertura por evento,
  progreso y desglose por método por checkpoint), integrado con el sondeo y con el filtro de
  búsqueda existentes.

## Impact

- **Dependencias:** `package.json` + `package-lock.json` (recharts fijada exacta).
- **Código:**
  - `src/lib/operador/tablero.ts` — tipos (`EventoTablero.asistentesRegistrados`,
    `CheckpointTablero.manuales`) y agregaciones (mismo patrón `groupBy`, número constante de
    consultas, sin N+1).
  - `src/app/operador/panel-operador.tsx` — renderiza el nuevo componente de gráficos dentro de
    cada sección de evento, usando `eventosVisibles` (el mismo array del filtro).
  - `src/app/operador/graficos-panel.tsx` (nuevo, cliente) — componentes Recharts (donut + barras
    apiladas) con estados vacíos.
- **API:** `GET /api/operador/dashboard` sigue siendo `200` y aditivo (campos nuevos); `401/403`
  sin sesión de Operador; sin cambios de esquema en la BD.
- **Sistemas:** sin tocar BD, autenticación, ni la parte de Administrador.