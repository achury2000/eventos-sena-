# Proposal

## Why

El panel del operador muestra hoy cuatro indicadores estáticos y, debajo, todas las tarjetas de checkpoints, gráficos y controles en una sola pantalla larga. El operador no tiene una vista centrada en las personas ni una forma clara de priorizar qué revisar primero. Convertir los indicadores en vistas navegables y traer el desglose de asistentes al panel reduce el rastreo visual y hace que el tablero sea más útil durante el evento.

## What Changes

- Conservar los cuatro cuadros que ya tenía cada evento —**Asistentes**, **Cobertura**, **Checkpoints activos** y **Registros**— y convertirlos en botones que cambian solo el contenido de ese evento.
- **Cobertura** es la vista inicial de cada evento y muestra los gráficos existentes de cobertura y barras por checkpoint.
- **Asistentes** muestra únicamente el nombre de los asistentes vigentes —sin documento— y una tabla con el estado de registro por checkpoint (SÍ/NO) y el total de completados.
- **Checkpoints activos** muestra las tarjetas existentes con la activación/desactivación y el registro manual; el formulario manual se deshabilita con mensaje claro si el checkpoint está inactivo.
- **Registros** muestra una tabla con los conteos por checkpoint (registrados, manuales, autoregistro y avance) y conserva su total visible en el propio botón.
- Mantener el estado de vista por evento, de modo que cambiar la vista de un evento no afecte a los demás y no obligue a volver al inicio de la pantalla.
- Ampliar `GET /api/operador/dashboard` con nombres y estado de registro por checkpoint, solo para eventos asignados al operador, sin exponer documentos.
- Mantener el sondeo de 5 segundos, el buscador global de checkpoints y el comportamiento actual de los gráficos (donut global, barras filtradas), preservando la vista activa de cada evento entre actualizaciones.
- Actualizar las pruebas E2E del operador y la spec `panel-operador`.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `panel-operador`: botones por evento dentro de los cuadros existentes, vista de asistentes con nombres y estado por checkpoint, vista de checkpoints y vista de registros.

## Impact

- Componentes: `src/app/operador/panel-operador.tsx`, `src/app/operador/graficos-panel.tsx`, `src/app/operador/tabla-asistentes.tsx`, `src/app/operador/tabla-registros.tsx` y `src/app/operador/form-registro-manual.tsx`.
- Datos: `src/lib/operador/tablero.ts` y `src/app/api/operador/dashboard/route.ts` amplían el DTO; se reutiliza el patrón de consulta de `src/lib/reportes/cargar-reporte.ts` sin incluir `documento`.
- Pruebas: `tests/e2e/operador.spec.ts` debe abrir el botón **Checkpoints activos** del evento antes de usar el formulario manual; se añaden pruebas para el estado por evento, la tabla de asistentes y la tabla de registros.
- Especificaciones: delta sobre `openspec/specs/panel-operador/spec.md`.
- Sin dependencias nuevas (Recharts ya está instalado), sin migraciones, sin cambios de esquema y sin modificar los endpoints de activación o registro manual.
