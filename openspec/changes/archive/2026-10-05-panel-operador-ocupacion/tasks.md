# Tasks

## 1. Tablero del Operador (server)

- [x] 1.1 En `src/lib/operador/tablero.ts`: extender `CheckpointTablero` con `habitacion?: { capacidad: number; ocupados: number }` e incluir en el `select` de `checkpoints` la relación `habitacion: { select: { capacidad: true, _count: { select: { asistentes: true } } } }`. Al mapear, exponer `habitacion` (con `ocupados = _count.asistentes`) solo cuando existe. Verificar con `npx tsc --noEmit` que tipa y que no hay queries nuevas (sigue siendo un solo `findMany`).

## 2. Panel del Operador (UI)

- [x] 2.1 En `src/app/operador/panel-operador.tsx`: cuando `checkpoint.habitacion` existe, mostrar bajo la línea de "registrados" una línea secundaria `Ocupación del cuarto: {ocupados}/{capacidad}` (mismo estilo `text-sm text-muted-foreground`). Los checkpoints sin habitación no muestran la línea.

## 3. Verificación integral

- [x] 3.1 Probar en dev con el Operador: en el panel, el checkpoint de una habitación (ej. "Habitación 601") muestra el conteo de registrados (`X/5`) y la ocupación (`asignados/capacidad`); asignar un asistente al cuarto en el admin y confirmar que la ocupación sube en el siguiente sondeo (~5 s) sin recargar; un checkpoint manual (ej. "Almuerzo") no muestra la línea de ocupación.
- [x] 3.2 Guardar contra regresiones: sondeo `GET /api/operador/dashboard` responde `200` con el campo nuevo cuando aplica (`401`/`403` sin sesión de Operador); toggle de activo y registro manual siguen funcionando; y `openspec validate --changes panel-operador-ocupacion --strict` pasa con el árbol de trabajo limpio de scripts temporales.