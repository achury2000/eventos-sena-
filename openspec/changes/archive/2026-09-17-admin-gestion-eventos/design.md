## Context

Se parte del estado actual del repo (ver proposal.md): login funcional con
roles, proxy que restringe `/admin` por rol, seed con un Admin, un Operador y
centros de formación, y modelo de datos completo en `prisma/schema.prisma`
(`Evento`, `Checkpoint`, `EventoOperador`, `Usuario`, enums de estado). No hay
specs previas en OpenSpec. `src/app/admin/page.tsx` es un placeholder.

## Goals / Non-Goals

**Goals:**
- Panel de administración funcional para gestionar Operadores, eventos y
  checkpoints usando Server Actions (permitidas por CONTEXT.md sección 6 para
  módulos que no son inscripción/autoregistro).
- Validación server-side con Zod y guard de rol en cada acción (defensa en
  profundidad, porque las Server Actions no pasan por el proxy).
- Cero migraciones de schema: se usa el modelo existente tal cual.
- Preservar las reglas de negocio de CONTEXT.md (cupo cuenta personas, cancelar
  es UPDATE a `CANCELADO`, QR vive en `Checkpoint`, `resultado` no se crea).

**Non-Goals:**
- CRUD de Administradores, gestión del flag `activo` de checkpoints (es del
  Operador), inscripción/firma/autoregistro, rate limiting, paginación/filtros.
- Cambiar la estructura de la base de datos.

## Decisions

### Server Actions, no Route Handlers
CONTEXT.md sección 6 reserva Route Handlers para inscripción y autoregistro.
La gestión de administración es un módulo interno autenticado: se implementa
con Server Actions (`src/lib/actions/admin/*`), co-localizadas por dominio
(`operadores.ts`, `eventos.ts`, `checkpoints.ts`, `evento-operadores.ts`).
_Alternativa descartada:_ API REST con fetch desde el cliente, innecesaria aquí.

### Guard de rol en cada acción (`requireAdmin`)
Las rutas `/admin/*` ya están protegidas por el proxy, pero las Server Actions
no lo atraviesan. Se crea `src/lib/actions/admin/guard.ts` con `requireAdmin()`
que llama a `auth()` de `@/auth` y:
- sin sesión → `redirect("/login")`
- sesión con rol distinto a `ADMINISTRADOR` → `redirect("/")`
- OK → devuelve la sesión

Cada acción llama a `requireAdmin()` como primera línea. `redirect()` lanza una
excepción interna (NEXT_REDIRECT), por lo que las acciones quedan seguras si se
olvida un `return`.

### Validación con Zod
Nueva dependencia de runtime: `zod` (la usa CONTEXT.md sección 7 como estándar
de validación server-side; los formularios de inscripción públicos ya lo
usarán después). Esquemas en `src/lib/validations/admin.ts`:

- `operadorSchema`: `nombreCompleto` (3–150), `documento` (`^\d{6,12}$`),
  `email` (email), `password` (≥8), `tipoAfiliacion` (enum),
  `centroFormacionId` (uuid, requerido para SENA / opcional EXTERNO).
- `eventoSchema`: `nombre`, `descripcion?`, `lugar`, `fechaInicio`,
  `fechaFin`, `inscripcionApertura`, `inscripcionCierre` (ISO string desde
  `datetime-local`), `cupoMaximo` (int ≥ 1), `incluyeHotel`,
  `incluyeBus`, `estado`. Con `.refine()` para
  `fechaInicio < fechaFin` e `inscripcionApertura < inscripcionCierre`.
  `cuposOcupados` NO está en el esquema (no se edita manualmente).
- `checkpointSchema`: `nombre` (1–120), `tipo` (enum `TipoCheckpoint`).

Los formularios client reutilizan el patrón `useActionState` de
`login-form.tsx`. El estado devuelto es un objeto
`{ error?: string; errors?: Record<string,string> }` mapeado desde
`z.flatten()` para mostrar errores por campo.

