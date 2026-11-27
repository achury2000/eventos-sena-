## Why

Tras el login (módulo 1), no hay forma de crear los eventos que el resto del
sistema consume: inscripciones, checkpoints y autoregistro dependen de que un
Administrador pueda dar de alta eventos, configurar sus checkpoints y asignar
Operadores. Sin esto, ningún módulo público puede probarse contra datos reales.

## What Changes

- El panel `/admin` deja de ser un placeholder y pasa a ser un dashboard con
  el listado de eventos y acceso a la gestión de Operadores.
- **CRUD de Operadores** (`/admin/operadores`): crear cuentas de Operador
  (nombre, documento, correo, contraseña asignada por el Admin, tipo de
  afiliación, centro de formación), listarlas y eliminarlas. Nunca crea
  cuentas de Administrador.
- **CRUD de Eventos** (`/admin/eventos`): crear, listar, ver detalle, editar y
  eliminar (solo si no tiene inscripciones) un evento. Validación de fechas,
  lugar, cupo y período de inscripción. Transición de estado
  `PLANEADO → INSCRIPCIONES_ABIERTAS → CERRADO → FINALIZADO` y `CANCELADO`
  (nunca borrar la evidencia: cancelar es un UPDATE de estado).
- **Asignación de Operadores a un evento** (M:N `EventoOperador`) desde el
  detalle del evento.
- **Checkpoints por evento** (`/admin/eventos/[id]/checkpoints`): crear,
  listar, editar y eliminar checkpoints (nombre libre + categoría `tipo`).
  `codigoQr` se genera automáticamente. El flag `activo` queda fuera de este
  alcance (lo controla el Operador el día del evento).
- Validación server-side con Zod en todas las acciones, y guard de
  autorización (rol `ADMINISTRADOR`) en cada server action.

## Capabilities

### New Capabilities
- `admin/operadores`: cuentas de Usuario con rol OPERADOR creadas por el
  Administrador (crear, listar, eliminar), sin registro público.
- `admin/eventos`: gestión de eventos (crear, listar, ver, editar, eliminar
  sin inscripciones), transición de estados incluida `CANCELADO`, y
  asignación de Operadores al evento.
- `admin/checkpoints`: configuración de checkpoints dentro de un evento
  (crear, listar, editar, eliminar) con `codigoQr` generado automáticamente.

### Modified Capabilities
- Ninguna (no existen specs previas en el proyecto).

## Impact

- **Código:** `src/app/admin/*` (dashboard, páginas de eventos y operadores),
  nuevas `src/lib/actions/admin/*` (server actions con zod + `requireAdmin()`),
  un helper `requireAdmin()` en `src/lib/actions` o `src/lib/auth`, y
  formularios client con `useActionState` siguiendo el patrón de
  `src/app/login/login-form.tsx`.
- **Dependencias:** se agrega `zod`.
- **Base de datos:** no requiere migración; usa el schema existente
  (`Evento`, `Checkpoint`, `EventoOperador`, `Usuario`).
- **Seguridad:** el proxy de `src/proxy.ts` ya restringe `/admin` por rol;
  las server actions agregan verificación propia de rol (no pasan por proxy).
- **Fuera de alcance:** CRUD de Admins, activación de checkpoints (Operador),
  rate limiting y headers de seguridad (módulos posteriores).