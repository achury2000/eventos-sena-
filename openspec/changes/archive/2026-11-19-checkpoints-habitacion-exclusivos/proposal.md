# Proposal

## Why

Los checkpoints respaldados por habitación aceptan hoy a cualquier asistente inscrito en el evento y calculan su avance contra todos los asistentes del evento. En el evento «Día de Sol», la Habitación 601 tiene cupo 2/2 y sus dos ocupantes ya registraron, pero el panel muestra 40% porque el evento tiene cinco asistentes. El Operador no puede distinguir quién debía llegar a ese cuarto.

## What Changes

- **BREAKING**: los checkpoints de habitación solo aceptan registros —por QR o manual— de asistentes asignados a esa habitación. Un documento de otro asistente del evento se rechaza con `422` y un mensaje explícito, sin crear `RegistroControl`.
- El avance de cada checkpoint de habitación se calcula sobre sus ocupantes asignados (2/2 = 100%); los checkpoints manuales conservan el total de asistentes vigentes como base.
- El DTO del tablero expone los identificadores de los ocupantes por habitación, sin documentos, para que la interfaz marque como «N/A» los checkpoints no aplicables a cada asistente y ajuste el total de completados.
- La vista Registros muestra la base real por checkpoint y la vista Checkpoints activos indica que el registro manual de habitaciones es solo para ocupantes.
- Los registros históricos no se eliminan: se conservan en la base de datos pero no influyen en el conteo ni en el avance operativo de la habitación.
- Sin cambios de esquema, migraciones ni endpoints nuevos.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `admin/habitaciones`: el checkpoint automático de una habitación pasa a ser una estación exclusiva de sus ocupantes asignados.
- `panel-operador`: base de avance por checkpoint, conteos del tablero, registro manual, gráficos y vistas Asistentes/Registros/Checkpoints pasan a distinguir habitaciones de checkpoints generales.

## Impact

- `src/lib/registro-checkpoint.ts` y las rutas `POST /api/checkpoints/[token]/registro` y `POST /api/operador/registro-manual`.
- `src/lib/operador/tablero.ts`, `src/app/api/operador/dashboard/route.ts` y el DTO `CheckpointTablero`.
- `src/app/operador/panel-operador.tsx`, `graficos-panel.tsx`, `tabla-asistentes.tsx`, `tabla-registros.tsx` y `form-registro-manual.tsx`.
- Pruebas de integración y E2E del panel y del registro en checkpoints.
- Sin cambios en `prisma/schema.prisma` ni migraciones.
