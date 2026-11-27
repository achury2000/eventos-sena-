# Proposal

## Why

Hoy el correo transaccional depende de Resend y de una cuenta/API key externa.
El SENA podría entregar en el futuro una cuenta de correo institucional por SMTP;
para ese momento la app debe estar lista sin reescribir el módulo: bastará con
cargar los datos de la cuenta y poner `HABILITAR_CONFIRMACION_EVENTO=true`.
Mientras no exista esa cuenta, se conserva Resend como respaldo para desarrollo y
pruebas, y el envío sigue deshabilitado por defecto.

## What Changes

- Agregar un transporte SMTP con `nodemailer`, configurable por variables de
  entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
  `SMTP_PASSWORD`) y el remitente compartido `EMAIL_FROM`.
- Definir prioridad de transporte: si hay configuración SMTP completa, se usa
  SMTP; si no, se mantiene Resend cuando estén `RESEND_API_KEY` y `EMAIL_FROM`;
  si no hay ninguno, se falla abierto con una sola advertencia por proceso.
- Mantener el interruptor `HABILITAR_CONFIRMACION_EVENTO` como único gate de
  activación: con la bandera apagada no se programa ni se intenta ningún envío.
- Documentar en `.env.example` y `CONTEXT.md` los datos que debe cargar el SENA
  y la precedencia entre SMTP y Resend.
- Adaptar la utilidad `scripts/probar-correo.ts` para que informe qué transporte
  se usaría y permita una prueba real con SMTP.
- Actualizar las pruebas de integración para cubrir selección de transporte,
  envío SMTP, respaldo Resend, configuración incompleta y contención de errores.
- Sin cambios de base de datos, esquema, UI ni reglas de negocio.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `plataforma/email`: el proveedor deja de ser exclusivamente Resend y pasa a
  ser un transporte configurable con SMTP prioritario y Resend como respaldo.

## Impact

- `src/lib/email.ts` (o un módulo de transporte separado): selección y ejecución
  del transporte SMTP/Resend.
- `package.json` / `package-lock.json`: nueva dependencia `nodemailer` y sus
  tipos de desarrollo.
- `.env.example`: variables SMTP y explicación de la precedencia.
- `CONTEXT.md`: documentación operativa del correo.
- `scripts/probar-correo.ts`: prueba de humo compatible con SMTP.
- `tests/integration/email.test.ts`: dobles de `nodemailer`, casos de prioridad,
  respaldo y falla abierta.
- Sin migraciones, cambios de `prisma/schema.prisma` ni nuevas pantallas.
