# Tasks

## 1. Módulo de correo

- [x] 1.1 Instalar el SDK `resend` (`npm install resend`) y verificar que `package.json`/`package-lock.json` lo registran y que `npx tsc --noEmit` pasa
- [x] 1.2 Crear `src/lib/email.ts` (módulo de servidor) con el armado del mensaje `mensajeConfirmacion(datos)` (asunto con el nombre del evento; cuerpo con titular, evento, lugar, fechas en `es-CO`/`America/Bogota` y tamaño del grupo) y verificar con un test que el mensaje contiene esos datos
- [x] 1.3 Implementar el transporte `enviarCorreo` con el SDK oficial `resend` (`RESEND_API_KEY` + `EMAIL_FROM`) envolviendo todo en `try/catch` para que el fallo del proveedor nunca se propague; verificar con test (SDK mockeado) los argumentos y el no-lanzamiento ante error
- [x] 1.4 Implementar la falla abierta: sin `RESEND_API_KEY` o sin `EMAIL_FROM` no se llama al SDK y se emite una única advertencia por proceso (patrón `avisoEmitido` de `rate-limit.ts`); verificar con test que no se llama al SDK y que se advierte
- [x] 1.5 Exponer `programarConfirmacionInscripcion(datos)` que envuelve `after()` de `next/server` y llama al envío, de modo que el route pueda testearse mockeando el módulo; verificar que `npx tsc --noEmit` pasa
- [x] 1.6 Dar al HTML del correo un diseño con la identidad del SENA (tablas y estilos en línea, apto para clientes de correo, con encabezado de marca y preheader) y agregar `scripts/probar-correo.ts --preview` para revisarlo sin enviar

## 2. Integración en la inscripción pública

- [x] 2.1 En `src/app/api/inscripciones/route.ts`, tras el `$transaction` exitoso y solo si `correo` está presente, invocar `programarConfirmacionInscripcion` con los datos del evento y el titular antes de devolver el `201`; verificar que la lógica de cupo/duplicados y las respuestas `4xx` no cambian
- [x] 2.2 Verificar con test que una inscripción exitosa con correo programa exactamente un envío al correo del titular con los datos del evento, y que sin correo no programa ninguno (mockeando `@/lib/email`)

## 3. Configuración y documentación

- [x] 3.1 Agregar `RESEND_API_KEY=` y `EMAIL_FROM=` a `.env.example` con comentario de para qué sirven y que su ausencia desactiva el envío (falla abierta)
- [x] 3.2 Actualizar `CONTEXT.md` §9 y la lista de pendientes de `CONTRIBUTING.md`: "notificaciones por correo" deja de estar pendiente salvo invitaciones (opción B) y recordatorios

## 4. Tests

- [x] 4.1 Crear `tests/integration/email.test.ts` cubriendo: envío con credenciales (argumentos correctos al SDK), falla abierta sin credenciales (sin llamada al SDK + advertencia), y error del proveedor que no se propaga
- [x] 4.2 Correr la suite completa con `npx vitest run` y `npx playwright test` (con Postgres de test) y confirmar que nada existente se rompe

## 5. Verificación y cierre

- [x] 5.1 Ejecutar `openspec validate --strict` sobre el change y `openspec validate --specs` y corregir cualquier violación
- [x] 5.2 Commit en rama `feature/confirmacion-inscripcion-email`, PR vía API (sin `gh`), y confirmar checks de CI en verde antes del merge (PR #18 fusionado el 2026-10-16; CI en verde)
