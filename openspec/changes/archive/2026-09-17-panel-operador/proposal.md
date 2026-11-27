## Why

El rol Operador ya existe (login y zona `/operador` protegida), pero `/operador` es un placeholder sin funcionalidad. Y como todo `Checkpoint` nace con `activo = false` (ver cambio `autoregistro-checkpoint`), sin un Operador que lo active el QR impreso no sirve el día del evento. Falta también la vista de supervisión en tiempo real y el registro manual para quien no tiene celular. CONTEXT.md §3.7 y §6 definen el dashboard (polling con `COUNT` agrupado por `checkpointId`) y la activación/desactivación de checkpoints como responsabilidad del Operador.

## What Changes

- **Guard `requireOperador()`**: exige sesión con rol `OPERADOR` para las acciones y route handlers del operador (Server Actions no pasan por el proxy; ver CONTEXT.md §6).
- **Layout del operador** (`src/app/operador/layout.tsx`): encabezado propio y reutilización de `BotonCerrarSesion`.
- **Dashboard** (`/operador`): lista los eventos asignados al Operador (`EventoOperador`) con sus checkpoints, mostrando por checkpoint `registros / asistentes del evento` y su estado activo.
- **Toggle de checkpoint** (Server Action): activa/desactiva `Checkpoint.activo` y SIEMPRE registra en `activadoPorId` al Operador que hizo el último cambio (CONTEXT.md §5); valida que el checkpoint pertenezca a un evento asignado.
- **Polling**: endpoint `GET /api/operador/dashboard` (runtime `nodejs`) que devuelve los conteos agrupados por `checkpointId` de los eventos asignados, consultado cada 5 s por un componente cliente (CONTEXT.md §6).
- **Registro manual asistido**: endpoint `POST /api/operador/registro-manual` (runtime `nodejs`, sesión de Operador, checkpoint de un evento asignado y `activo`) que reutiliza `registrarAsistenciaEnCheckpoint` con `metodo = "MANUAL"` y `operadorId` (CONTEXT.md §3.7/§4).

## Capabilities

### New Capabilities
- `panel-operador`: herramientas operativas del día del evento — activación/desactivación de checkpoints, tablero de asistencia en tiempo real por evento asignado y registro manual asistido con las mismas reglas de integridad del autoregistro.

### Modified Capabilities
<!-- Ninguna: el endpoint de autoregistro y su spec no cambian; el módulo compartido ya acepta metodo/operadorId. -->

## Impact

- **Código nuevo:** `src/lib/actions/operador/guard.ts` (`requireOperador`), `src/app/operador/layout.tsx`, reemplazo del contenido de `src/app/operador/page.tsx`, componentes cliente de polling/toggle/registro manual, `src/app/api/operador/dashboard/route.ts`, `src/app/api/operador/registro-manual/route.ts`.
- **Código reutilizado sin cambios:** `src/lib/registro-checkpoint.ts` (ya expone `ResultadoRegistro` y acepta `metodo`/`operadorId`), `src/components/admin/boton-cerrar-sesion.tsx`, `@@index([checkpointId])` de `RegistroControl`.
- **Base de datos:** sin migración; usa `Checkpoint.activo`/`activadoPorId` y `EventoOperador`.
- **Fuera de alcance:** rate limiting (cambio separado), reportes/exportación del Administrador, habitaciones, notificaciones por correo, PWA/offline, WebSockets (CONTEXT.md §6 pide polling, no tiempo real instantáneo).
