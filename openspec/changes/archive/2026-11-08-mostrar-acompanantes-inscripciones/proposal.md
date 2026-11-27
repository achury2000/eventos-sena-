# Proposal: Mostrar acompañantes en las inscripciones del administrador

## Why

La tabla de inscripciones de un evento solo muestra al titular y el número total de personas. El administrador no puede ver quiénes son los acompañantes que asistirán ni encontrarlos con el buscador, lo que dificulta la verificación y la operación del evento.

## What Changes

- Mostrar en cada fila el nombre y documento del titular y de cada acompañante.
- Indicar el total de personas de la inscripción (titular + acompañantes) sin cambiar las reglas de cupo.
- Ampliar la búsqueda para que coincida con el nombre o documento de cualquier persona de la inscripción, además del correo.
- Mantener la tabla agrupada por inscripción: correo, fecha, estado, firma y cancelación siguen siendo datos del grupo.
- Ajustar la prueba E2E existente para comprobar que el acompañante es visible y que la búsqueda por su documento encuentra la inscripción.
- Sin cambios de esquema, API, migraciones ni reglas de negocio.

## Capabilities

### Modified Capabilities

- `admin/inscripciones`: el listado muestra a todas las personas de la inscripción y la búsqueda deja de limitarse al titular.

## Impact

- Página `src/app/admin/eventos/[id]/inscripciones/page.tsx`.
- Prueba `tests/e2e/inscripcion.spec.ts`.
- Especificación `openspec/specs/admin/inscripciones/spec.md` mediante su delta.
- No hay cambios en base de datos, Route Handlers, cupos ni inscripción pública.
