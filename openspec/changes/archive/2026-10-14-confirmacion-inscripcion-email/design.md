# Design

## Context

See proposal.md — Why. Estado actual que condiciona el enfoque:

- `POST /api/inscripciones` (`src/app/api/inscripciones/route.ts`, `runtime =
  "nodejs"`) ejecuta el `UPDATE` atómico de cupo y crea `Inscripcion` + sus
  `Asistente` dentro de un `$transaction`, y responde `201 { id }`. El objeto
  `evento` completo (nombre, lugar, fechas) ya está cargado antes de la
  transacción, y `correo` ya viene validado (string opcional o `undefined`).
- `Inscripcion.correo String?` ya existe. Los acompañantes (`Asistente`) no
  tienen correo.
- No existe código de correo, ni dependencia, ni variables de entorno. No hay
  ninguna llamada a `after()` en el repo todavía.
- Patrón de servicio externo con degradación, ya probado en el proyecto:
  `src/lib/rate-limit.ts` "falla abierta" si `UPSTASH_REDIS_REST_URL/TOKEN` no
  están configurados, y emite **un** `console.warn` por proceso (`avisoEmitido`).
  `src/lib/storage.ts` instancia su cliente a partir de variables de entorno.
- `after()` de `next/server` es estable desde Next 15.1 (ver
  `node_modules/next/dist/docs/.../04-functions/after.md`) y está soportado en
  Node.js server y Docker (nuestro destino de despliegue).
- Los tests de integración invocan los route handlers directamente
  (`POST(new NextRequest(...))`) y ya mockean módulos internos (`vi.mock("@/lib/storage", ...)`).

## Goals / Non-Goals

**Goals:**

- Enviar la confirmación al titular **después** de que la inscripción confirmó,
  sin que el correo pueda romper, retrasar ni revertir la inscripción.
- Un módulo de correo único y reutilizable (contrato mínimo), con proveedor
  configurable y sin credenciales en el repo.
- Desarrollo y CI funcionando sin secretos (degradación explícita).
- Un punto de costura que haga el flujo determinista de testear, sin depender
  del comportamiento de `after()` bajo test.

**Non-Goals:**

- Persistir el estado de envío (campo/entidad) o exponer un reenvío desde el
  panel. No hay consumidor todavía.
- Reintentos, colas o idempotencia distribuida.
- Correos a acompañantes, recordatorios previos al evento, o la opción B
  (invitaciones). El módulo queda reutilizable para ellos, pero no se construyen.
- Adjuntos, un editor/gestor de plantillas, o enlaces con token. El correo sí
  lleva un diseño cuidado con la identidad del SENA (D5), pero es una plantilla
  fija en el código, no algo editable desde el panel.

## Decisions

### D1 — Módulo `src/lib/email.ts` con el SDK oficial de Resend

El transporte usa el SDK oficial `resend` (`resend.emails.send(...)`) con
`RESEND_API_KEY` y `EMAIL_FROM` provistos por el entorno.

- **Por qué el SDK y no `fetch` directo**: el repo ya usa SDKs oficiales para sus
  servicios externos (`@aws-sdk/client-s3`, `@upstash/ratelimit`/`@upstash/redis`)
  y se espera que el uso del correo crezca (invitaciones, recordatorios, posibles
  plantillas), donde el tipado y el manejo de la API del SDK compensan. La
  alternativa `fetch` (sin dependencia) se descarta para no mantener a mano el
  contrato HTTP ni divergir del patrón del repo.
- **Dependencia compartida**: agrega `resend` a `package.json`/`package-lock.json`;
  `CONTRIBUTING.md` pide avisar antes de instalar una dependencia (esa sección de
  archivos es de la Persona B, dueña también de "Notificaciones por correo").
- El módulo es de servidor (`runtime = "nodejs"`), igual que `storage.ts`, y no
  se importa desde componentes de cliente.
- Secrets por entorno: `RESEND_API_KEY` y `EMAIL_FROM`.

### D2 — Enviar después del commit con `after()`, aislado tras una función del módulo

En el route, tras el `$transaction` exitoso y **solo** si `correo` existe, se
invoca `programarConfirmacionInscripcion({...})` antes de devolver el `201`. Esa
función envuelve `after(() => enviarConfirmacionInscripcion(...))`.

- **Por qué `after()`**: el trabajo corre una vez terminada la respuesta, así que
  la latencia del proveedor no llega al titular y, en serverless, `waitUntil`
  extiende la vida de la invocación hasta que el envío termina. `after` está
  soportado en nuestro destino (Node.js/Docker).
