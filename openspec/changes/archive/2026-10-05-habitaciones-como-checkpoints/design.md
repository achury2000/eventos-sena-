# Design

## Context

Ver `proposal.md` — Why para la motivación.

Estado actual relevante:

- `Checkpoint` ya tiene `codigoQr String @unique @default(uuid())`, `tipo` (enum con `ALOJAMIENTO`), `activo` (creado `false`, lo activa el Operador) y relación 1:N con `RegistroControl` (cascade en borrado).
- `Habitacion` está acoplada solo a `Evento` y `AsistenteHabitacion`; no tiene token ni QR, y `RegistroControl` exige `checkpointId` NOT NULL.
- El flujo público `/checkpoint/[token]` (autoregistro por documento), la API `POST /api/checkpoints/[token]/registro`, el tablero del Operador y el registro manual son **genéricos sobre `Checkpoint`**: no filtran por tipo ni por origen, así que una habitación expuesta como checkpoint se integra sin tocarlos.
- El detalle del evento (`src/app/admin/eventos/[id]/page.tsx`) ya genera imágenes QR server-side con la librería `qrcode` y reutiliza `BotonCopiar` (`navigator.clipboard`), y la sección de checkpoints usa el patrón `<details> Ver QR </details>`.
- DB: Postgres 18.4 (Docker) → `gen_random_uuid()` nativo disponible para backfills en SQL de migración.
- El dev DB tiene habitaciones existentes (ej. cuarto 601), que deben quedar con QR y checkpoint tras la migración.

## Goals / Non-Goals

**Goals:**

- Modelar "habitación = checkpoint del evento" con una relación 1:1 y un QR de estación por cuarto, reutilizando íntegramente el flujo existente de checkpoints (autoregistro, registro manual, tablero, reporte).
- Mantener un único lugar de gestión: la sección Habitaciones crea/edita/elimina el checkpoint del cuarto automáticamente.
- Migración segura de los datos existentes (habitaciones actuales con QR y checkpoint).

**Non-Goals:**

- No restringir el registro de llegada a los ocupantes del cuarto: cualquier inscrito en el evento puede registrarse en el checkpoint del cuarto, igual que en cualquier checkpoint (puede ajustarse a futuro como cambio aparte).
- No crear ni modificar rutas públicas, endpoints de registro, tablero del Operador ni reportes: funcionan sin cambios porque la habitación pasa a ser un `Checkpoint` real.
- No cambiar la creación/edición manual de checkpoints (nombre/tipo/`activo`/`codigoQr` no editable), ni el flujo de activación por el Operador.

## Decisions

### 1. Habitación = `Checkpoint` real (relación 1:1 opcional), no un registro paralelo

Se añade `Habitacion.codigoQr String @unique @default(uuid())` y `Checkpoint.habitacionId String? @unique` (FK a `habitaciones.id`, `onDelete: Cascade`). Cada cuarto tiene SU checkpoint (`tipo = ALOJAMIENTO`), cuyo `codigoQr` es el QR de estación del cuarto.

- **Por qué**: al ser filas reales de `Checkpoint`/`RegistroControl`, el autoregistro, el tablero del Operador (que agrega por `checkpointId`), el registro manual y el reporte los absorben con **cero cambios de código**. El QR del cuarto apunta a la página `/checkpoint/[token]` ya existente.
- **Alternativa descartada**: `RegistroControl.habitacionId` opcional + ruta `/habitacion/[token]` propia — duplicaría la semántica de registro, exigiría cambios en tablero/reporte para sumar los conteos y una nueva ruta pública; el usuario eligió "como checkpoint del evento".

### 2. Auto-provisionamiento y sincronización en las Server Actions de habitaciones

`src/lib/actions/admin/habitaciones.ts`:

- `crearHabitacion` → `prisma.habitacion.create` con el checkpoint anidado (`tipo: "ALOJAMIENTO"`, `activo: true`; `nombre` se deriva del identificador). Una sola escritura transaccional.
- `editarHabitacion` → además de actualizar el cuarto, sincroniza el nombre del checkpoint con `checkpoint.updateMany({ where: { habitacionId }, data: { nombre: "Habitación {identificador}" } })` envuelto en `$transaction`; `updateMany` es un no-op si la fila no existiera (defensivo ante estados legacy).
- `eliminarHabitacion` → no requiere lógica extra: el `onDelete: Cascade` de `Checkpoint.habitacionId` elimina el checkpoint y, por el cascade existente de `RegistroControl`, sus registros. La acción ya bloquea eliminar cuartos con ocupantes.

