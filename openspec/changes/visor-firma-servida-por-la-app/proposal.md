# Proposal

## Why

El visor de firma del Administrador no funciona en el despliegue con Docker: el
endpoint responde `302` hacia una URL firmada cuyo host es el **nombre interno
del servicio de almacenamiento** (`http://storage:9000`), que solo existe dentro
de la red de Docker. El navegador del Administrador no puede resolverlo, así que
la pestaña que abre el enlace "Ver firma" queda en un error de carga. Reproducido
con la Location real del contenedor:

```
GET /api/admin/eventos/{eventoId}/inscripciones/{inscripcionId}/firma
HTTP/1.1 302 Found
location: http://storage:9000/firmas-digitales/inscripciones/{id}.png?X-Amz-Signature=…
```

El diseño original (change archivado `2026-10-05-admin-visor-firma`) asumía que el
navegador podía alcanzar el endpoint del bucket; su sección de riesgos lo dejaba
como verificación pendiente para producción y nadie lo comprobó en el contenedor.
`docker-compose.yml` sobrescribe `S3_ENDPOINT` con el hostname interno —correcto
para que la app suba y borre firmas, insuficiente para *firmar* la URL que abre
el navegador—. En desarrollo sin contenedor (`.env` con
`S3_ENDPOINT=http://localhost:9000`) el fallo no se manifiesta, y el visor
tampoco tenía pruebas: el e2e de inscripción verifica que la fila aparece, pero
nunca hace clic en "Ver firma".

## What Changes

- El visor deja de redirigir a una URL firmada del almacenamiento y **sirve la
  imagen él mismo**: valida la sesión y el rol, lee el objeto del almacenamiento
  privado con las credenciales del servidor (la misma conexión interna que ya se
  usa para subir y borrar) y devuelve los bytes de la imagen en su propia
  respuesta. El navegador ya no necesita alcanzar el almacenamiento.
- `src/lib/storage.ts`: nueva función `leerFirma(clave)` (GetObject) y retiro de
  `urlFirma()` y `EXPIRACION_FIRMA_SEG`, que quedan sin uso.
- El endpoint `GET /api/admin/eventos/[eventoId]/inscripciones/[inscripcionId]/firma`
  responde `200` con `Content-Type: image/png`, `Content-Disposition: inline` y
  `Cache-Control: private, no-store`. Conserva el `404` uniforme cuando la
  inscripción no existe o no pertenece al evento, responde `404` cuando el objeto
  no está en el almacenamiento (hoy el navegador recibía un `403` del bucket) y
  `500` solo en fallos del almacenamiento.
- El enlace "Ver firma" del listado de inscripciones deja de precargar la ruta:
  una lectura del almacenamiento por fila renderizada no aporta nada.
- **Sin cambios de configuración**: `.env`, `docker-compose.yml`, CI y MinIO
  quedan igual. El `S3_ENDPOINT` interno deja de ser un requisito de accesibilidad
  desde el navegador.
- Se cubre el hueco de pruebas: prueba de integración del endpoint y verificación
  e2e de que la firma se sirve como imagen desde el visor.
- `@aws-sdk/s3-request-presigner` queda sin uso. Se retira su uso del código, no
  la dependencia: `package.json` es compartido con la Persona B (CONTRIBUTING §4)
  y su retiro requiere acuerdo previo.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `admin/visor-firma`: la firma se sirve **desde el visor autenticado** (bytes en
  la respuesta) en vez de redirigir a una URL firmada del almacenamiento. Se
  mantiene el acceso solo para `ADMINISTRADOR`, la consulta por evento e
  inscripción con `404` uniforme, y la disponibilidad en cualquier estado de la
  inscripción.

## Impact

- **Código**: `src/lib/storage.ts` (nueva `leerFirma`, retiro de `urlFirma`),
  `src/app/api/admin/eventos/[eventoId]/inscripciones/[inscripcionId]/firma/route.ts`
  (respuesta con la imagen) y `src/app/admin/eventos/[id]/inscripciones/page.tsx`
  (`prefetch={false}` en el enlace).
- **Pruebas**: nueva `tests/integration/visor-firma.test.ts` (hoy el visor no
  tiene ninguna prueba) y verificación de la firma servida en
  `tests/e2e/inscripcion.spec.ts`.
- **Entorno**: ninguno. Se conservan `S3_ENDPOINT`, `S3_ACCESS_KEY`,
  `S3_SECRET_KEY` y `S3_BUCKET`; la app sigue usando el endpoint interno.
- **Dependencias**: `@aws-sdk/s3-request-presigner` deja de usarse (no se
  desinstala sin acordarlo).
- **Especificaciones**: delta de `admin/visor-firma` (requisito de servicio
  renombrado, escenarios ajustados y Purpose actualizado).
- **Sin migraciones de base de datos** ni cambios en el esquema.