- **Alternativa considerada**: `await enviarConfirmacion(...)` dentro del `try`.
  Se descarta porque suma la latencia del proveedor a la respuesta pública.
- **Por qué la función intermedia**: los tests invocan el handler directamente,
  sin el contexto de request que `after()` necesita. Mockear el módulo
  (`vi.mock("@/lib/email")`, igual que hoy se hace con `@/lib/storage`) deja el
  test del route **determinista**: se afirma que se programó el envío con los
  datos correctos y que no se programó cuando no hay correo, sin ejecutar
  `after()`. El transporte real se prueba aparte (D6), llamándolo directo.

### D3 — Falla abierta si el correo no está configurado

`enviarConfirmacionInscripcion` no intenta enviar si falta `RESEND_API_KEY` o
`EMAIL_FROM`: registra **un** `console.warn` por proceso (mismo patrón
`avisoEmitido` de `rate-limit.ts`) y retorna. Así dev y CI (que corren sin
secretos) no fallan ni dependen de Resend.

- **Por qué falla abierta y no un error**: el correo es un efecto secundario de
  cortesía; la inscripción es el acto de negocio. Bloquear el alta por no tener
  un proveedor configurado repetiría el error que `rate-limit.ts` D2 ya evitó.

### D4 — El fallo del envío nunca se propaga

Todo el envío está envuelto en `try/catch`: un error de red o una respuesta no
`2xx` del proveedor se registra y se descarta. Ni `after()` ni el route cambian
su resultado por un fallo de correo (requisito de `plataforma/email`).

### D5 — Contenido, formato y diseño visual

- **Asunto**: `Confirmación de inscripción — {nombre del evento}`.
- **Cuerpo** (versión texto plano y HTML): saludo al titular por nombre, nombre
  del evento, lugar, fecha/hora de inicio y de fin, y el tamaño del grupo
  (titular + acompañantes). Cierra invitando a guardar el correo como referencia.
- **Fechas**: formateadas en `es-CO` con `timeZone: "America/Bogota"`
  (`Intl.DateTimeFormat`). No existe hoy un util de fechas en el repo; se define
  local al módulo.
- El armado del mensaje se expone como función pura (`mensajeConfirmacion`) para
  poder afirmar su contenido en tests sin red.

**Diseño visual del HTML** (la primera versión resultaba plana; se rediseñó):

- Se arma con **tablas y estilos en línea**, no con las hojas de estilo de la
  app: los clientes de correo no cargan CSS externo ni entienden flex/grid
  (Outlook usa el motor de Word). Es la única forma de que se vea igual en todos.
- Usa la **paleta institucional** de `globals.css` (verde SENA `#25a200`): una
  tarjeta blanca de 600px, encabezado de marca (`SENA` / `Plataforma de
  eventos`), insignia de estado, los datos como filas etiqueta/valor y un pie
  institucional. Incluye un **preheader** (texto oculto que la bandeja muestra
  junto al asunto en la lista).
- **No incluye imágenes** todavía: un logo remoto solo carga si hay una URL
  pública alcanzable, y en desarrollo `NEXT_PUBLIC_URL` es `localhost`, que el
  cliente del destinatario no puede resolver (se vería roto). El logo se
  incorporará cuando exista un dominio público, si se decide.
- Para revisar el diseño sin enviar nada, `npx tsx scripts/probar-correo.ts
  --preview` escribe el HTML en `_preview-email.html`.

### D6 — Estrategia de pruebas

- `tests/integration/email.test.ts` (transporte y mensaje, con el SDK `resend`
  mockeado con `vi.mock("resend", ...)` y env controlado):
  - con credenciales: se llama al SDK con `from`/`to`/asunto y el cuerpo contiene
    nombre del evento, lugar y fechas;
  - sin credenciales: **no** se llama al SDK y se emite la advertencia;
  - el SDK responde error / la red falla: la función **no lanza**.
- Test del route (se integra a la suite de inscripción existente): mockeando
  `@/lib/email`, se afirma que una inscripción exitosa **con** correo programa la
  confirmación con ese destinatario y los datos del evento, y que **sin** correo
  no la programa.

### D7 — Sin cambios de modelo

No se persiste nada del envío (ni `correoEnviadoEn` ni tabla de log): no hay
lector de ese dato y `prisma/schema.prisma` no se toca. Si más adelante se
quiere auditoría/reenvío, será un change aparte.

### D8 — Best-effort basta para un correo de cortesía, no para credenciales

