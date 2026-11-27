# Tasks

## 1. Consulta y datos

- [x] 1.1 Actualizar el `findMany` de `src/app/admin/eventos/[id]/inscripciones/page.tsx` para incluir a todos los asistentes con `nombreCompleto`, `documento` y `esTitular`, ordenando al titular primero; verificar que `npx tsc --noEmit` no reporte errores de tipos.
- [x] 1.2 Separar en la fila al titular y a los acompañantes y calcular el total con la cantidad de asistentes; verificar que una inscripción existente siga mostrando su correo, fecha, estado y acciones.

## 2. Interfaz de la tabla

- [x] 2.1 Añadir la columna `Acompañantes` con el nombre y documento de cada acompañante, mostrar `Sin acompañantes` cuando no haya, y renombrar `Asistentes` a `Total`; verificar visualmente con una inscripción de titular y acompañante.
- [x] 2.2 Permitir desplazamiento horizontal de la tabla en pantallas estrechas sin perder columnas ni acciones; verificar en una vista angosta que la tabla se pueda desplazar.

## 3. Búsqueda

- [x] 3.1 Quitar la restricción `esTitular: true` del filtro de asistentes para que el buscador encuentre también por nombre o documento de un acompañante; verificar que una búsqueda por el documento del acompañante devuelva la inscripción.

## 4. Pruebas

- [x] 4.1 Actualizar `tests/e2e/inscripcion.spec.ts` para comprobar que el acompañante aparece en la fila con su documento y que el total es `2`; ejecutar la prueba E2E de inscripción y verificar que pasa.
- [x] 4.2 Extender la misma prueba E2E para buscar por el documento del acompañante y comprobar que la inscripción sigue visible; ejecutar la prueba y verificar que pasa.
- [x] 4.3 Ejecutar `npm run lint`, `npx tsc --noEmit`, `npm test` y `npm run build`; verificar que todos terminan sin errores.

## 5. Especificación y cierre

- [x] 5.1 Revisar que la delta de `admin/inscripciones` describa la visualización de acompañantes y la búsqueda por persona; ejecutar `openspec validate --change mostrar-acompanantes-inscripciones --strict` y verificar que pasa.
- [x] 5.2 Revisar el diff final y confirmar que no se modificaron el esquema, las migraciones, los Route Handlers ni las reglas de cupo; dejar el change listo para archivar después del merge.
