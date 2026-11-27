# Proposal: Exportar el reporte de asistentes a PDF

## Why

El Administrador ya puede descargar el reporte de asistentes en XLSX, pero ese formato no es conveniente para compartir o imprimir una fotografía del estado del evento. Agregar una exportación PDF permite entregar el mismo resumen y desglose en un documento legible y paginado, sin reemplazar el flujo de Excel.

## What Changes

- Mantener el botón y el endpoint actuales de exportación a XLSX sin cambios de comportamiento.
- Agregar un botón `Exportar PDF` en la página del reporte que descargue un documento con el mismo resumen por checkpoint y desglose por persona que el XLSX.
- Aplicar al PDF los mismos filtros vigentes de tipo de checkpoint y de titular/acompañante, además de los encabezados de evento y las notas de contexto del archivo.
- Reutilizar la carga de datos existente (`cargarReporteEvento`) para que ambas exportaciones no puedan divergir en métricas.
- Proteger el nuevo endpoint con la misma autorización de Administrador que ya aplica a la exportación XLSX.
- Incorporar `pdfkit` como dependencia de servidor para generar el documento en el runtime Node.js, sin navegador ni renderizado de HTML.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `admin/reportes`: agregar el requisito de exportación a PDF con los mismos datos, filtros y control de acceso que la exportación XLSX.

## Impact

- `src/app/admin/eventos/[id]/reporte/page.tsx`: nuevo botón junto a `Exportar XLSX`.
- Nuevo Route Handler para la descarga del PDF, con el mismo patrón de autenticación y parámetros de filtro que el endpoint XLSX.
- Posible extracción del parseo de filtros y las etiquetas compartidas a un módulo de servidor para evitar duplicación.
- Dependencias: `pdfkit` en runtime y `@types/pdfkit` para tipos.
- Pruebas de integración para el nuevo endpoint y prueba E2E de presencia/descarga del botón.
- Sin cambios en esquema, migraciones, reglas de cupo, checkpoints ni inscripción pública.
