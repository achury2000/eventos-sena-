## Why

Los eventos con `incluyeHotel = true` ya existen y los asistentes se inscriben, pero no hay forma de asignar habitaciones de hotel: el modelo `Habitacion`/`AsistenteHabitacion` está en el schema pero sin ninguna interfaz ni acción. Sin esta capacidad, la gestión de alojamiento del evento (paso 5 del flujo de CONTEXT.md) no se puede ejecutar en la plataforma.

## What Changes

- Nuevo módulo de **habitaciones en `/admin/eventos/[id]`** (visible solo cuando `evento.incluyeHotel`): CRUD de habitaciones (`identificador`, `capacidad`) y asignación manual por persona (un cuarto puede tener 1..N ocupantes hasta su capacidad; una persona puede ocupar una sola habitación del evento).
- Nuevas Server Actions de administrador (patrón `checkpoints.ts`): `crearHabitacion`, `editarHabitacion`, `eliminarHabitacion`, `asignarAsistente`, `desasignarAsistente`.
- Nuevo Route Handler de búsqueda de asistentes del evento para el Admin: `GET /api/admin/eventos/[eventoId]/asistentes` (excluye inscripciones canceladas y asistentes que ya tienen habitación), para no cargar listas de hasta 1000 personas.
- **Reglas de integridad**: `identificador` único por evento (via migración `@@unique([eventoId, identificador])`); no reducir `capacidad` por debajo de los ocupados; no eliminar habitaciones ocupadas; no asignar asistentes de inscripciones canceladas.
- **Liberación atómica**: al cancelar una inscripción (`POST /api/inscripciones/[id]/cancelar`), se eliminan las asignaciones de habitación de sus asistentes dentro de la misma transacción.

## Capabilities

### New Capabilities

- `admin/habitaciones`: gestión de habitaciones de hotel por parte del Administrador (CRUD de habitaciones, asignación/desasignación manual por persona, respeto de capacidad) y búsqueda de asistentes disponibles para asignar.

### Modified Capabilities

- `inscripcion-publica`: el requerimiento "Cancelación de inscripción por el Administrador" cambia — al cancelar se liberan también las habitaciones asignadas a los asistentes de esa inscripción, de forma atómica con la cancelación.

## Impact

- `prisma/schema.prisma` + nueva migración (`@@unique([eventoId, identificador])` en `Habitacion`).
- `src/lib/actions/admin/habitaciones.ts` (nuevo), `src/lib/validations/admin.ts` (`habitacionSchema`), `src/app/api/inscripciones/[id]/cancelar/route.ts` (limpieza de `asistenteHabitacion` en la transacción).
- `src/app/admin/eventos/[id]/page.tsx` (sección "Habitaciones"), nuevos componentes de formulario y búsqueda, nuevo Route Handler `GET /api/admin/eventos/[eventoId]/asistentes`.
- Nuevo cambio OpenSpec; nada del dominio público (inscripción/autoregistro) ni del panel del Operador cambia.