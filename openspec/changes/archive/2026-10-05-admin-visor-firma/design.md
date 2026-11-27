# Design

## Context

La firma se captura en el canvas de inscripción y se guarda como imagen PNG en un bucket S3 privado (`Inscripcion.firmaUrl` solo guarda la clave), pero no existe ninguna vía para que el Administrador la vea. CONTEXT.md §6 fija la restricción: acceso **solo vía URL firmada y temporal, generada para el Administrador**. El stack de almacenamiento ya está resuelto (`src/lib/storage.ts` con `@aws-sdk/client-s3` y MinIO en desarrollo); la cancelación de una inscripción no borra la firma (evidencia). Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals:**
- Que el Administrador pueda abrir la firma del titular de cualquier inscripción de un evento en el panel admin.
- Servirla como URL firmada y de expiración corta, generada en cada solicitud, sin exponer el bucket.
- Mínimo código nuevo, reutilizando los patrones existentes de auth de route handlers admin y sin tocar la lógica de inscripción/cancelación.

**Non-Goals:**
- No es una galería/lista de firmas: se ve por inscripción.
- No se descarga la firma (solo visualización). La exportación a XLSX queda en `admin/reportes` y no se toca.
- No se agrega rate limiting (módulo pendiente de la Persona B) ni auditoría de quién vio cada firma.
- No se cambia el modelo de datos ni el flujo de inscripción.

## Decisions

### D1. El visor es un endpoint GET que redirige (302) a la URL firmada

El route handler `GET /api/admin/eventos/[eventoId]/inscripciones/[inscripcionId]/firma` valida sesión y rol, comprueba que la inscripción exista y pertenezca al evento, genera la URL firmada y responde `NextResponse.redirect(url)`.

- **Por qué sobre "JSON { url } + fetch en cliente":** la variante JSON requiere un componente cliente nuevo con estado (cargando/error) y no aporta nada: el objetivo es *mostrar* la firma, y una redirección la muestra al instante en una pestaña nueva. Menos código, cero dependencias de UI nuevas (el kit solo tiene `button`, `input`, `label`).
- **Por qué sobre `<img src={urlFirmada}>` renderizado en servidor:** la URL firmada expira en minutos; una página admin abierta largo tiempo mostraría la imagen rota. Al generar la URL en el momento del click (vía el endpoint), siempre es fresca.
- Patrón ya usado en el repo: auth por route handler estilo `api/admin/eventos/[eventoId]/asistentes/route.ts` (401/403 con `auth()` y `RolUsuario`).

### D2. Nueva dependencia `@aws-sdk/s3-request-presigner`

Se genera la URL con `getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn })`. El SDK v3 no presigna sin este paquete; implementar SigV4 a mano es frágil e innecesario. Se instala en la versión alineada con `@aws-sdk/client-s3` (`@3.1132.0`+). **AVISO:** `package.json` es archivo compartido con la Persona B (CONTRIBUTING §4) — hay que avisar y acordar antes de instalar.

### D3. TTL de la URL firmada: 5 minutos

Constante `EXPIRACION_FIRMA_SEG = 300`. Suficiente para abrir y revisar la firma; corto para minimizar la ventana de reutilización si la URL se filtra (queda en historial del navegador tras la redirección).

### D4. La firma es visible también para inscripciones canceladas

La cancelación actualiza `estado` a `CANCELADO` pero no borra `firmaUrl` (solo `eliminarFirma` se usa al fallar el guardado en la inscripción). La firma es evidencia del consentimiento (Ley 1581) y del compromiso del titular; ocultarla para canceladas destruiría esa evidencia. El endpoint no filtra por estado.

### D5. 404 sin revelar cuál identificador falló

Una sola consulta `prisma.inscripcion.findFirst({ where: { id, eventoId } })`. Evento inexistente, inscripción inexistente o inscripción de otro evento responden lo mismo (404 "La inscripción no existe.") para no filtrar existencia. Es el mismo criterio anti-enumeración que ya aplica `admin/reportes`.

### D6. La UI es un enlace "Ver firma" por fila

En `admin/eventos/[id]/inscripciones/page.tsx`, junto a `BotonCancelar`, un `<a href="/api/admin/eventos/{eventoId}/inscripciones/{inscripcionId}/firma" target="_blank" rel="noopener">` con variante `outline size="sm"`, consistente con el resto de la tabla. No requiere componente cliente: la redirección la hace el servidor.

## Risks / Trade-offs

- **La URL firmada queda en el historial del navegador** tras la redirección → TTL corto (5 min) + bucket privado (sin acceso público) lo hacen de bajo riesgo; el endpoint la regenera en cada click.
- **Dependencia nueva** (propiedad de la Persona B) → avisar antes de instalar; versión alineada con `client-s3` para evitar incompatibilidades del SDK.
- **MinIO (dev) vs. S3 (prod):** el presigner funciona igual con ambos por ser S3-compatible y usar el `endpoint` ya configurado. En producción habrá que verificar que el endpoint del bucket sea accesible desde donde se abre el navegador del admin (HTTPS).
- **Firma no encontrada en bucket (clave huérfana):** `getSignedUrl` no valida existencia del objeto; el `<img>` mostraría 403 del bucket. Se acepta: el flujo vigente solo guarda claves correctas, y el caso es difícil de alcanzar.

## Migration Plan

- Sin migraciones de base de datos ni cambios de config de entorno (reutiliza las `S3_*` existentes).
- Deploy: PR normal → merge a `main`; el route handler nuevo y el botón entran juntos.
- Rollback: revertir el commit; la ruta anterior no existía, así que no hay estado previo que restaurar.

## Open Questions

- (ninguna que cambie specs, diseño o tareas — la decisión de la dependencia y el TTL quedan fijadas arriba).