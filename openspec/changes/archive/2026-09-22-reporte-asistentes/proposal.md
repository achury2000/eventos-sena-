# Proposal

## Why

El paso 8 del flujo de negocio (CONTEXT.md §3) — "al cerrar el evento, el Administrador exporta el reporte de asistentes esperados vs. asistencia real por checkpoint" — no existe en la plataforma. Inscripciones y checkpoints ya generan los datos, pero no hay ninguna forma de consultarlos ni exportarlos, así que el ciclo del evento no se puede cerrar de forma útil.

## What Changes

- Nueva página en el panel Admin: `/admin/eventos/[id]/reporte`, visible solo para Administradores, disponible en cualquier estado del evento (sirve de vista en vivo durante el evento y de reporte final al cerrar).
- **Resumen por checkpoint**: por cada checkpoint del evento (nombre, tipo), total de asistentes esperados, registrados (real), diferencia y porcentaje de asistencia.
- **Desglose por persona**: cada asistente esperado (inscripción no cancelada) con los checkpoints que marcó y los que faltó, más filtros por tipo de checkpoint y por titular/acompañante.
- **Exportación XLSX**: un botón descarga un único archivo `.xlsx` con dos hojas ("Resumen" y "Detalle por persona"), generado con la librería `exceljs`.
- Definición de "esperado": asistente cuya inscripción **no** está `CANCELADA` (los estados `CONFIRMADO`/`NO_ASISTIO` no tienen acción hoy, así que vigente = esperado).

## Capabilities

### New Capabilities

- `admin/reportes`: consulta y exportación por el Administrador del reporte de asistentes esperados vs. asistencia real por checkpoint (resumen por checkpoint, desglose por persona, filtros y exportación a XLSX).

### Modified Capabilities

- (ninguna: no cambia comportamiento de capabilities existentes; los datos del reporte se leen, no se modifican)

## Impact

- `src/lib/reportes/cargar-reporte.ts` (nuevo): tipos y consultas eficientes del reporte (patrón `src/lib/operador/tablero.ts`, sin N+1).
- `src/app/admin/eventos/[id]/reporte/page.tsx` (nuevo): página server con `requireAdmin()`.
- Componentes UI de tablas y filtros del reporte (patrón de formularios/admin existentes).
- `src/app/api/admin/eventos/[eventoId]/reporte/exportar/route.ts` (nuevo): Route Handler Node con `auth()` + rol `ADMINISTRADOR` que genera el `.xlsx` con `exceljs` (patrón `src/app/api/admin/eventos/[eventoId]/asistentes/route.ts`).
- Dependencia nueva: `exceljs` (fijada con `--save-exact`, CONTRIBUTING §4 avisa antes de instalar — conversación con el equipo registrada; solo se escribe XLSX, no se lee input del usuario).
- `src/app/admin/eventos/[id]/page.tsx`: enlace a la página de reporte desde el detalle del evento.
- Sin cambios en `prisma/schema.prisma` (no hace falta migración) ni en rutas públicas ni en el panel del Operador.