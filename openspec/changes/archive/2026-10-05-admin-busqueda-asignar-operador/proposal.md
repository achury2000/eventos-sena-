# Proposal

## Why

Al asignar Operadores a un evento, el formulario muestra un desplegable con todos los Operadores registrados que aún no están asignados. Cuando existen varios Operadores (decenas o más, creados en `/admin/operadores`), encontrar a uno por nombre o correo dentro de la lista se vuelve tedioso. Un filtro en el desplegable agiliza la asignación.

## What Changes

- El formulario "Asignar Operador al evento" (`FormAsignarOperador`) agrega un campo de búsqueda que filtra en tiempo real las opciones del desplegable por nombre o correo del Operador.
- Cuando el filtro no coincide con ningún Operador disponible, se muestra un mensaje y no se ofrecen opciones para asignar.
- La asignación sigue funcionando igual (misma validación y acción de servidor); solo cambia la presentación de las opciones.
- No hay cambios de schema, de APIs ni de la lógica de asignación.

## Capabilities

### New Capabilities
- (ninguna)

### Modified Capabilities
- `admin/eventos`: nuevo requisito "Búsqueda de Operadores al asignar a un evento" para la lista de Operadores disponibles del formulario de asignación (no cambia el comportamiento existente; se agrega la capacidad de filtrar).

## Impact

- Código: únicamente `src/app/admin/eventos/[id]/form-asignar-operador.tsx` (componente cliente).
- Sin dependencias nuevas; `page.tsx`, server actions y schema quedan intactos.