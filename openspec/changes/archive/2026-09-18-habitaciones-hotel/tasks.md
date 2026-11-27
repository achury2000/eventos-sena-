## 1. Schema y migración

- [x] 1.1 Agregar `@@unique([eventoId, identificador])` al modelo `Habitacion` en `prisma/schema.prisma` y generar la migración con `prisma migrate dev --name habitacion_identificador_unico`; verificar que `npx prisma migrate status` reporta la base al día y que `npm run db:generate` regenera el cliente sin errores.

## 2. Validaciones

- [x] 2.1 Añadir `habitacionSchema` en `src/lib/validations/admin.ts` (`identificador`: trim, no vacío, max 20 chars; `capacidad`: entero >= 1) y verificar que `npx tsc --noEmit` compila y que el nuevo esquema rechaza identificador vacío y capacidad 0.

## 3. Server Actions de habitaciones

- [x] 3.1 Crear `src/lib/actions/admin/habitaciones.ts` con `crearHabitacion` y `editarHabitacion` (guard `requireAdmin`, Zod, evento debe existir y con `incluyeHotel`, editar no baja `capacidad` bajo los ocupados ni duplica `identificador` — capturar `P2002`); verificar con `npm run lint` y `npx tsc --noEmit`.
- [x] 3.2 Añadir en el mismo archivo `eliminarHabitacion` que rechaza eliminar cuartos con asistentes asignados (mensaje claro) y `asignarAsistente`/`desasignarAsistente` con la transacción de validación (cuarto del evento, cupo disponible, asistente del evento, inscripción no cancelada, asistente sin otro cuarto del evento, captura `P2002`); verificar con `npm run lint` y `npx tsc --noEmit`.

## 4. Endpoint de búsqueda de asistentes

- [x] 4.1 Crear `src/app/api/admin/eventos/[eventoId]/asistentes/route.ts` (GET, `runtime = "nodejs"`, `auth()` + rol `ADMINISTRADOR`, `404` si el evento no existe, `OR` nombre/documento con `contains`, `habitaciones: { none: {} }`, `inscripcion.estado != "CANCELADO"`, `take: 20`); verificar con `npx tsc --noEmit` y una llamada autenticada que devuelve solo asistentes asignables.

## 5. UI: sección de habitaciones en el detalle del evento

- [x] 5.1 Crear `src/app/admin/eventos/[id]/form-habitacion.tsx` con `FormHabitacion` (crear) y `FormHabitacionEditar` (patrón `FormCheckpoint`/`FormCheckpointEditar` usando `useActionState`); verificar que renderiza y envía las acciones sin errores de consola.
- [x] 5.2 Crear el componente cliente de asignación `FormAsignarHabitacion` (busca en el Route Handler del punto 4 y envía `asignarAsistente` como Server Action, mostrando el mensaje de éxito/error del `ActionState`); verificar funcionalmente con un evento de prueba.
- [x] 5.3 Renderizar la sección "Habitaciones" en `src/app/admin/eventos/[id]/page.tsx` solo si `evento.incluyeHotel` (cargar habitaciones con `_count.asistentes` y ocupantes, tabla con Identificador, Capacidad `x/y`, ocupantes, acciones asignar/desasignar/editar/eliminar, eliminar con `ActionForm` + confirmación); verificar manualmente con un evento con hotel (sección presente) y uno sin hotel (ausente).

## 6. Cancelación de inscripción libera cuartos

- [x] 6.1 En `src/app/api/inscripciones/[id]/cancelar/route.ts`, dentro del `$transaction`, agregar `deleteMany` en `asistenteHabitacion` con `where: { asistente: { inscripcionId: id } }` (asignaciones agrupadas con la actualización de estado y el decremento del cupo); verificar que cancelar una inscripción con asistentes en cuartos los libera (ocupación baja) y que una cancelación duplicada responde `409` sin tocar cuartos.

## 7. Verificación integral

- [x] 7.1 Correr `npm run lint` y `npx tsc --noEmit` sin errores.
- [x] 7.2 Prueba de integración manual end-to-end: evento con hotel → crear cuartos → asignar a personas (incluidos casos: cuarto lleno, persona ya con cuarto, persona de inscripción cancelada, buscar por nombre y por documento) → cancelar inscripción y confirmar cuartos liberados.
- [x] 7.3 Validar el cambio con `openspec validate 2026-09-18-habitaciones-hotel --strict` y `openspec validate --specs` sin errores.