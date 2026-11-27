# Tasks

## 1. Dependencias y lógica compartida

- [x] 1.1 Agregar `pdfkit` como dependencia de producción y `@types/pdfkit` como dependencia de desarrollo, y fijar el lockfile; verificar que `npm install`, `npm run lint` y `npx tsc --noEmit` terminen sin errores.
- [x] 1.2 Extraer a `src/lib/reportes/filtros-reporte.ts` el parseo de `tipo`/`rol`, la descripción legible de filtros y el slug del nombre del evento; verificar que la ruta XLSX siga pasando `tests/integration/reporte.test.ts` sin cambios de comportamiento.

## 2. Generación del PDF

- [x] 2.1 Crear una función pura que construya las secciones del PDF (resumen, detalle y notas) a partir de `ReporteEvento` y la descripción de filtros; verificar con una prueba que los encabezados y las filas coincidan con los del XLSX para el mismo evento filtrado.
- [x] 2.2 Implementar el renderizador PDFKit en `src/lib/reportes/generar-pdf-reporte.ts` con orientación apaisada, paginación, encabezados repetidos y ajuste de columnas largas; verificar que devuelva un buffer válido con prefijo `%PDF-` y que una prueba con acentos y `ñ` no falle.
- [x] 2.3 Crear el Route Handler `GET /api/admin/eventos/[eventoId]/reporte/exportar/pdf/route.ts` con `runtime = "nodejs"`, la misma autorización de Administrador, el parseo compartido, `cargarReporteEvento`, manejo de evento inexistente y cabeceras `application/pdf` y `Content-Disposition` con extensión `.pdf`; verificar que una petición de Admin devuelva 200 y bytes PDF.

## 3. Interfaz del reporte

- [x] 3.1 Agregar el botón `Exportar PDF` junto a `Exportar XLSX` en `src/app/admin/eventos/[id]/reporte/page.tsx`, reutilizando el mismo sufijo de filtros; verificar que el botón XLSX conserve su texto, estilo y destino actuales.
- [x] 3.2 Verificar en una prueba E2E que ambos botones están visibles, que el enlace PDF incluye los parámetros `tipo` y `rol` activos y que la descarga genera un archivo `.pdf`.

## 4. Pruebas y verificación final

- [x] 4.1 Ampliar `tests/integration/reporte.test.ts` con casos del endpoint PDF: exportación exitosa, filtros aplicados, evento sin datos y evento inexistente; verificar que `npm test` pasa.
- [x] 4.2 Cubrir el control de acceso del nuevo endpoint para sesión ausente (401) y rol Operador (403); verificar que `npm test` pasa.
- [x] 4.3 Ejecutar `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` y `npm run test:e2e`; verificar que todos terminan sin errores.
- [x] 4.4 Validar la delta con `openspec validate "reporte-pdf-administrador" --type change --strict` y revisar el diff final para confirmar que no se modificaron esquema, migraciones, reglas de cupo ni la exportación XLSX existente.