### Modelo del "por qué" del estado de evento
Transiciones restringidas por tabla de estados (helper
`estadosSiguientes(actual)` en la capa de validación/acciones):

- `PLANEADO → INSCRIPCIONES_ABIERTAS | CANCELADO`
- `INSCRIPCIONES_ABIERTAS → CERRADO | CANCELADO`
- `CERRADO → FINALIZADO | CANCELADO`
- `FINALIZADO → CANCELADO`
- `CANCELADO → ∅`

Un evento `CANCELADO` no cambia de estado. La página de detalle renderiza solo
las transiciones permitidas y la acción valida de nuevo el destino.

### Eliminación de eventos: engaño del Restrict
Borrar un evento con inscripciones choca con `onDelete: Restrict` de
`Inscripcion.evento` (intencional en el schema). El flujo: `try { delete }`
y capturar el error Prisma `P2003` para devolver un mensaje amigable
("tiene inscripciones; cancelalo en su lugar"). La acción de eliminar recibe
confirmación explícita del cliente (`confirm()`), igual que para checkpoints.

### Token QR de checkpoint
`Checkpoint.codigoQr` tiene `@default(uuid())` en el schema: la creación no
envía `codigoQr` y la base lo genera único. No se expone edición del token.

### M:N EventoOperador
Asignación/desasignación desde la pestaña de Operadores del detalle del
evento. `operadorId` se valida contra la tabla de `OPERADOR`. La restricción
única `@@id([eventoId, operadorId])` cubre el duplicado (P2002) — se captura y
se trata como éxito/operación idempotente.

### Rutas de UI
- `/admin` → dashboard: lista de eventos (name, lugar, fechas, estado,
  `cuposOcupados`/`cupoMaximo`) + acceso a operadores.
- `/admin/operadores` (lista) + `/admin/operadores/nuevo` (form).
- `/admin/eventos` (lista) + `/admin/eventos/nuevo` (form) +
  `/admin/eventos/[id]` (detalle) con secciones "Checkpoints" y "Operadores".

Páginas server components que consultan con `prisma` de `@/lib/prisma`;
mutaciones via Server Actions; tras cada mutación `revalidatePath` del listado
y del detalle afectado antes de un `redirect` final.

## Risks / Trade-offs

- [Zona horaria en fechas: `datetime-local` manda valores "locales" sin offset;
  `new Date(value)` los interpreta en TZ del servidor] → Aceptado para uso
  interno (equipo del SENA en Colombia, despliegue único); se documenta que el
  reporte final de horarios debe revisar TZ.
- [Eliminación de checkbox con registros borra evidencia (Cascade)] → Mitigado
  con confirmación explícita y porque el checkpoint pertenece a la
  configuración de un evento; la evidencia de asistencia se preserva de todos
  modos vía los demás módulos. El riesgo es aceptado en la spec.
- [Última escritura gana en ediciones concurrentes de un evento] → Aceptado
  (uso interno, pocos editores).
- [`cuposOcupados` desactualizado si se elimina/cancela mal] → Solo debe
  decrementar vía el motor de inscripciones (módulos posteriores); aquí no se
  toca, evitando inconsistencias.
- [Zod + useActionState: formularios no validan en vivo] → Validación de
  cliente mínima (attributos HTML) más validación server completa; suficiente
  para módulo interno.

## Migration Plan

Sin migración de schema. Pasos:
1. `npm install zod`.
2. Implementación incremental (tareas en tasks.md): operadores → eventos →
   checkpoints/asignación, verificando build/lint tras cada paquete.
3. Rollback: revertir el commit del módulo; la aplicación sigue funcionando sin
   las nuevas rutas porque el login y el proxy son independientes.

## Open Questions

Ninguna que bloquee la implementación. (Posibles refinamientos futuros —
paginación, filtros, reportería — no cambian specs ni tareas actuales.)