La entrega "mejor esfuerzo" (D4) es adecuada para la confirmación de inscripción:
es un aviso de cortesía, la persona ya ve la confirmación en pantalla, y el correo
no es comprobante de entrada (el QR es por checkpoint, no por persona).

No lo será para el futuro flujo de **invitación/acceso** de cuentas (opción B),
donde el correo es el único canal para que la persona invitada establezca su
acceso. Lo que se envía ahí no es una contraseña hasheada (un hash es
irreversible y no sirve para iniciar sesión) sino un **enlace/token de un solo
uso** con el que la persona define su contraseña; el `tokenHash` vive en la base
de datos. Ese flujo necesitará garantías que este diseño no ofrece: persistir el
estado de envío, visibilidad para el Administrador y reenvío. Es un change aparte;
este módulo (`enviarCorreo`) queda reutilizable y solo cambiará la capa de
garantía, no el transporte.

### D9 — El proveedor es sustituible; si el SENA usa Office 365, la vía es Microsoft Graph

El único punto específico del proveedor es el transporte en `src/lib/email.ts`
(`enviarCorreo`). El route con `after()`, la falla abierta, el armado del mensaje
y los tests no conocen a Resend, así que cambiar de proveedor se resuelve en ese
módulo. La app nunca habla directamente con el proveedor.

Ruta prevista si el SENA usa **Office 365** (Exchange Online):

- **No** SMTP con usuario/contraseña: Microsoft está deshabilitando la
  autenticación básica de SMTP (ya deshabilitada por defecto; fin de diciembre de
  2026 también en tenants existentes). Sería una base con fecha de caducidad.
- **Microsoft Graph** (`POST /v1.0/users/{buzón}/sendMail`) con OAuth2 app-only y
  permiso `Mail.Send`. Es HTTP, así que encaja con serverless (Vercel) igual que
  Resend, a diferencia de SMTP crudo.
- Requiere gestión con TI del SENA (registro de la app en Azure AD,
  consentimiento de administrador y —recomendado— una *Application Access
  Policy* que limite el envío a un solo buzón) y un adaptador que obtenga y
  cachee el token OAuth2 antes de enviar. Todo eso vive igualmente en este módulo
  (más un helper de token).

No se construye ahora: sin las credenciales del SENA no se puede probar. Resend
sigue siendo el transporte de desarrollo y pruebas.

## Risks / Trade-offs

- [Dominio remitente sin verificar en Resend → el proveedor rechaza o los correos
  caen en spam] → es una acción de infraestructura (DNS del dominio del SENA);
  el código queda listo y la degradación hace que su ausencia no rompa el flujo.
- [`after()` no soportado en un destino futuro] → verificado para Node.js server
  y Docker; si se migrara a un destino sin `waitUntil`, el fallback es `await`
  con `catch` dentro del mismo punto de costura (D2), sin cambiar specs.
- [Correo duplicado si la persona se inscribe dos veces con grupos distintos] →
  es comportamiento esperado (cada inscripción exitosa genera su confirmación);
  el reenvío del **mismo** grupo se rechaza con `409` y no genera correo.
- [Latencia del proveedor acotada por `maxDuration` del route en serverless] →
  se envía un único mensaje pequeño; si un día se agregan varios correos, la
  solución es una cola, fuera de alcance hoy.

## Migration Plan

- Sin migración de BD ni cambios de esquema.
- Deploy: agregar `RESEND_API_KEY` y `EMAIL_FROM` al entorno de producción y
  verificar el dominio remitente. Hasta que existan, el sistema simplemente no
  envía (falla abierta) y lo advierte en logs.
- Rollback: revertir el commit elimina el envío y las variables; no hay datos
  afectados ni formato nuevo que limpiar.

## Open Questions

- ¿Qué dominio/remitente verificado usará el SENA y quién lo administra en
  Resend? (Bloqueo operativo, no de diseño; no cambia specs ni tareas.)
- ¿El correo de producción saldrá por un proveedor tipo Resend/SES con el dominio
  del SENA verificado, o por el tenant de Office 365 del SENA vía Microsoft Graph
  (ver D9)? Si es Office 365, la implementación del adaptador depende de que TI
  registre la app en Azure AD y dé consentimiento; es un bloqueo operativo, no de
  diseño, y no cambia las specs ni las tareas de este change.
- ¿El contenido final del correo debe pasar por revisión de comunicación/marca
  del SENA? Se asume el contenido mínimo de D5 como base editable.
