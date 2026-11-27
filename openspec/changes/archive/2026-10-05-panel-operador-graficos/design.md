# Design

## Context

El panel del Operador (`src/app/operador/panel-operador.tsx`, componente cliente) sondea
`GET /api/operador/dashboard` cada 5 s y recibe `TableroOperador` construido por
`cargarTableroOperador` (`src/lib/operador/tablero.ts`) en un número constante de consultas sin
N+1 (2 consultas hoy: `findMany` de eventos asignados y un `groupBy` de `RegistroControl` por
`checkpointId` — CONTEXT.md §6). `RegistroControl` tiene `metodo` (`AUTOREGISTRO | MANUAL`) y
`timestamp`; `Asistente` tiene `eventoId` desnormalizado. El panel ya tiene un filtro de búsqueda
100 % cliente (`eventosVisibles`). Motivación: proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- Tres visuales por evento con Recharts: donut de cobertura (asistentes distintos registrados /
  total), barras apiladas por checkpoint (autoregistro + manual) frente al total del evento.
- Mantener el número de consultas constante (sin N+1) y el payload de la API aditivo (no romper
  los campos que ya consume el cliente).
- Que los gráficos convivan con el sondeo (sin parpadeo) y con el filtro de búsqueda existente.

**Non-Goals:**
- No hay series temporales (registros por hora) — no fue seleccionada por el usuario.
- No hay cambios de esquema en la BD ni de autenticación.
- No se gráfica la ocupación de cuartos (ya es señal textual en cada tarjeta).
- Recharts se usa solo en el panel del Operador (no se reutiliza en Administrador).

## Decisions

### 1. Recharts 3.10.1 fijada exacta, solo en la ruta del Operador

`npm install recharts@3.10.1 --save-exact`, coherente con la política de versiones exactas del
repo (Auth.js se fija con `--save-exact`). Se importa únicamente en `graficos-panel.tsx`, que vive
dentro del módulo cliente del panel (ya `"use client"`), así que no hay cruce Server/Client ni
necesidad de `dynamic(ssr:false)`. Alternativa considerada y descartada: `chart.js +
react-chartjs-2` (más liviano en bundle), pero el usuario eligió Recharts por integración declarativa
con React y Tailwind.

### 2. La agregación de registros pasa a `groupBy([checkpointId, metodo])`

En vez de añadir una consulta nueva, el `groupBy` existente de `RegistroControl` agrupa por
`checkpointId` **y** `metodo`. De cada grupo se obtiene `metodo` y `_count`; con un único recorrido
se deriva:
- `registros` (total = `AUTOREGISTRO` + `MANUAL`) — conserva exactamente el valor de hoy;
- `manuales` (conteo de `metodo = MANUAL`).
`autoregistros` se deriva en el cliente como `registros - manuales`, manteniendo el contrato mínimo.

### 3. Cobertura por evento sin N+1

La cobertura es "asistentes distintos con ≥1 registro en cualquier checkpoint del evento". Se hace
en dos consultas constantes (mismo patrón del `groupBy` actual):
1. `registroControl.groupBy({ by: ["asistenteId"], where: { checkpoint: { eventoId: { in } } } })`
   → IDs distintos que ya registraron en los eventos del Operador.
2. `asistente.findMany({ where: { id: { in: ids } }, select: { id, eventoId } })`
   → mapear cada `asistenteId` a su evento (campo desnormalizado, una sola consulta).

Se cuenta cuántos caen en cada `eventoId` → `asistentesRegistrados`. Total de consultas: 4
constantes (findMany eventos + groupBy [checkpointId, metodo] + groupBy asistenteId + findMany
asistentes), sin recorrer checkpoint por checkpoint. Alternativa descartada: una sola
`$queryRaw` con `COUNT(DISTINCT)` y JOIN — funciona, pero rompe la consistencia del resto del
módulo (todo Prisma) sin ganancia real en este volumen.

### 4. `graficos-panel.tsx`: un componente por evento, datos ya filtrados

