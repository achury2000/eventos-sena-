# Tasks

## 1. Almacenamiento

- [x] 1.1 Añadir `leerFirma(clave)` en `src/lib/storage.ts` con `GetObjectCommand`
      (devuelve los bytes y el `Content-Type` del objeto; `null` cuando la clave
      está vacía o el objeto no existe, `NoSuchKey`/`NotFound`/HTTP 404; relanza
      cualquier otro fallo) — verificar: `npx tsc --noEmit` y pruebas de
      integración del visor en verde.
- [x] 1.2 Retirar `urlFirma`, `EXPIRACION_FIRMA_SEG` y el import de
      `getSignedUrl` de `src/lib/storage.ts` — verificar: sin referencias a
      `urlFirma` ni `EXPIRACION_FIRMA_SEG` en `src/` ni en `tests/`.

## 2. Endpoint del visor

- [x] 2.1 Reescribir el `GET` de
      `src/app/api/admin/eventos/[eventoId]/inscripciones/[inscripcionId]/firma/route.ts`:
      conservar `401`/`403` y el `404` uniforme de inscripción; leer la firma con
      `leerFirma`; responder `200` con los bytes, `Content-Type: image/png`,
      `Content-Disposition: inline` y `Cache-Control: private, no-store`;
      responder `404` "La firma no está disponible." si el objeto no existe y
      `500` con el mensaje genérico si el almacenamiento falla — verificar:
      pruebas de integración de los seis casos.
- [x] 2.2 Añadir `prefetch={false}` al `<Link>` de "Ver firma" en
      `src/app/admin/eventos/[id]/inscripciones/page.tsx` (se mantienen
      `target="_blank"` y `rel`) — verificar: en el listado con firma, la consola
      del navegador ya no registra ninguna petición al visor ni bloqueos de CSP.

## 3. Pruebas

- [x] 3.1 Crear `tests/integration/visor-firma.test.ts`: el Administrador recibe
      `200` con `image/png` y exactamente los bytes del objeto; el Operador recibe
      `403`; sin sesión, `401`; inscripción inexistente o de otro evento, `404`
      uniforme; objeto ausente, `404` sin exponer el almacenamiento; fallo del
      almacenamiento, `500` — verificar: `npm test`.
- [x] 3.2 En `tests/e2e/inscripcion.spec.ts`, tras crear la inscripción con firma:
      como Administrador, el enlace "Ver firma" existe y la petición al visor
      responde `200` con `Content-Type: image/png` y cuerpo no vacío — verificar:
      `npx playwright test`.

## 4. Verificación

- [x] 4.1 `npm run lint`, `npx tsc --noEmit` y `npm test` en verde.
- [x] 4.2 Reconstruir la imagen Docker (`docker compose --profile full up -d
      --build`) y abrir "Ver firma" desde `/admin/eventos/{id}/inscripciones` en
      el contenedor: la imagen carga (antes: error de página) — verificar: la
      consola no muestra errores y la respuesta del visor es `200 image/png`.
- [x] 4.3 `openspec validate visor-firma-servida-por-la-app --strict` y
      `openspec validate --specs --strict` en verde (el Purpose actualizado de
      `openspec/specs/admin/visor-firma/spec.md` entra en el mismo commit).
- [x] 4.4 Nota para el PR: `@aws-sdk/s3-request-presigner` queda sin uso. Retirarlo
      de `package.json` requiere acuerdo previo con la Persona B
      (CONTRIBUTING §4), así que NO se desinstala en esta change — verificar:
      `npm ls @aws-sdk/s3-request-presigner` sigue resolviendo y la aplicación
      compila sin importarlo.
