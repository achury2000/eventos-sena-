# Tasks

## 1. Estado y buscadores por vista

- [x] 1.1 Quitar el campo de búsqueda global y su mensaje «sin resultados» del encabezado del panel, junto con el estado `filtro` que filtraba todos los eventos; verificar que `/operador` siga mostrando las secciones de evento y que no quede ningún input global con el placeholder anterior.
- [x] 1.2 Añadir el estado de búsqueda por identificador de evento y vista en el contenedor del panel, pasarlo como valor controlado a cada vista activa y verificar que escribir en un evento/vista no modifique los demás y que el texto sobreviva al sondeo de 5 s y al cambio de vista.
- [x] 1.3 Extraer la normalización de texto a minúsculas sin tildes y reutilizarla en las cuatro vistas; verificar con E2E que «habitacion» y «ALOJAMIENTO» encuentran «Habitación 601» y la categoría «Alojamiento».

## 2. Vista de Asistentes

- [x] 2.1 Filtrar filas por `nombreCompleto` y columnas por nombre/categoría de checkpoint desde el buscador de la vista, aplicando ambos filtros cuando haya coincidencias en los dos; verificar con E2E que un nombre reduce filas, «601» reduce columnas y combinar ambos muestra solo esa intersección.
- [x] 2.2 Ajustar la tabla con scroll horizontal, columnas `Nombre` y `Completados` fijas, cabecera fija, ancho mínimo por columna de checkpoint y etiqueta corta de habitación con el nombre completo en `title`/`aria-label`; verificar visualmente y con E2E que las columnas fijas siguen visibles al desplazarse y que la cabecera accesible sigue siendo `Nombre` y `Completados`.
- [x] 2.3 Mantener el denominador de `Completados` sobre todos los checkpoints aplicables aunque haya columnas ocultas, mostrando aparte el número de columnas visibles; verificar con E2E un caso `2/4` con «2 columnas visibles».
- [x] 2.4 Mostrar estado vacío informativo cuando el evento no tiene asistentes vigentes y cuando el buscador no coincide con asistentes ni checkpoints; verificar con E2E ambos mensajes y la ausencia de una tabla vacía.

## 3. Otras vistas del evento

- [x] 3.1 Filtrar las barras de `Cobertura` por nombre/categoría de checkpoint sin ocultar la sección ni alterar el donut, mostrando estado vacío en las barras cuando no haya coincidencias; verificar con E2E que solo se grafican las barras coincidentes y que el donut conserva el total del evento.
- [x] 3.2 Filtrar las tarjetas de `Checkpoints activos` por nombre/categoría, conservando activación/desactivación y el formulario deshabilitado en checkpoints inactivos; verificar con E2E que solo aparecen las tarjetas coincidentes y que sus acciones siguen funcionando durante el sondeo.
- [x] 3.3 Filtrar las filas de `Registros` por nombre/categoría conservando base, manuales, autoregistros y avance; verificar con E2E que una habitación sigue mostrando base `2` y avance `100%` aunque el buscador esté activo.

## 4. Verificación

- [x] 4.1 Reescribir las pruebas de filtro en `tests/e2e/operador.spec.ts`: sustituir la prueba del buscador global por cobertura de búsqueda por evento/vista, aislamiento entre eventos, persistencia durante sondeo, filas y columnas de `Asistentes`, denominador de `Completados` y estados vacíos; verificar que `npm run test:e2e` pase completa.
- [x] 4.2 Verificar que no haya cambios de backend con `git diff --name-only -- prisma/schema.prisma prisma/migrations src/app/api src/lib/operador/tablero.ts` sin salida, y ejecutar `npm run lint`, `npx tsc --noEmit` y `npm test` hasta que pasen.
- [x] 4.3 Ejecutar `npm run build` y reconstruir el contenedor con `docker compose --profile full up -d --build app`; verificar que `GET /login` responda `200`.
- [x] 4.4 Validar el delta con `openspec validate "panel-operador-busqueda-local-y-columnas-fijas" --strict`; verificar que termine sin errores.
