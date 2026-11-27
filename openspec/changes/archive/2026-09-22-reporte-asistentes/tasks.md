# Tasks

## 1. Dependencia

- [x] 1.1 Instalar `exceljs` con `npm install exceljs --save-exact` y verificar que `package.json` registra la versión sin `^`, que `npm run lint` y `npx tsc --noEmit` siguen pasando, y que el paquete importa sin error en Node (`node -e "require('exceljs')"`).

## 2. Cargador del reporte

- [x] 2.1 Crear `src/lib/reportes/cargar-reporte.ts` con los tipos del reporte (`ReporteEvento`, `CheckpointReporte` con esperados/registrados/diferencia/porcentaje, `AsistenteReporte` con marca por checkpoint y completados) y la función `cargarReporteEvento(eventoId)` que devuelve el evento (o `null` si no existe), sus checkpoints con `_count.registros` y los asistentes esperados (inscripción no `CANCELADO`) con sus `registrosControl`; verificar con `npx tsc --noEmit` y que la consulta no haga N+1 (un `findMany` de asistentes con include, patrón `tablero.ts`).
- [x] 2.2 Añadir en el mismo módulo la función `cargarReporteFiltrado(eventoId, filtros)` que aplica `tipoCheckpoint` (opcional) y `rol` (`titular`/`acompanante`, opcional) al resultado, reutilizable por página y exportación; verificar con `npx tsc --noEmit`.

## 3. Página del reporte (server)

- [x] 3.1 Crear `src/app/admin/eventos/[id]/reporte/page.tsx`: server component con `requireAdmin()`, carga el evento con `cargarReporteFiltrado` desde `searchParams`, usa `notFound()` si el evento no existe, y renderiza el resumen por checkpoint y el desglose por persona con los filtros activos; verificar manualmente que un Admin ve el reporte en cualquier estado y que un Operador/sin sesión es redirigido (via `requireAdmin`).
- [x] 3.2 Agregar enlace "Reporte de asistentes" en `src/app/admin/eventos/[id]/page.tsx` (junto a la cabecera del evento) que apunte a `/admin/eventos/[id]/reporte`; verificar que el enlace navega correctamente.

## 4. UI del reporte (cliente)

- [x] 4.1 Crear `src/app/admin/eventos/[id]/reporte/tabla-resumen.tsx` (cliente) que muestra por checkpoint: nombre, tipo, esperados, registrados, diferencia y porcentaje, con el formato de fechas/etiquetas de `src/lib/labels.ts`; verificar que renderiza y que un checkpoint sin registros muestra 0/0%.
- [x] 4.2 Crear `src/app/admin/eventos/[id]/reporte/tabla-desglose.tsx` (cliente) que muestra por asistente: documento, nombre, titular/acompañante, estado por checkpoint (`SÍ`/`NO`) y completados; verificar que muestra correctamente los asistentes con sus checkpoints marcados y faltados.
- [x] 4.3 Crear `src/app/admin/eventos/[id]/reporte/filtros.tsx` (cliente) con selects de tipo de checkpoint y titular/acompañante que navegan con los `searchParams` (enlace/`router.push`), preservando el filtro opuesto; verificar que cambiar un filtro recarga la página con la URL actualizada y los datos filtrados en servidor.

## 5. Exportación XLSX

- [x] 5.1 Crear `src/app/api/admin/eventos/[eventoId]/reporte/exportar/route.ts` (GET, `runtime = "nodejs"`, `auth()` + rol `ADMINISTRADOR`, `404` si el evento no existe) que construye con `exceljs` dos hojas —"Resumen" (checkpoint, tipo, esperados, registrados, diferencia, porcentaje) y "Detalle" (documento, nombre, titular/acompañante, centro, estado por checkpoint, completados)— con cabeceras y anchos de columna, devolviendo `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition: attachment; filename="reporte-<evento>.xlsx"`; verificar con `npx tsc --noEmit` y que el archivo descargado abre en Excel/hoja de cálculo con ambas hojas.

## 6. Verificación integral

- [x] 6.1 Correr `npm run lint` y `npx tsc --noEmit` sin errores.
- [x] 6.2 Prueba manual end-to-end: evento con inscripciones (incluida una cancelada) y registros en varios checkpoints → el resumen y desglose muestran los números correctos (esperados excluyen cancelados), los filtros funcionan, y la exportación descarga un `.xlsx` con las dos hojas coherentes con lo visible.
- [x] 6.3 Validar el change con `openspec validate 2026-09-22-reporte-asistentes --strict` y `openspec validate --specs` sin errores.