## Why

Tras el panel de administración (eventos, operadores, checkpoints), el sistema no tiene forma de recibir inscripciones reales de asistentes. El flujo de negocio comienza cuando un titular se inscribe a un evento —sin esa pieza, no hay datos de prueba para los módulos operativos (autoregistro, checkpoints, reportes) ni para validar el diseño del schema.

## What Changes

- **Ruta pública de inscripción** (`/inscripcion/[eventoId]`): formulario del titular con acompañantes (máx. 10), consentimiento de tratamiento de datos y firma digital única que cobija al grupo.
- **Firma digital**: captura en canvas (`react-signature-canvas`), subida de imagen PNG a MinIO/S3 privado (bucket `firmas-digitales`, ya configurado en docker-compose), y persistencia de la referencia en `Inscripcion.firmaUrl`.
- **Route Handler POST `/api/inscripciones`**: transacción atómica de cupo (patrón `cuposOcupados + total <= cupoMaximo` con `$executeRaw`), que incrementa por el **total de personas** (titular + acompañantes), con manejo de `P2002` (documento duplicado en mismo evento) y limpieza de huérfanos de firma en caso de fallo.
- **Route Handler POST `/api/inscripciones/[id]/cancelar`**: cancela inscripción (solo Administrador autenticado) y decrementa `cuposOcupados` por el mismo total de personas en la misma transacción. Rechaza si ya está cancelada o si el evento finalizó.
- **Página admin** `/admin/eventos/[id]/inscripciones`: lista de inscripciones del evento con titular, cantidad de acompañantes, correo, fecha, estado y botón de cancelación con confirmación.
- **Sin cambios de schema**: el modelo `Inscripcion`, `Asistente` y la transacción atómica ya están definidos en el schema existente.

## Capabilities

### New Capabilities

- `inscripcion-publica`: inscripción de asistentes por URL pública (titular + acompañantes, firma digital, cupo atómico) y cancelación por Administrador con decremento atómico de cupos.

### Modified Capabilities

<!-- Ninguna capability existente cambia sus requisitos. -->

## Impact

- **Código:** nuevas rutas en `src/app/api/inscripciones/`, nuevas páginas en `src/app/inscripcion/[eventoId]/`, nueva página admin en `src/app/admin/eventos/[id]/inscripciones/`, nuevo módulo `src/lib/storage.ts`, nuevo archivo de validaciones `src/lib/validations/inscripcion.ts`.
- **Dependencias nuevas:** `@aws-sdk/client-s3` (subida de firma a MinIO/S3), `react-signature-canvas` (captura en canvas) y `@types/react-signature-canvas`.
- **Base de datos:** no requiere migración; usa las entidades existentes.
- **Seguridad:** el Route Handler de inscripción es público (sin auth). El de cancelación requiere sesión `ADMINISTRADOR` (validada en el handler, no en el proxy). La firma se almacena en bucket privado, solo accesible con URL firmada para el Administrador.
- **Fuera de alcance:** notificación por correo (Resend), generación de QR, autoregistro por checkpoint, panel del Operador, rate limiting y headers de seguridad.
