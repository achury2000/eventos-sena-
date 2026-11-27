# Proposal

## Why

Las firmas digitales se capturan y se guardan como evidencia en cada inscripción (`Inscripcion.firmaUrl`, almacenamiento S3/privado), pero el Administrador hoy no puede verlas: el acceso está pensado solo vía URL firmada y temporal (CONTEXT.md §6) y esa capacidad nunca se construyó. Queda un hueco en el flujo de evidencia del evento (aceptación de tratamiento de datos, compromiso del titular sobre su grupo).

## What Changes

- Agregar una función en `src/lib/storage.ts` que genere una **URL firmada y temporal** (presigned GET) para la firma de una inscripción. Implica instalar `@aws-sdk/s3-request-presigner` (nueva dependencia; `package.json` es un archivo compartido con la Persona B, hay que avisar antes de instalarla).
- Crear un endpoint de solo Administrador que valide evento + inscripción y responda redirigiendo (302) a la URL firmada (expiración corta, configurable como constante).
- Agregar en `src/app/admin/eventos/[id]/inscripciones/page.tsx` un botón **"Ver firma"** por inscripción que abre la firma del titular en una pestaña nueva.
- **Sin cambios de schema**: `firmaUrl` ya existe y es requerido en `Inscripcion`.
- No se modifica la lógica de inscripción ni de cancelación.

## Capabilities

### New Capabilities
- `admin/visor-firma`: el Administrador puede ver la firma digital del titular de una inscripción de un evento, generada como URL firmada y temporal desde el almacenamiento privado, con acceso restringido a rol `ADMINISTRADOR`.

### Modified Capabilities
- (ninguna — no cambia comportamiento de capacidades existentes)

## Impact

- **Código**: `src/lib/storage.ts` (nueva función de URL firmada), nuevo route handler `src/app/api/admin/eventos/[eventoId]/inscripciones/[inscripcionId]/firma/route.ts`, y `src/app/admin/eventos/[id]/inscripciones/page.tsx` (acción por fila).
- **Dependencia nueva**: `@aws-sdk/s3-request-presigner` (aviso requerido por CONTRIBUTING §4 antes de instalar).
- **Entorno**: reutiliza `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` ya configurados (MinIO en desarrollo, compatible con S3). Sin cambios en `.env.example`.
- **Especificaciones**: nueva capability `admin/visor-firma` (no toca `inscripcion-publica`, `panel-operador` ni `admin/reportes`).
- **Sin migraciones de base de datos.**