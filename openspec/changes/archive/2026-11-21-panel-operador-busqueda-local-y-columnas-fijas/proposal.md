# Proposal

## Why

Con varias habitaciones, la vista `Asistentes` del panel del Operador crece a lo ancho: cada cuarto añade una columna y los estados `SÍ`/`NO`/`N/A` se aprietan. El buscador global solo filtra checkpoints y, para no romper las tablas, tiene una excepción explícita que deja `Asistentes` y `Registros` sin filtrar. Como el Operador acompaña un evento por día, la búsqueda cruzada entre eventos aporta poco y conviene que la búsqueda esté dentro de la vista que se está mirando.

## What Changes

- **BREAKING (UI)**: eliminar el buscador global del encabezado del panel y su mensaje global de «sin resultados».
- Añadir un buscador **por evento y por vista**; cada vista recuerda su propio texto durante el sondeo de 5 s y al cambiar de vista.
- En `Asistentes`, el texto filtra **filas** por nombre de asistente y **columnas** por nombre o tipo de checkpoint. Escribir `601` reduce las habitaciones visibles; escribir un nombre reduce los asistentes; ambas cosas pueden aplicarse a la vez.
- En `Cobertura`, `Checkpoints activos` y `Registros`, el texto filtra checkpoints por nombre o categoría dentro del evento.
- Convertir la tabla de `Asistentes` en una tabla de datos legible: scroll horizontal, columnas `Nombre` y `Completados` fijas, cabecera fija, ancho mínimo por habitación y etiqueta corta visible con el nombre completo en `title`/`aria-label`.
- `Completados` conserva el denominador global de checkpoints aplicables al asistente y muestra aparte cuántas columnas están visibles, para que filtrar no cambie el significado del indicador.
- Mantener cada habitación como columna individual: no se resumen ni se promedian.
- Actualizar los estados vacíos por vista y las pruebas E2E del filtro.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `panel-operador`: sustituye el requisito «Búsqueda y filtro de checkpoints por nombre o categoría» por búsqueda por evento y vista; elimina el escenario «Vistas Asistentes y Registros no se filtran»; añade el filtrado de filas y columnas en `Asistentes` y el criterio del denominador de `Completados` cuando hay columnas ocultas.

## Impact

- Interfaz: `src/app/operador/panel-operador.tsx` y los componentes de vista (`tabla-asistentes.tsx`, `graficos-panel.tsx`, `tabla-registros.tsx` y la lista de checkpoints activos).
- Estado: nuevo mapa `Record<eventoId, Record<vista, string>>` en el cliente, fuera del DTO del tablero.
- Sin cambios en DTO, endpoints, Prisma, esquema ni migraciones.
- Pruebas: `tests/e2e/operador.spec.ts` y la spec `panel-operador`.
- Sin dependencias nuevas.
