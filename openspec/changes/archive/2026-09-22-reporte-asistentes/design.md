# Design

## Context

El flujo de negocio ya genera los datos necesarios para el reporte: `Asistente` guarda a cada persona con `eventoId` denormalizado y `inscripcion.estado` (para distinguir vigente de cancelada), y `RegistroControl` crece con cada autoregistro/registro manual (con `@@index([checkpointId])` pensado para los COUNT del dashboard, CONTEXT.md §6). Lo que falta es leerlos. Existen patrones consolidados que se reutilizan tal cual:

- **Consultas eficientes sin N+1**: `src/lib/operador/tablero.ts` (un `findMany` + un `groupBy`).
- **Endpoints admin**: `src/app/api/admin/eventos/[eventoId]/asistentes/route.ts` (`runtime = "nodejs"`, `auth()` + rol `ADMINISTRADOR`, 401/403/404).
- **UI admin**: página server con `requireAdmin()` + componentes cliente con `"use client"` (detalle del evento, `inscripciones/page.tsx`).

Ver proposal.md — Why para la motivación; los requisitos de comportamiento están en `specs/admin/reportes/spec.md`.

## Goals / Non-Goals

**Goals:**
- Reporte consultable en pantalla (resumen por checkpoint + desglose por persona) y exportable a un único `.xlsx` con dos hojas.
- Cargador de datos independiente de la UI (testable, patrón `tablero.ts`) compartido entre la página y la exportación.
- Filtros por tipo de checkpoint y titular/acompañante aplicados en el servidor (re-consulta con searchParams).
- Sin cambios en `prisma/schema.prisma` ni migraciones; sin tocar rutas públicas ni el panel del Operador.

**Non-Goals:**
- Estados `CONFIRMADO`/`NO_ASISTIO` (requieren decisión de negocio sobre quién los marca — change separado).
- Visor de firma (URL firmada temporal) — change separado.
- Reportes de ocupación de hotel.
- Los asistentes/datos del reporte no se modifican desde el reporte (solo lectura).

## Decisions

### 1. Cargador único `src/lib/reportes/cargar-reporte.ts`

Un módulo de servidor que devuelve el reporte completo del evento (checkpoints con registrados, asistentes esperados con sus registros por checkpoint), tipado en TS. Se usa desde la página server y desde el Route Handler de exportación — una sola fuente de verdad. La consulta principal es un `asistente.findMany` (esperados, con `registrosControl` por checkpoint incluido) + el conteo por checkpoint; con límite de ~1000 personas por evento no hay problema de volumen (Igual patrón de `tablero.ts`; si el volumen creciera, se migraría a `groupBy`).

### 2. Filtros como query params en la página server

Los filtros (`tipo` de checkpoint y `rol` titular/acompañante) se leen de `searchParams` y se aplican en la consulta del servidor, con la convención clásica de URL (`?tipo=COMIDA&rol=titular`). Filtros de la página y la exportación comparten el mismo parámetro → exportar siempre lo que se ve. Alternativa considerada: filtros cliente con estado local y filtrado del JSON — descartada porque duplica la lógica y complica "exportar lo que ves".

### 3. Exportación XLSX con `exceljs` en el Route Handler

`GET /api/admin/eventos/[eventoId]/reporte/exportar` (auth + rol, patrón `asistentes/route.ts`) construye el workbook en memoria (`workbook.xlsx.writeBuffer()`) con dos hojas ("Resumen" y "Detalle") y lo devuelve con `Content-Disposition: attachment`. 

**Por qué `exceljs` y no otra cosa:** la búsqueda previa mostró que `xlsx`/SheetJS tiene el registry de npm roto (0.18.5 viejo, la versión segura solo vía CDN con vendoring) y `@protobi/exceljs` es un fork no oficial. `exceljs` 4.4.0 es el estándar maduro (2800+ dependientes) aunque sin mantenimiento activo reciente — riesgo aceptable porque aquí **solo se escribe** el archivo (nunca se lee input del usuario), y la generación se fija con `--save-exact`. Alternativa considerada: CSV sin dependencias (descarta por UX: dos archivos o pierde el resumen por checkpoint con %; además obliga a mitigar inyección de fórmulas). Con `exceljs` los valores se escriben como datos tipados (números reales, texto), lo que evita de raíz que Excel interprete celdas como fórmulas.

### 4. Enlace desde el detalle del evento

Un enlace/botón "Reporte de asistentes" en `src/app/admin/eventos/[id]/page.tsx` apuntando a `/admin/eventos/[id]/reporte`, visible para el Administrador (la página entera ya está tras `requireAdmin()`).

## Risks / Trade-offs

- **`exceljs` sin mantenimiento activo** → Solo se usa para escritura (superficie mínima); si apareciera un problema, la exportación es opcional y el reporte en pantalla no depende de ella. Dependencia fijada con `--save-exact`.
- **Filtros re-consultan la base** → Aceptable: 1000 asistentes por evento y consulta indexada (`eventoId` + `@@index([checkpointId])`); cada cambio de filtro es una recarga de página (patrón server components).
- **Desglose con registros anidados por asistente** → Trivial a la escala del proyecto; si creciera, migrar a `groupBy` como documenta `tablero.ts`.

## Migration Plan

1. `npm install exceljs --save-exact` (avisado: CONTRIBUTING §4, solo escritura).
2. Implementar `cargar-reporte.ts` → página `/reporte` + componentes → Route Handler de exportación → enlace en el detalle.
3. Verificación: `npm run lint`, `npx tsc --noEmit`, prueba manual (evento con inscripciones y registros en varios checkpoints; descargar y abrir el `.xlsx` con las dos hojas; evento sin datos).
4. Rollback: revertir el commit de la feature; retirar `exceljs` de `package.json` si es necesario. No hay migración de datos.

## Open Questions

Ninguna pendiente: las decisiones de negocio (reporte siempre disponible, resumen + desglose, exportación en un único `.xlsx` con dos hojas) fueron confirmadas con el equipo antes de proponer.