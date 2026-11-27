# Proposal

## Why

Al asignar asistentes a una habitación no hay ningún QR: las habitaciones de hotel son puntos de control reales del evento (la llegada de cada persona a su cuarto es un registro operativo), pero hoy no pueden funcionar como tal. Convertir cada habitación en un checkpoint del evento cierra esa brecha: cada cuarto tendrá su propio QR de estación, y la llegada se registrará con el mismo flujo de autoregistro por documento que ya usan los checkpoints, sin duplicar código ni conceptos.

## What Changes

- Cada habitación pasa a **ser un checkpoint del evento**: se auto-provisiona un `Checkpoint` por cuarto con `tipo = ALOJAMIENTO`, `activo = true` y un `codigoQr` de estación único (1:1 con la habitación).
- El detalle del evento (`/admin/eventos/[id]`) muestra en la sección de Habitaciones un **QR por cuarto** (imagen + enlace copiable) que codifica `/checkpoint/{codigoQr}` — el mismo patrón de QR ya usado para checkpoints y para el enlace de inscripción.
- El **ciclo de vida se sincroniza automáticamente**: crear una habitación crea su checkpoint; editarla actualiza el nombre del checkpoint ("Habitación {identificador}"); eliminarla elimina el checkpoint y sus registros (cascade).
- Los **checkpoints de habitación se gestionan solo desde la sección Habitaciones**: quedan excluidos del listado de gestión manual de checkpoints, para que no puedan editarse o borrarse por separado y desincronizarse del cuarto.
- **Sin cambios en los flujos existentes**: al ser checkpoints reales (misma tabla `Checkpoint`/`RegistroControl`), el autoregistro por QR, el registro manual y el tablero del Operador los absorben automáticamente — una llegada a habitación aparece en los conteos del Operador y no puede duplicarse por la restricción única `(asistenteId, checkpointId)`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `admin/habitaciones`: cada habitación se comporta como checkpoint del evento (QR de estación visible y copiable en el detalle, auto-provisionamiento y sincronización del checkpoint con el ciclo de vida del cuarto).
- `admin/checkpoints`: el listado y la gestión manual de checkpoints excluyen los checkpoints de habitación (gestionados desde la sección Habitaciones), evitando gestión dual y estados inconsistentes.

## Impact

- **Schema (Prisma)**: `Habitacion.codigoQr String @unique @default(uuid())`; `Checkpoint.habitacionId String? @unique` con relación 1:1 a `Habitacion` y `onDelete: Cascade`. Requiere migración con backfill: asignar `codigoQr` a las habitaciones existentes y crear su checkpoint (tipo `ALOJAMIENTO`, activo).
- **Server Actions**: `src/lib/actions/admin/habitaciones.ts` — crear/editar/eliminar habitación sincronizan el checkpoint asociado en una transacción.
- **UI Admin**: `src/app/admin/eventos/[id]/page.tsx` (query de habitaciones incluye el checkpoint; la tabla de checkpoints filtra `habitacionId = null`; genera las imágenes QR por cuarto) y `src/app/admin/eventos/[id]/seccion-habitaciones.tsx` (columna QR con `Ver QR` y copiar, reutilizando el patrón de `boton-copiar.tsx`).
- **Sin dependencias nuevas**: se reutiliza la librería `qrcode` y el copiado al portapapeles ya existentes.
- **Intactos**: página pública `/checkpoint/[token]`, endpoint `POST /api/checkpoints/[token]/registro`, tablero del Operador y registro manual — no requieren cambios.