`GraficosEvento({ evento })` recibe un `EventoTablero` — que ya es **el evento filtrado** cuando el
operador usa la búsqueda, porque se renderiza dentro del `map` de `eventosVisibles`:
- **Donut** de cobertura desde `evento.asistentesRegistrados / evento.totalAsistentes`, con el
  texto "X de Y" centrado. No depende del filtro (el evento filtrado conserva esos totales).
- **Barras horizontales apiladas** por checkpoint desde `evento.checkpoints` (los visibles por
  construcción) con dos `Bar` (`autoregistros`, `manuales`, `stackId`) y una `ReferenceLine` en
  `totalAsistentes` para leer el progreso frente al total. `Legend` + `Tooltip`.

**Orientación horizontal (`layout="vertical"`, nombres en el eje Y)** — decisión tomada con el
usuario: con muchas habitaciones/checkpoints las etiquetas verticales del eje X se comprimían y
chocaban (se saturaba ~20+ checkpoints). Con el eje Y los nombres nunca chocan, cada barra reserva
~44 px de alto y, cuando la lista es larga, el contenedor (`max-h-[340px] overflow-y-auto`) hace
scroll vertical en vez de comprimir. Alternativa descartada: scroll horizontal con ancho fijo por
barra (requiere ancho mínimo y mantiene etiquetas en el eje X); "top N + aviso" (cambiaría la spec
porque las barras deben cubrir todos los checkpoints visibles).

- `isAnimationActive={false}` en `Pie`/`Bar` y `ResponsiveContainer` dentro de un contenedor con
  altura fija/calculada para que el re-render del sondeo de 5 s no parpadee ni mida mal.
- Casos extremo: `totalAsistentes === 0` → se renderiza el texto "0 / 0" (nunca un `Pie` con
  valores 0/0); `checkpoints.length === 0` → no se renderizan barras.

### 5. Ubicación en el panel

Se inserta dentro del `<section>` de cada evento (junto a las tarjetas del `map` de
`eventosVisibles`), entre el `<header>` y la lista de tarjetas. Así, cuando el filtro oculta la
sección completa, sus gráficos se ocultan también — comportamiento consistente con el requisito de
filtro vigente.

## Risks / Trade-offs

- **[Bundle crece]** Recharts añade peso al JS del cliente (~90–130 kB gz según gráficos usados),
  solo en la ruta `/operador`. → Aceptada por el usuario al elegir Recharts; mitigación: importar
  solo los componentes usados (tree-shaking) y no duplicar el patrón en otras rutas.
- **[N+1 por refactor del groupBy]** Cambiar la agregación central podría romper `registros` si la
  derivación `auto + manual` se equivoca. → Mitigación: verificación explícita en dev de que los
  totales por checkpoint no cambian (Día de sol: Habitación 601 = 2), y `manuales + autoregistros
  === registros` siempre.
- **[Parpadeo/medición con el sondeo]** Recharts anima por defecto y `ResponsiveContainer` mide al
  montar; con re-renders de 5 s puede oscilar. → `isAnimationActive={false}` y altura fija.
- **[División entre cero en cobertura]** Evento sin asistentes vigentes. → Guard del donut
  ("0 / 0").
- **[Payload aditivo]** Etiquetar los campos nuevos sin tocar los existentes para no romper el
  `tableroInicial` serializado ni las tarjetas actuales.

## Migration Plan

1. Instalar dependencia y dejar `tsc` verde.
2. Cambiar `tablero.ts` (agregaciones + tipos), verificar la API en dev (payload antiguo intacto +
  campos nuevos).
3. Crear `graficos-panel.tsx` y montarlo en el panel; verificar visual y sondeo en dev.
4. Flujo de cierre habitual: PR → merge → `openspec archive` → commit de docs → limpiar branch.
   Recharts queda en `package.json` (excepción aprobada). Rollback: revertir el/los commits del
   change (código + dependencia) — no hay estado migratorio en BD.

## Open Questions

Ninguna. La elección de visuales y librería fue resuelta con el usuario antes de proponer.