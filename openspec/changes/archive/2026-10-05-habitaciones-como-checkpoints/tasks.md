# Tasks

## 1. Schema y migración

- [x] 1.1 En `prisma/schema.prisma`: agregar `codigoQr String @unique @default(uuid())` a `Habitacion`, y en `Checkpoint` el campo `habitacionId String? @unique` con la relación 1:1 a `Habitacion` (`onDelete: Cascade`, nombre de relación explícito en ambos lados). Verificar que `npx prisma migrate dev --create-only --name habitaciones_como_checkpoints` genera el SQL sin errores.
- [x] 1.2 Editar el SQL de la migración generado para el backfill: `codigoQr = gen_random_uuid()` a las habitaciones existentes (columna añadida NULL → backfill → `SET NOT NULL` + índice único) e insertar una fila en `checkpoints` por cuarto existente (`tipo = 'ALOJAMIENTO'`, `activo = true`, `nombre = 'Habitación ' || identificador`, `codigoQr` único, `habitacionId`, timestamps), antes de crear la FK/índice único de `habitacionId`. Aplicar con `npx prisma migrate dev` y verificar que se aplica limpio sobre el dev DB.
- [x] 1.3 Verificar el backfill con una consulta: cada habitación tiene `codigoQr` no nulo y único, su checkpoint asociado existe con `tipo`/`activo` correctos, y no quedan habitaciones sin checkpoint.

## 2. Server Actions de habitaciones

- [x] 2.1 `crearHabitacion` (`src/lib/actions/admin/habitaciones.ts`): crear el checkpoint anidado en el mismo `habitacion.create` (`tipo: "ALOJAMIENTO"`, `activo: true`, `nombre: "Habitación {identificador}"`, `codigoQr` auto). Verificar en dev que crear un cuarto genera su checkpoint con `codigoQr` único.
- [x] 2.2 `editarHabitacion`: en una transacción, actualizar el cuarto y sincronizar el nombre del checkpoint con `checkpoint.updateMany({ where: { habitacionId }, data: { nombre } })` si el identificador cambió (no-op seguro si faltara la fila). Verificar que editar el identificador de un cuarto actualiza el nombre de su checkpoint a "Habitación {nuevo}".
- [x] 2.3 `eliminarHabitacion`: no requiere cambio de código (el `onDelete: Cascade` de `Checkpoint.habitacionId` encadena el borrado del checkpoint y sus `RegistroControl`). Verificar en dev que eliminar un cuarto sin ocupantes elimina su checkpoint y sus registros, sin tocar el resto del evento.

## 3. Detalle del evento (admin)

- [x] 3.1 `src/app/admin/eventos/[id]/page.tsx`: en la query, filtrar la lista de checkpoints gestionables con `where: { habitacionId: null }` e incluir en `habitaciones` el `checkpoint: { select: { codigoQr: true } }`; calcular `qrUrl`/`qrDataUrl` por habitación (defensivo: omitir el QR si el cuarto no tiene checkpoint) y pasar los nuevos datos a `SeccionHabitaciones`. Verificar con `npx tsc --noEmit` o `npm run build` que tipa, y que la sección de checkpoints ya no muestra los de habitación.
- [x] 3.2 `src/app/admin/eventos/[id]/seccion-habitaciones.tsx`: extender `HabitacionConOcupantes` con `checkpoint.codigoQr`, `qrUrl` y `qrDataUrl`, y agregar la columna "QR" por fila con `<details> Ver QR </details>` (imagen 192 px + enlace `qrUrl`) y `BotonCopiar` con `qrUrl`. Verificar en `/admin/eventos/[id]` que cada cuarto muestra su QR único y que copiar el enlace funciona (feedback "Copiado").

## 4. Verificación integral

- [x] 4.1 Probar el flujo completo en dev: crear una habitación → ver su QR en el detalle → abrir `{urlBase}/checkpoint/{codigoQr}` → autoregistrar un documento inscrito → confirmar `RegistroControl` creado en el checkpoint del cuarto y su conteo visible en el tablero del Operador. Verificar también que el QR de la habitación da "Enlace no válido" si el cuarto no existe y que un checkpoint manual no aparece en la sección Habitaciones.
- [x] 4.2 Guardar contra regresiones: confirmar que los checkpoints manuales siguen creándose inactivos, que la edición/eliminación manual de checkpoints sigue funcionando, y que el registro manual del Operador y el bloqueo de duplicados funcionan igual sobre un checkpoint de habitación. Revisar `openspec validate` del cambio como `--strict` y confirmar el árbol de trabajo limpio de scripts temporales.