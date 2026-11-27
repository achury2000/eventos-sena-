# Proposal

## Why

El tablero del Operador muestra hoy por cada checkpoint `registrados / total de asistentes del evento` (ej. "Alojamiento · 2/5 registrados"). Cuando el checkpoint es una habitación, ese denominador es el total de asistentes del evento, no el cupo del cuarto: es el progreso de asistencia, igual que en cualquier checkpoint. Pero el Operador del día del evento también necesita saber **qué tan lleno está el cuarto** — cuántas personas asignadas a esa habitación ya llegaron frente a cuántas caben — una señal distinta que hoy solo existe en el panel del Administrador. Mostrarla en el panel del Operador cierra esa brecha de contexto operativo sin costo: la ocupación (asignados/capacidad) ya vive en el modelo (`Habitacion.capacidad` + `AsistenteHabitacion`), conectado al checkpoint vía `Checkpoint.habitacionId`.

## What Changes

- El tablero del Operador muestra, **para los checkpoints respaldados por una habitación** (tipo `ALOJAMIENTO` con `habitacionId`), la **ocupación del cuarto**: asistentes asignados frente a la capacidad (ej. "Ocupación del cuarto: 2/2"), además del conteo de registrados existente.
- El `/5` de "registrados" **sigue siendo el total de asistentes vigentes del evento** (no cambia su semántica): el cupo del cuarto es un límite de *asignación de alojamiento*, no un límite de registros de asistencia. Ocupación y asistencia son dos señales distintas que el panel muestra juntas.
- **Sin cambios de schema ni dependencias**: se lee `capacidad` y el conteo de `AsistenteHabitacion` de la relación `Checkpoint.habitacionId` ya existente, dentro de la misma consulta del tablero (sin N+1).
- Los checkpoints manuales y el resto del panel no cambian.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `panel-operador`: para cada checkpoint respaldado por una habitación, el panel y la API de sondeo que lo alimenta exponen la ocupación del cuarto (asignados/capacidad) y la muestran junto al conteo de asistencia.

## Impact

- **Server**: `src/lib/operador/tablero.ts` — incluir en el `select` de checkpoints la relación `habitacion` con `capacidad` y `_count.asistentes`, y exponer en `CheckpointTablero` un campo opcional `habitacion: { capacidad, ocupados }`.  Sigue siendo una sola consulta (regla de CONTEXT.md §6).
- **UI**: `src/app/operador/panel-operador.tsx` — cuando `checkpoint.habitacion` existe, mostrar la ocupación bajo la línea de "registrados" (mismo patrón de texto secundario del panel).
- **API**: `src/app/api/operador/dashboard/route.ts` — sin cambios de código; el tipo `TableroOperador` ya incluye el campo nuevo.
- **Intactos**: schema y migraciones, Server Actions, vistas de Administrador (la ocupación ya se mostraba ahí), autoregistro y registro manual.