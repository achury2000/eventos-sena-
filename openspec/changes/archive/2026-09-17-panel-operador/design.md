## Context

Ver `proposal.md` - Why. El rol `OPERADOR` ya existe y `/operador` está protegido por `src/proxy.ts`, pero la página es un placeholder. El guard actual es `requireAdmin()` en `src/lib/actions/admin/guard.ts` (patrón a espejo). El cambio `autoregistro-checkpoint` ya dejó `src/lib/registro-checkpoint.ts` con `registrarAsistenciaEnCheckpoint` y el tipo `ResultadoRegistro`, y `RegistroControl` ya tiene `@@index([checkpointId])`. `Checkpoint.activadoPorId` existe y CONTEXT.md §5 lo define como "quién hizo el último cambio de `activo`". Contrato de polling fijado en CONTEXT.md §6 (5-10 s, `COUNT` agrupado por `checkpointId`, sin WebSockets).

## Goals / Non-Goals

**Goals:**
- El Operador activa/desactiva checkpoints de sus eventos asignados, dejando traza en `activadoPorId`.
- Vista de supervisión con `registros / asistentes con inscripción vigente` por checkpoint, actualizada por polling.
- Registro manual asistido con la misma integridad que el autoregistro.

**Non-Goals:**
- Reportes/exportación (Administrador), habitaciones, notificaciones, rate limiting, PWA/offline.
- Tiempo real instantáneo (WebSockets/pub-sub) — CONTEXT.md §6 pide polling.
- Cambiar el schema o el endpoint público de autoregistro.

## Decisions

**D1 — Guard `requireOperador()` (espejo de `requireAdmin`)**: nuevo `src/lib/actions/operador/guard.ts`; sin sesión → `redirect("/login")`, rol distinto de `OPERADOR` → `redirect("/")`. Los Route Handlers NO usan `redirect()` (cortaría con una respuesta HTML); validan con `auth()` y devuelven JSON `401`. *Alternativa descartada:* confiar solo en `src/proxy.ts` — las Server Actions no pasan por el proxy (CONTEXT.md §6).

**D2 — Toggle por Server Action `cambiarEstadoCheckpoint`**: `src/lib/actions/operador/checkpoints.ts`. Recibe `checkpointId` y el valor objetivo `activo` desde el formulario. `requireOperador()` y luego delega en `cambiarEstadoCheckpointDeEvento(checkpointId, operadorId, activo)` (`src/lib/operador/checkpoints.ts`): carga el checkpoint y verifica la asignación con `prisma.eventoOperador.findUnique({ where: { eventoId_operadorId } })`; si no está asignado → error, sin escribir. Actualiza `activo` y `activadoPorId = session.user.id` (siempre, tanto al activar como al desactivar, porque es "último cambio" y no historial — §5); la acción luego `revalidatePath("/operador")`. El núcleo se separa de la acción para poder verificarlo contra la base de datos sin contexto de request. *Alternativa descartada:* invertir el valor leído dentro de la acción — enviar el objetivo es idempotente ante reintentos.

**D3 — Carga del tablero centralizada, sin N+1**: `src/lib/operador/tablero.ts` expone `cargarTableroOperador(operadorId)` (server-only) usada por la página y por el endpoint. Un solo `prisma.evento.findMany` con `where: { operadores: { some: { operadorId } } }`, `include.checkpoints` y un `_count` filtrado `asistentes: { where: { inscripcion: { estado: { not: "CANCELADO" } } } }` para el denominador (decisión confirmada con el usuario: asistentes con inscripción vigente, no `cuposOcupados`, por estar derivado de filas reales y alinearse con "asistentes esperados" de §3.8). Los numeradores por checkpoint se obtienen con un único `registroControl.groupBy({ by: ["checkpointId"], where: { checkpoint: { eventoId: { in } } }, _count: { _all: true } })` y se arma un `Map<checkpointId, number>`. *Alternativa descartada:* `cuposOcupados` como denominador; y repetir las consultas en la página y en el endpoint.

