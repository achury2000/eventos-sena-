# Proposal

## Why

La página de inscripciones del panel admin (`/admin/eventos/[id]/inscripciones`) muestra únicamente las últimas 50 inscripciones del evento, sin buscador ni paginación. Con un cupo máximo de hasta 1000 personas por evento, un Administrador no puede encontrar una inscripción concreta por nombre o documento, ni recorrer el total de inscritos.

## What Changes

- El listado de inscripciones pasa a paginarse con tamaño fijo y a mostrar la posición actual ("página X de Y"), preservando el orden actual (fecha de inscripción descendente).
- Se agrega un buscador que filtra por nombre o documento del titular, o por el correo de la inscripción.
- Los filtros viven en la URL (`?q=` y `?pagina=`): la búsqueda se preserva al cambiar de página y las URLs son compartibles, sin estado en el cliente.
- Estados vacíos diferenciados: evento sin inscripciones vs. búsqueda sin coincidencias.
- Una `pagina` fuera de rango se ajusta a la última página válida (nunca se muestra una página vacía).
- No hay cambios de esquema de BD ni de la lógica de inscripción/cancelación.

## Capabilities

### New Capabilities
- `admin/inscripciones`: listado, búsqueda y paginación de las inscripciones de un evento en el panel de administración.

### Modified Capabilities
- (ninguna)

## Impact

- Código: únicamente `src/app/admin/eventos/[id]/inscripciones/page.tsx`.
- Sin dependencias nuevas, sin cambios de `prisma/schema.prisma`, sin cambios en APIs existentes.
- La columna "Ver firma" (visor de firma) y el botón de cancelación por fila se conservan intactos.