# Design

## Context

- `src/lib/email.ts` concentra el mensaje, el gate
  `HABILITAR_CONFIRMACION_EVENTO` y el envío con el SDK de Resend.
  `programarConfirmacionInscripcion()` envuelve el envío en `after()` y no
  propaga errores.
- `tests/integration/email.test.ts` mockea `resend` y `next/server.after`; las
  pruebas del route mockean `@/lib/email` completo.
- `package.json` ya tiene `resend`; no tiene `nodemailer`.
- Next.js 16 usa `output: "standalone"` y el runtime Node.js. La documentación de
  Next recomienda `serverExternalPackages` para dependencias que usan APIs
  nativas de Node.
- El change completado `toggle-confirmacion-inscripcion-email` dejó el flag
  desactivado por defecto. Su archivo aún no está archivado; este change no
  cambia el comportamiento del flag, solo el transporte.
- El diseño archivado de la confirmación (`D9`) advirtió que el SMTP con
  usuario/contraseña puede no ser la vía recomendada para Office 365. Aun así,
  se implementa SMTP como transporte opcional porque es lo que pidió el SENA,
  manteniendo Resend como respaldo y dejando Microsoft Graph para un change
  futuro si el tenant no permite SMTP AUTH.

## Goals / Non-Goals

**Goals:**

- Poder activar un envío real por SMTP cargando únicamente variables de entorno,
  sin cambiar código.
- Mantener Resend como respaldo cuando no exista configuración SMTP.
- Conservar intactos el gate `HABILITAR_CONFIRMACION_EVENTO`, el envío después
  de la respuesta, la falla abierta y la contención de errores.
- Hacer deterministas las pruebas de selección y envío sin contactar proveedores.
- Documentar con claridad qué datos debe cargar el SENA y cuál es la prioridad.

**Non-Goals:**

- Construir un sistema de correo con colas, reintentos, persistencia de estado,
  plantillas editables, adjuntos o reenvío.
- Implementar OAuth2, Microsoft Graph u otro transporte además de SMTP y Resend.
- Exponer la configuración de correo en el panel de administración.
- Cambiar el contenido, diseño o programación del mensaje de confirmación.
- Leer credenciales desde la base de datos o desde la UI.

## Decisions

### D1 — `nodemailer` en un módulo de transporte separado

Se agrega `nodemailer` y `@types/nodemailer` (desarrollo). El transporte vive en
`src/lib/email/transporte.ts`; `src/lib/email.ts` conserva el mensaje, el gate y
la orquestación con `after()`. Así el código específico de proveedores queda
aislado y el módulo público no cambia para el route.

- **Por qué `nodemailer`**: es el cliente SMTP estándar de Node, con soporte de
  TLS, autenticación y mensajes HTML/texto; evita implementar el protocolo a
  mano.
- **Alternativa descartada**: SMTP crudo con `net`/`tls`. Sería frágil y añadiría
  mucho código de bajo nivel sin beneficio.
- **Alternativa descartada**: usar solo Resend. No cumple el pedido de dejar una
  estructura SMTP lista para el SENA.

### D2 — Prioridad SMTP, respaldo Resend y configuración incompleta

La selección de transporte será:

1. Si existe **al menos una** variable `SMTP_*`, SMTP es el transporte elegido.
   Si su configuración está completa, se usa SMTP; si está incompleta, se trata
   como no configurada y **no** se cae a Resend.
2. Si no existe ninguna variable `SMTP_*`, se usa Resend cuando
   `RESEND_API_KEY` y `EMAIL_FROM` estén completos.
3. Si el transporte elegido no está configurado, no se envía y se emite una
   sola advertencia por proceso (falla abierta).

Configuración SMTP:

- `SMTP_HOST` (obligatoria para elegir SMTP).
- `SMTP_PORT` (opcional; por defecto `587`; debe ser un entero entre 1 y 65535).
- `SMTP_SECURE` (opcional; por defecto `false`; acepta `true/1/yes/on` y
  `false/0/no/off`).
- `SMTP_USER` y `SMTP_PASSWORD` (ambas o ninguna; si solo una está presente, la
  configuración es inválida).
- `EMAIL_FROM` (remitente compartido con Resend; obligatorio).

**Por qué no caer a Resend con SMTP parcial**: si alguien empezó a configurar la
cuenta institucional y olvidó la contraseña, el sistema no debe enviar por otra
cuenta sin que nadie lo note. La advertencia hace visible la configuración
incompleta.