**D4 — Endpoint de polling `GET /api/operador/dashboard`**: runtime `nodejs`; `auth()`; si no es `OPERADOR` responde `401`. Devuelve `{ eventos: [{ id, nombre, totalAsistentes, checkpoints: [{ id, nombre, tipo, activo, registros }] }] }`, reutilizando `cargarTableroOperador`. Incluye `activo` para que el toggle también se refleje en el sondeo. El cliente `PanelOperador` refresca cada 5000 ms con `setInterval` y una bandera para no solapar peticiones (evita carreras si una respuesta tarda). *Alternativa descartada:* `router.refresh()` periódico — re-renderiza todo el RSC y contradice el contrato de endpoint con `COUNT` de §6.

**D5 — Registro manual `POST /api/operador/registro-manual`**: runtime `nodejs`; body `{ checkpointId, documento }` validado con Zod (6-12 dígitos, reutilizando el patrón de `src/lib/validations/inscripcion.ts`). `auth()`; sin rol `OPERADOR` → `401`. Verifica `EventoOperador(checkpoint.eventoId, operadorId)` → `403` si no aplica. Llama a `registrarAsistenciaEnCheckpoint(checkpoint, documento, { metodo: "MANUAL", operadorId })` y mapea: `OK`→201, `YA_REGISTRADO`→409, `NO_ENCONTRADO`→404, `CHECKPOINT_NO_ACTIVO`→422; `400` para documento inválido; `500` para fallos inesperados. El mapa de mensajes/estados vive local a este handler (incluye el caso `403` que `ResultadoRegistro` no tiene); no se toca el endpoint de autoregistro del cambio anterior.

**D6 — Estructura de UI**: `src/app/operador/layout.tsx` con encabezado y `BotonCerrarSesion` reutilizado; `page.tsx` (server) obtiene el snapshot inicial con `cargarTableroOperador` y lo pasa a `PanelOperador` (client). El panel lista eventos como tarjetas; por checkpoint muestra nombre, categoría, ratio `registros / totalAsistentes`, el botón de toggle (`useActionState` con `cambiarEstadoCheckpoint`) y un `FormRegistroManual` (client) que hace `fetch` al endpoint y muestra el resultado permitiendo reintentar. El estado `activo` y los conteos se reconcilian con el polling.

**D7 — Sin cambios en `registro-checkpoint.ts`**: ya acepta `metodo`/`operadorId` y ya devuelve `CHECKPOINT_NO_ACTIVO`, que es exactamente la regla confirmada (el registro manual exige checkpoint activo). `labels.ts` y `BotonCerrarSesion` se reutilizan tal cual.

## Risks / Trade-offs

- **Polling que se solapa si la respuesta tarda >5 s** → bandera "en vuelo" en el cliente; se ignora el tick si la petición anterior no terminó.
- **Denominador dependiente de estados de inscripción** (no de un contador) → alineado con los datos reales; el costo es una subconsulta de `_count` filtrado por evento, amortiguada porque un Operador tiene pocos eventos.
- **Dos Operadores alternando el mismo checkpoint**: gana el último cambio (coherente con §5, que registra solo el último). No es un historial; documentado.
- **Toggle optimista vs. polling**: el endpoint devuelve `activo`, así que un toggle que falle revierte visualmente en el siguiente sondeo, sin lógica especial.
- **Endpoints autenticados sin rate limiting** → riesgo menor por requerir sesión de Operador; rate limiting sigue fuera de alcance (cambio separado).

## Migration Plan

Sin migración de base de datos. Solo código nuevo sobre `EventoOperador`, `Checkpoint.activo`/`activadoPorId` y `RegistroControl`. Rollback = revertir la rama `feature/operator-dashboard`.

## Open Questions

Ninguna que cambie specs, enfoque o descomposición de tareas.