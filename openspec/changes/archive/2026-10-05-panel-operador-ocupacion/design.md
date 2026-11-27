# Design

## Context

Ver `proposal.md` — Why para la motivación.

Estado actual relevante:

- `cargarTableroOperador` (`src/lib/operador/tablero.ts`) hace UN `findMany` de eventos asignados al Operador — con sus checkpoints (`id`, `nombre`, `tipo`, `activo`) y `_count.asistentes` vigentes — más UN `groupBy` de `RegistroControl` por `checkpointId`. Los conteos llegan al panel como `CheckpointTablero.registros` y `EventoTablero.totalAsistentes`.
- `Checkpoint.habitacionId String? @unique` enlaza 1:1 a `Habitacion` (relación `CheckpointHabitacion`, cascade). `Habitacion` tiene `capacidad Int` y `asistentes AsistenteHabitacion[]`; la ocupación es `_count.asistentes` (mismo cálculo que ya usa el admin en `SeccionHabitaciones`, "2 / 2").
- El panel (`src/app/operador/panel-operador.tsx`) muestra por checkpoint: `{ETIQUETA_TIPO_CHECKPOINT[tipo]} · {registros}/{totalAsistentes} registrados` + badge de activo + toggle + registro manual. La línea es una `text-sm text-muted-foreground`.
- El sondeo `GET /api/operador/dashboard` devuelve `TableroOperador` tal cual; cualquier campo nuevo fluye automáticamente al cliente con el mismo JSON.
- DB Postgres 18.4; sin cambios de schema requeridos.

## Goals / Non-Goals

**Goals:**

- Que el Operador vea, en el checkpoint de una habitación, cuántas personas asignadas al cuarto ya hay ("ocupación") frente a su capacidad, en tiempo real junto al conteo de asistencia.
- Mantener el costo de lectura del tablero constante (una sola query + un groupBy, CONTEXT.md §6).

**Non-Goals:**

- No cambiar la semántica de `registrados / totalAsistentes` (sigue siendo progreso de asistencia contra el total de asistentes del evento).
- No validar ni limitar registros por ocupación: el cuarto como checkpoint admite cualquier inscrito del evento, como hoy (restringir a ocupantes sería otro cambio de comportamiento).
- No tocar schema, migraciones, Server Actions, vistas de Administrador, autoregistro ni registro manual.
- No mostrar avisos de "sobrecupo" ni colores de alerta; solo el dato de ocupación.

## Decisions

### 1. El tablero lee la ocupación dentro de la misma consulta (sin N+1)

En el `select` de `checkpoints` de `cargarTableroOperador` se añade:

```ts
habitacion: {
  select: {
    capacidad: true,
    _count: { select: { asistentes: true } },
  },
},
```

`Checkpoint.habitacion` es la relación 1:1 (nombre de campo existente en Prisma). Prisma materializa `_count` dentro del mismo `findMany`; no se agregan queries. `ocupados` es el conteo de `AsistenteHabitacion` de esa habitación — **el mismo número que ve el Administrador** en la sección de Habitaciones.

### 2. Exponer un campo opcional en `CheckpointTablero`

```ts
export interface CheckpointTablero {
  id: string;
  nombre: string;
  tipo: TipoCheckpoint;
  activo: boolean;
  registros: number;
  // Solo para checkpoints respaldados por una habitación (habitacionId != null):
  habitacion?: { capacidad: number; ocupados: number };
}
```

En el mapeo, `habitacion: checkpoint.habitacion ? { capacidad, ocupados: _count.asistentes } : undefined`. Los checkpoints manuales no llevan la clave (`undefined`), así que el panel no dibuja nada extra para ellos. El JSON del sondeo la incluye cuando aplica, sin cambios en la ruta.

### 3. UI: línea secundaria solo para checkpoints de habitación

En `panel-operador.tsx`, bajo la línea existente de `registrados`, cuando `checkpoint.habitacion` existe:

```
Ocupación del cuarto: {ocupados}/{capacidad}
```

Mismo estilo (`text-sm text-muted-foreground`). Se mantienen intactas la línea de "registrados", el badge de activo, el toggle y el registro manual.

### 4. Sin cambios de schema, migración ni dependencias

La ocupación (asignados/capacidad) ya existe en el modelo y ya se muestra en el admin. Este cambio solo la proyecta en la consulta del tablero. `_count.asistentes` sobre `Habitacion` cuenta filas de `AsistenteHabitacion`, que por construcción pertenecen al mismo evento de la habitación (la asignación la hace el admin dentro del evento).

## Risks / Trade-offs

- [El dato de ocupación puede diferir del conteo de registrados (2 personas asignadas, 5 registradas)] → Es intencional: son dos señales (asignación de alojamiento vs. asistencia registrada); se muestran juntas pero separadas para no confundirlas.
- [Un cuarto con capacidad menor que el total de asistentes ya no genera la pregunta "¿por qué X/5?"] → Justamente el objetivo: el panel aclara que el 5 es del evento y el cupo del cuarto es otro número, visible.
- [Costo de la query apenas mayor (relación 1:1 + `_count`)] → Insignificante frente al `_count` de asistentes por evento ya existente; sigue siendo una sola consulta.
- [Si `habitacionId` quedara huérfano (estado legacy), `habitacion` viene `null`] → El campo queda `undefined` y el panel se comporta como hoy; defensivo por diseño.

## Migration Plan

No aplica: sin cambios de schema ni de datos.