El Administrator nunca gestiona el checkpoint del cuarto por separado (una sola fuente de verdad).

### 3. `activo = true` por defecto en los checkpoints de habitación

Contrario al checkpoint manual (creado inactivo, lo activa el Operador el día del evento), el checkpoint de un cuarto se crea activo: un cuarto existente es un punto de control real durante toda la estadía, y exigir activación manual por cuarto rompería el QR impreso recién creado. El Operador conserva el toggle del panel por si necesita desactivarlo puntualmente.

### 4. Los checkpoints de habitación quedan fuera de la sección manual de checkpoints

La consulta del detalle (`page.tsx`) filtra la lista de checkpoints gestionables con `where: { habitacionId: null }`. Si aparecieran en esa tabla, el Administrador podría editar su nombre (desincronizándolo del cuarto) o eliminarlos (dejando el cuarto sin QR). Los cuartos muestran su QR en la sección Habitaciones.

- **Consecuencia**: el tablero del Operador y el reporte SÍ los incluyen (lo deseado), porque esas consultas no filtran; solo la gestión manual los excluye.

### 5. QR por cuarto en la sección Habitaciones, con el patrón existente

`page.tsx` incluye en la query de habitaciones `checkpoint: { select: { codigoQr: true } }` y calcula `qrUrl = {urlBase}/checkpoint/{codigoQr}` + `qrDataUrl` con `QRCode.toDataURL` (defensivo: si un cuarto no tuviera checkpoint, no se genera QR). `SeccionHabitaciones` agrega una columna "QR" con `<details> Ver QR </details>` (imagen 192 px, enlace) y `BotonCopiar` para copiar la URL — mismo patrón visual que checkpoints y enlace de inscripción. Se extiende el tipo `HabitacionConOcupantes` con `checkpoint.codigoQr`, `qrUrl` y `qrDataUrl`.

### 6. Backfill en la migración (no en código)

Se usa `prisma migrate dev --create-only` para generar el SQL y se edita a mano antes de aplicarlo: asignar `codigoQr = gen_random_uuid()` a las habitaciones existentes (columna añadida NULL → backfill → `SET NOT NULL` + índice único) e insertar una fila `checkpoints` por cuarto existente (`tipo ALOJAMIENTO`, `activo = true`, `nombre = 'Habitación {identificador}'`, `codigoQr` único, `habitacionId`), antes de crear la FK/índice único. Así prod y dev quedan iguales al aplicar `migrate deploy`. Sin backfill, las habitaciones preexistentes violarían NOT NULL y quedarían sin checkpoint.

## Risks / Trade-offs

- [Eliminar un cuarto borra su checkpoint y los registros de llegada a ese cuarto (cascade encadenado)] → Mitigación: la acción ya bloquea eliminar cuartos con ocupantes; el punto de control dejó de existir, y sus registros son evidencia de ese punto — coherente con la eliminación de un checkpoint manual (que también dispone sus registros, ver spec `admin/checkpoints`).
- [Cuarto sin fila de checkpoint (estado inconsistente heredado o por rollback parcial)] → Mitigación: `updateMany` no-op al editar, QR omitido defensivamente si falta el checkpoint, y backfill cubre los datos preexistentes.
- [El nombre del checkpoint deriva del identificador editable] → Mitigación: se sincroniza en `editarHabitacion`; si a futuro se quiere un nombre independiente, es un cambio de spec aparte.
- [Registro menos restrictivo: cualquiera inscrito puede registrarse en cualquier cuarto] → Acordado con el usuario (se comporta igual que los checkpoints); restringir a ocupantes sería un cambio futuro de comportamiento.
- [Rollback pierde los registros de control de cuartos] → Aceptado: revertir la relación con cascade elimina esos registros; la información de checkpoints manuales se conserva intacta.

## Migration Plan

1. Editar `prisma/schema.prisma` (campos + relación `Checkpoint ↔ Habitacion`).
2. `npx prisma migrate dev --create-only --name habitaciones_como_checkpoints` → genera el SQL sin aplicarlo.
3. Editar el archivo de migración para incluir el backfill (decisión 6) y las restricciones en el orden correcto.
4. `npx prisma migrate dev` → aplica en dev; verificar con una consulta que cada habitación tenga `codigoQr` único y su checkpoint (`nombre = 'Habitación …'`, `activo = true`).
5. En producción, `prisma migrate deploy` aplica la misma migración.

Rollback: revertir a la migración anterior (las columnas nuevas se descartan; los `codigoQr` se vuelven a generar al re-aplicar). Se pierden únicamente los registros de control de los cuartos creados mientras la feature estuvo activa.