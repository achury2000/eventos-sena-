# Design

## Context

`FormAsignarOperador` (`src/app/admin/eventos/[id]/form-asignar-operador.tsx`) es un componente cliente que recibe `operadores` — cuentas con rol `OPERADOR` no asignadas al evento — las muestra en un `<select>` nativo ("nombre — correo") y al enviar llama a la server action `asignarOperador`. La lista crece con cada cuenta creada en `/admin/operadores`. El detalle del evento (`page.tsx`) es un Server Component que además regenera los QR de los checkpoints en cada render.

## Goals

- Filtrar las opciones de asignación por nombre o correo del Operador, en tiempo real y sin recargar la página ni el estado del formulario.
- Mantener el flujo de asignación actual intacto (mismo formulario, misma server action).

## Non-Goals

- No se toca el listado de Operadores ya asignados ("Quitar").
- No se agregan dependencias (sin librerías de combobox) ni hay paginación en el desplegable (lista de cuentas, no de inscripciones).
- No se filtra por documento del Operador (el modelo `Usuario` seleccionado aquí no lo expone y la opción muestra nombre/correo).

## Decisions

### D1: Filtro en el cliente dentro del formulario (elegido)

Un `<Input>` de búsqueda con estado local (`useState`) filtra las opciones del `<select>` por substring insensible a mayúsculas sobre `nombreCompleto` o `email`. Respuesta instantánea, sin viajes al servidor.

- Alternativa descartada: *filtro por `?q=` en `page.tsx`* — recargaría todo el detalle del evento (incluida la regeneración de QR) por cada tecla, con UX peor para un desplegable de cuentas.
- Alternativa descartada: *librería de combobox* — dependencia nueva para un caso resoluble con primitivas HTML + estado local.

### D2: Estados del filtro

- Con coincidencias: el `<select>` muestra solo las opciones filtradas (sin cambiar su comportamiento actual, sigue sin controlar).
- Sin coincidencias (pero hay Operadores disponibles): mensaje "No hay operadores que coincidan con “X”." y botón "Asignar" deshabilitado para no enviar una opción inexistente.
- Sin Operadores disponibles: se conserva el mensaje existente "No hay operadores disponibles para asignar." (rama previa de `operadores.length === 0`).

## Risks / Trade-offs

- [Con cientos de Operadores, todas las `<option>` se siguen enviando al cliente] → el costo es el mismo de hoy y el filtro resuelve la usabilidad; si la escala cambiara, un cambio futuro pasaría a búsqueda diferida en servidor.
- [El `<select>` sin controlar puede dejar de mostrar la opción seleccionada al filtrar] → el navegador selecciona la primera opción visible resultante; comportamiento aceptable y no rompe la asignación.

## Migration Plan

Rama `feature/busqueda-asignar-operador` desde `main`; implementación en un solo archivo; PR para merge. Rollback = revert del PR.

## Open Questions

Ninguna.