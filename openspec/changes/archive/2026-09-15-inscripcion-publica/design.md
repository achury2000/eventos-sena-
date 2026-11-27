## Context

El sistema ya tiene el modelo de datos completo (CONTEXT.md §5): `Inscripcion`/`Asistente` separados, `firmaUrl` en `Inscripcion`, `fechaAceptacionTratamiento`, `@@unique([eventoId, documento])` en `Asistente` y la transacción atómica de cupo especificada en §7. El panel de admin (eventos, operadores, checkpoints) ya está implementado con Server Actions + `requireAdmin()`. Falta la cara pública (inscripción) y la operación de cancelación por Admin. Ver `proposal.md` - Why.

El storage de firmas ya está preparado en la infra: MinIO en `docker-compose.yml` con bucket `firmas-digitales` y variables S3 en `.env.example`. No hay ningún cliente S3 ni manejo de firmas en `src/` aún. Los `.env` ya tienen `S3_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET/REGION`.

## Goals / Non-Goals

**Goals:**
- Transacción atómica de cupo testeable aisladamente (por eso Route Handlers y no Server Actions, per CONTEXT.md §6).
- Subida de firma a bucket privado con limpieza de huérfanos.
- Cancelación Admin-gated con decremento atómico en la misma transacción.
- Sin migraciones de schema.

**Non-Goals:**
- Notificación por correo (Resend), QR/autoregistro, panel del Operador, rate limiting, headers de seguridad, reportes.
- Acceso a la firma guardada vía URL firmada (se usará en el módulo de reportes).

## Decisions

### 1. Route Handler para inscripción y cancelación (no Server Actions)
Inscripción es un formulario público sin sesión y la condición de carrera del cupo debe probarse contra peticiones concurrentes con `curl`. Se usa `POST /api/inscripciones` (Node runtime) con `fetch` desde el cliente, no `useActionState`. La cancelación es Admin pero también es atómica y sensible a concurrencia; se mantiene como Route Handler por consistencia, validando sesión/rol dentro del handler (el proxy no cubre `/api`).

### 2. Firma como base64 dentro del JSON, no multipart
La firma (PNG de canvas, típicamente <50 KB) viaja en el cuerpo JSON como data URL. Es un tránsito HTTP, no persistencia (el ban de base64 es solo en DB, CONTEXT.md §6). Evita parsear multipart en el Route Handler y facilita las pruebas de concurrencia con `curl`. Alternativa descartada: subida directa vía presigned POST (más piezas móviles, sin beneficio para un formulario de uso ocasional).

### 3. Cliente S3 único con `forcePathStyle`
`@aws-sdk/client-s3` con `endpoint: S3_ENDPOINT`, `forcePathStyle: true` (requerido por MinIO), credenciales de env y `S3_REGION`. Claves de objeto: `inscripciones/<uuid>.png`. No se usa el presigner aún.

### 4. Respuestas HTTP tipadas en la capa de API
Resultado del autoregistro/inscripción como tipo TypeScript de la API (`OK | CUPO_LLENO | DOCUMENTO_DUPLICADO | ...`), nunca como columna ni como enum en DB (CONTEXT.md §4/§7). `RegistroControl` no se toca.

### 5. Transacción atómica exacta de CONTEXT.md §7
```ts
const totalPersonas = 1 + acompanantes.length;
const filas = await tx.$executeRaw`
  UPDATE "Evento" SET "cuposOcupados" = "cuposOcupados" + ${totalPersonas}
  WHERE id = ${eventoId}
    AND "cuposOcupados" + ${totalPersonas} <= "cupoMaximo"
    AND estado = 'INSCRIPCIONES_ABIERTAS'
`;
```
Se añade la guarda de `estado` en el propio `UPDATE` para que el rechazo por estado sea también atómico (no dependa de una consulta previa). El duplicado de documento se captura por `P2002`, nunca con verificación previa (§7).

### 6. Validación del periodo y estado del evento
Un helper `validarEventoParaInscripcion(evento)` compartido entre la página pública (para decidir qué renderizar) y el Route Handler (rechazo definitivo): estado `INSCRIPCIONES_ABIERTAS` + fecha dentro de `[inscripcionApertura, inscripcionCierre]`. La página pública es solo guiá; el handler es la autoridad.

### 7. Cancela con conteo real de asistentes activos
`cancelarInscripcion` calcula `totalPersonas` contando los `Asistente` de la inscripción (todas las filas, ya que al cancelar el grupo completo se libera todo) y hace `update` de estado + `$executeRaw` decremento en la misma `$transaction`, con guarda en el `UPDATE` del evento: `cuposOcupados - total >= 0` para no dejar números negativos por concurrencia.

### 8. Página admin dedicada
`/admin/eventos/[id]/inscripciones` (server component + `requireAdmin`), con link desde el detalle del evento. Listado paginado (`take: 50`, ordenado por `fechaInscripcion desc`) con contador total. El botón Cancelar usa `fetch` al endpoint y recarga la ruta (`router.refresh()`), siguiendo el patrón ya usado en el panel (aunque allí usan Server Actions, aquí el destino es el Route Handler).

## Risks / Trade-offs

- [Objetos huérfanos en MinIO si el proceso muere entre `putObject` y la transacción] → Mitigación: `try/catch/finally` con `deleteObject` en el camino de error; riesgo residual mínimo aceptado (un fallo duro del proceso puede dejar el archivo; la clave por UUID hace irrelevante la colisión).
- [Firma en base64 por HTTP incrementa el payload] → Tamaño pequeño (PNG de firma); se documenta límite de ~3 MB en el body update o validación de tamaño (max ~200 KB) en Zod para protegerse.
- [`estado` como guarda extra en el `UPDATE` de cupo cambia el mensaje de error para estado inválido (409 cupo) en vez de 400 periodo] → El handler valida periodo/estado antes de la transacción (400/403), y el `UPDATE` con guarda actúa como red de seguridad atómica bajo concurrencia (409). El cliente distingue por código HTTP.
- [Cancelación concurrente de la misma inscripción] → El `update` de estado filtra por `estado != 'CANCELADO'`; el que no gana es idempotente (`updated === 0` → `409`), el decremento solo ocurre si el update prevaleció.

## Migration Plan

- No hay migración de schema. Dependencias nuevas vía npm (`@aws-sdk/client-s3`, `react-signature-canvas`).
- Para probar en local: `docker compose up -d db storage` (crea el bucket `firmas-digitales` vía `storage-init`) y `npm run dev`.
- Rollback: revierte el change y desinstala dependencias; el schema y las tablas no cambian.

## Open Questions

- Ninguna. El mecanismo de cancelación (solo Admin, el titular se comunica) fue decidido con el usuario.