### D3 — Reutilizar el contrato de `enviarCorreo`

`enviarCorreo(destinatario, mensaje)` sigue siendo la función que usa el resto del
módulo. Internamente resuelve el transporte y llama a `nodemailer.sendMail()` o al
SDK de Resend con el mismo `from`, `to`, `subject`, `text` y `html`. El cambio de
proveedor no altera el route, el mensaje ni los tests del route.

No se cachea el transporter SMTP: el volumen de correos es bajo y crear uno por
envío evita estado compartido entre configuraciones y pruebas. Si el volumen
crece, se puede cachear por configuración en un change aparte.

### D4 — Mantener el gate y la contención actuales

`programarConfirmacionInscripcion()` conserva el gate
`HABILITAR_CONFIRMACION_EVENTO`: si no es verdadero, no registra `after()` ni
consulta transportes, así que no emite advertencias de credenciales. Cuando está
habilitado, `enviarCorreo` captura cualquier error de SMTP o Resend y lo registra
sin propagarlo.

### D5 — Externalizar `nodemailer` en el build

Se agrega `serverExternalPackages: ["nodemailer"]` en `next.config.ts` para que
Next.js use `require` nativo en el servidor y no intente empaquetar una librería
que depende de APIs de Node. El build de producción y el contenedor se verifican
con la suite existente.

### D6 — Estrategia de pruebas

`tests/integration/email.test.ts` mockea `nodemailer` y `resend` con dobles
controlados. Se conservan los casos actuales de mensaje, falla abierta y errores,
y se agregan:

- SMTP completo: se llama a `nodemailer.createTransport` y `sendMail` con los
  datos esperados; Resend no se llama.
- Sin variables SMTP: se usa Resend cuando sus credenciales están completas.
- SMTP parcial: no se llama a ningún proveedor y se advierte una sola vez; no hay
  respaldo silencioso a Resend.
- Sin ningún transporte: no se llama a ningún proveedor y se advierte una vez.
- Error de `sendMail` o de Resend: no se lanza y se registra.
- Flag deshabilitado: no se programa `after()` ni se consulta el transporte.

`tests/integration/inscripcion-email.test.ts` no cambia: sigue mockeando
`@/lib/email` y verifica cuándo invoca el route, no el transporte.

### D7 — Documentación y herramienta de humo

`.env.example` documenta el bloque SMTP, la prioridad y el flag.
`CONTEXT.md` actualiza la sección de notificación para mencionar SMTP y Resend.
`scripts/probar-correo.ts` informa el transporte resuelto y mantiene la prueba
real; no imprime credenciales.

## Risks / Trade-offs

- [SMTP institucional con autenticación básica deshabilitada, típico en Office
  365] → el envío falla de forma abierta y se registra; la alternativa futura es
  Microsoft Graph/OAuth2, fuera de alcance.
- [Proveedor SMTP bloquea el puerto o exige TLS distinto] → la configuración
  permite `SMTP_PORT` y `SMTP_SECURE`; el fallo no rompe la inscripción y queda
  en logs.
- [Variables SMTP parciales bloquean el respaldo Resend] → es intencional para
  evitar envíos por una cuenta no prevista; la advertencia indica el problema.
- [Nueva dependencia y tamaño del build] → `nodemailer` se externaliza y se
  verifica el build standalone; el comportamiento sin SMTP sigue usando Resend.
- [Credenciales en `.env`] → no se versionan; se documentan solo los nombres y
  valores de ejemplo.

## Migration Plan

- `npm install nodemailer` y `npm install -D @types/nodemailer`.
- Sin migraciones de base de datos.
- Despliegue sin cambios: al no haber variables SMTP, se mantiene Resend si está
  configurado; si no, el envío sigue desactivado por el flag.
- Para habilitar el SENA: cargar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
  `SMTP_USER`, `SMTP_PASSWORD` y `EMAIL_FROM`, poner
  `HABILITAR_CONFIRMACION_EVENTO=true`, reiniciar/redeployar y probar con
  `scripts/probar-correo.ts`.
- Rollback: volver el flag a `false` o retirar las variables SMTP; no hay datos
  que limpiar.

## Open Questions

- ¿Qué proveedor/cuenta SMTP entregará el SENA y permite autenticación básica?
  Es un dato operativo; no cambia el diseño ni las tareas.
