## Context

Los modelos `Habitacion` y `AsistenteHabitacion` ya existen en `prisma/schema.prisma` (M:N con `Asistente`, `@@id([asistenteId, habitacionId])`) pero no tienen uso en `src/`. El detalle del evento (`src/app/admin/eventos/[id]/page.tsx`) ya sabe si el evento incluye hotel (`incluyeHotel`). Existe un patrón consolidado para CRUD admin con Server Actions + Zod + `requireAdmin()` (`src/lib/actions/admin/checkpoints.ts`) y para endpoints admin (`auth()` + chequeo de rol en `src/app/api/inscripciones/[id]/cancelar/route.ts`). El cupo de cuartos es un punto de contención de baja frecuencia (solo Admins), distinto del cupo del evento (CONTEXT.md §7), por lo que no aplica el patrón `$executeRaw` atómico.

Ver proposal.md — Why para la motivación; los requisitos de comportamiento están en `specs/admin/habitaciones/spec.md` y el delta de `specs/inscripcion-publica/spec.md`.

## Goals / Non-Goals

**Goals:**
- Gestión completa de habitaciones en `/admin/eventos/[id]` solo cuando `incluyeHotel`.
- Asignación manual por persona con respeto de capacidad y la regla "1 persona = 1 cuarto por evento".
- Búsqueda eficiente de asistentes asignables sin cargar listas de hasta 1000 personas.
- Cancelación de inscripción que libera cuartos de forma atómica.
- Mínimo cambio de schema: únicamente el `@@unique([eventoId, identificador])`.

**Non-Goals:**
- Asignación automática/algoritmo de llenado de cuartos.
- Liberación automática de cuartos al cambiar de estado el evento (cancelar evento conserva datos, igual que inscripciones/registros).
- Reportes de ocupación de hotel (podrían ser parte de un futuro módulo de reportes).
- Mover/asignar varias personas de golpe en una operación.

## Decisions

### 1. Regla "1 persona = 1 cuarto" a nivel de aplicación, no de base de datos

Se comprueba en `asignarAsistente` que el asistente no tenga ya un `AsistenteHabitacion` cuyo `habitacion.eventoId` sea el del evento, y se crea en un `$transaction` para minimizar la ventana de carrera. Alternativa considerada: un índice único con condiciones (`asistenteId` donde `eventoId = X`) — rechazada por sobre-ingeniería para un flujo manual de pocos Admins.

### 2. Transacción para el chequeo de capacidad en la asignación

`asignarAsistente` lee la habitación con `_count.asistentes` y valida `ocupados < capacidad` dentro de `prisma.$transaction`, luego inserta. En el mismo `$transaction`, valida que la habitación y el asistente pertenezcan al evento y que la inscripción del asistente no esté `CANCELADO`. El riesgo residual de doble asignación simultánea de dos Admins es aceptable y se protege capturando `P2002` sobre la PK compuesta. No se denormaliza un campo `ocupados` en `Habitacion`.

### 3. Server Actions para el CRUD, Route Handler solo para la búsqueda

Las acciones `crear/editar/eliminar/asignar/desasignar` siguen el patrón de `checkpoints.ts` (Server Action con `useActionState`, `ActionState`, `requireAdmin()`, `revalidatePath` + `redirect`), consistente con el resto de `src/lib/actions/admin/`. La **búsqueda** de asistentes asignables es la única pieza dinámica conforme se teclea, así que se implementa como Route Handler `GET /api/admin/eventos/[eventoId]/asistentes` con `auth()` + rol `ADMINISTRADOR` (mismo estilo que el endpoint de cancelar). Alternativa considerada: Server Actions por pulsación con `useActionState` — descartada por la fricción del estado del formulario para un buscador tipo-aas-you-type.

### 4. Búsqueda por nombre o documento en Prisma

El handler usa `where` con `eventoId`, `inscripcion.estado != "CANCELADO"`, `habitaciones: { none: {} }`, y un `OR` entre `nombreCompleto: { contains: q, mode: "insensitive" }` y `documento: { contains: q }`. `take: 20` para acotar resultados. La relación `Asistente.habitaciones` ya existe en el schema.

### 5. Sección de habitaciones en el detalle del evento

Nueva sección en `src/app/admin/eventos/[id]/page.tsx` renderizada solo si `evento.incluyeHotel`, con el mismo lenguaje visual que "Checkpoints": tarjeta de creador (nuevo `FormHabitacion`), tabla por cuarto (Identificador, Capacidad `x/y`, ocupantes con nombre/doc, acciones), edición inline vía `details` (patrón de `FormCheckpointEditar`), y eliminación con el `ActionForm` existente + `confirmText`. La asignación usa un nuevo componente cliente `FormAsignarHabitacion` con un input de búsqueda que consume el Route Handler y envía la asignación como Server Action.

### 6. Liberación de cuartos al cancelar inscripción

En `src/app/api/inscripciones/[id]/cancelar/route.ts`, dentro del `$transaction` ya existente, se agrega un `tx.asistenteHabitacion.deleteMany({ where: { asistente: { inscripcionId: id } } })`. Al ser la misma transacción, liberar `cuposOcupados` y liberar cuartos es atómico; si la inscripción ya estaba cancelada (`updateMany` con `count === 0`), la transacción aborta antes sin tocar cuartos. Respuestas HTTP sin cambios (204/404/409).

### 7. Migración del identificador único

`@@unique([eventoId, identificador])` en `Habitacion`, generada con `prisma migrate dev --name habitacion_identificador_unico`. No se toca `AsistenteHabitacion`.

## Risks / Trade-offs

- **Doble asignación simultánea (dos Admins)** → Se mitiga con el `$transaction` + captura de `P2002`; el peor caso es que el segundo Admin reciba un error y reintente. Aceptable para un flujo manual.
- **Búsqueda con `contains` sin índice** → En tablas de hasta ~1000 asistentes por evento es despreciable. No se agregan índices adicionales; si crece, medir primero.
- **Reducir capacidad u eliminar cuarto ocupado** → Rechazado a nivel de acción con mensaje claro (requisito de spec), evitando pérdida accidental de asignación.
- **La regla 1-persona-1-cuarto depende de la app, no del esquema** → Riesgo residual bajo; la acción es la única vía de escritura de `AsistenteHabitacion` en la UI.

## Migration Plan

1. Aplicar el cambio de schema con `prisma migrate dev --name habitacion_identificador_unico`.
2. Implementar el módulo (ver `tasks.md`).
3. Verificación: `npm run lint`, `npx tsc --noEmit`, prueba manual del flujo (evento con hotel → crear cuartos → asignar/asignar a persona con cuarto ya/lleno/cancelado → cancelar inscripción y ver cuartos liberados).
4. Rollback: revertir la migración con `prisma migrate rollback` y el commit correspondiente; el resto del módulo vive tras las acciones/UI.

## Open Questions

Ninguna pendiente en el corto plazo: las reglas de negocio (asignación manual, capacidad flexible 1..N, 1 persona = 1 cuarto, liberar cuartos al cancelar) fueron confirmadas con el equipo antes de proponer.