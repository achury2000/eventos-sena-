# Design

## Context

La página `/admin/eventos/[id]/reporte` ya calcula su información con `cargarReporteEvento` y ofrece un único botón que descarga un `.xlsx` desde `/api/admin/eventos/[eventoId]/reporte/exportar`. Ese Route Handler valida la sesión de Administrador, interpreta `tipo` y `rol` de la query, y escribe dos hojas ("Resumen" y "Detalle") con ExcelJS. El runtime del endpoint es Node.js. No hay fuentes tipográficas propias en `public/` y el contenedor de producción corre sobre Alpine, por lo que conviene evitar dependencias que arrastren un navegador. Ver `proposal.md` para la motivación y la delta para el contrato observable.

## Goals / Non-Goals

**Goals:**

- Reutilizar `cargarReporteEvento` como única fuente de datos para ambas exportaciones.
- Compartir el parseo de filtros y las etiquetas de contexto entre XLSX y PDF para que no puedan divergir.
- Generar el PDF en el servidor dentro del runtime Node.js existente, sin cambios de esquema ni de reglas de negocio.
- Mantener el botón de XLSX y su endpoint exactamente como están.
- Hacer que el PDF sea legible, paginado y útil para imprimir, con resumen y desglose equivalentes a los del Excel.

**Non-Goals:**

- Reemplazar o modificar la exportación XLSX.
- Agregar firma, logo, encabezado institucional nuevo ni campos que no estén ya en el reporte.
- Crear una fila por checkpoint distinta del resumen/desglose actuales.
- Modificar cupos, checkpoints, inscripción pública, panel del operador ni base de datos.
- Generar el PDF en el cliente ni mediante renderizado de HTML/CSS.

## Decisions

### 1. Nuevo endpoint dedicado para PDF

Se agrega `GET /api/admin/eventos/[eventoId]/reporte/exportar/pdf` como Route Handler con `runtime = "nodejs"`. La página pasa el mismo sufijo de filtros (`?tipo=...&rol=...`) a ambos botones.

Alternativas consideradas:

- Añadir `?formato=pdf` al endpoint `/exportar`: evita una ruta nueva, pero obliga a modificar el handler existente y sus pruebas, aumentando el riesgo de regresión en XLSX. Se descarta.
- Un único endpoint que decida por `Accept`: hace la depuración y los enlaces menos explícitos. Se descarta.

### 2. `pdfkit` como dependencia de generación

Se instala `pdfkit` en dependencias de producción y `@types/pdfkit` como dependencia de desarrollo. PDFKit es una librería Node pura, funciona en Alpine y no requiere Chromium ni servicios externos.

Se usan las fuentes estándar Helvetica/Helvetica-Bold, que cubren los caracteres latinos y acentos españoles mediante WinAnsi. No se incorporan archivos `.ttf` en esta primera versión; si una prueba detecta caracteres mal codificados, se embebe una fuente y se documenta en esta sección.

Alternativas consideradas:

- `jspdf` + `jspdf-autotable`: cómodo para tablas en navegador, pero en servidor requiere fuentes adicionales para acentos y su API de buffers es menos natural en Node. Se descarta.
- `@react-pdf/renderer`: declarativo, pero agrega un árbol de renderizado y más peso para un documento que ya tiene su estructura definida. Se descarta.
- Puppeteer/Playwright: imprime HTML existente, pero incorpora Chromium al contenedor y es desproporcionado. Se descarta.

### 3. Separar datos de renderizado

Se extrae de la ruta XLSX a `src/lib/reportes/filtros-reporte.ts` (o módulo equivalente bajo `src/lib/reportes/`) la lógica pura para:

- convertir `searchParams` en `FiltrosReporte`;
- construir la descripción legible de filtros;
- construir el nombre base del archivo a partir del nombre del evento.

Ambos Route Handlers consumen ese módulo. `cargarReporteEvento` permanece sin cambios.

La construcción de las secciones del PDF se hace en una función pura que recibe `ReporteEvento` y la descripción de filtros, y devuelve filas/textos para resumen, desglose y notas. El renderizador de PDFKit solo dibuja esas estructuras. Esto permite probar el contenido sin necesidad de parsear el binario del PDF.

### 4. Estructura del documento

- Orientación apaisada para que el desglose quepa con columnas de checkpoint.
- Encabezado con nombre del evento, lugar, rango de fechas y filtros.
- Sección "Resumen" con las mismas columnas del XLSX: checkpoint, tipo, esperados, registrados, faltan y porcentaje.
- Sección "Detalle" con documento, nombre, tipo de persona, centro de formación, una columna por checkpoint visible y completados.
- Notas al pie con el contexto y el glosario ya usados en el XLSX.
- Encabezados repetidos al paginar y ajuste de columnas largas con salto de línea o truncamiento controlado.

La respuesta usa `Content-Type: application/pdf` y `Content-Disposition: attachment; filename="reporte-<slug>.pdf"`.

### 5. UI del botón

En la barra de acciones del reporte se conserva `Exportar XLSX` y se agrega `Exportar PDF` como botón `outline`, ambos enlazando con el mismo `sufijo` de filtros. No se sustituye el estilo ni el destino del botón existente.

### 6. Pruebas

- Integración: nuevo endpoint con sesión de Administrador devuelve 200, cabeceras PDF y bytes que empiezan con `%PDF`; con filtros, los datos expuestos por la función pura coinciden con `cargarReporteEvento`.
- Integración: sin sesión y con rol Operador el endpoint responde 401/403.
- Integración: evento sin datos produce un PDF válido con encabezados.
- E2E: la página muestra ambos botones y el enlace PDF conserva los filtros activos; se verifica la descarga con Playwright.

## Risks / Trade-offs

- [Tablas anchas con muchos checkpoints] → Usar orientación apaisada, repetir encabezados y probar con un evento con varios checkpoints; ajustar anchos o truncar textos largos.
- [Acentos o caracteres especiales mal codificados] → Verificar una prueba con `ñ` y vocales acentuadas; si la fuente estándar no los cubre, embeber un TTF en el siguiente paso.
- [Duplicación de lógica de filtros entre exportaciones] → Extraer el parseo a un módulo compartido y cubrirlo con pruebas antes de tocar las rutas.
- [Memoria al generar el PDF] → El reporte está acotado por el cupo del evento; se genera en memoria igual que el XLSX. Si aparecen eventos muy grandes, se reconsiderará el streaming.
- [Dependencia nueva en el build Docker] → Fijar versión en `package.json`/lockfile y ejecutar `npm run build` en contenedor como parte de la verificación.

## Migration Plan

No hay migración de datos. El despliegue consiste en instalar las dependencias, publicar la página con el botón nuevo y el Route Handler, y reconstruir la imagen de la app. La reversión consiste en retirar el botón, el endpoint y las dependencias; el XLSX queda intacto.

## Open Questions

(ninguna)
