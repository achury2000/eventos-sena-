# Tasks

## 1. Dependencias y configuración del build

- [x] 1.1 Agregar `nodemailer` a `dependencies` y `@types/nodemailer` a
      `devDependencies`; verificar con `npm install` que `package-lock.json`
      queda actualizado y `node_modules/nodemailer` existe.
- [x] 1.2 Agregar `nodemailer` a `serverExternalPackages` en `next.config.ts`;
      verificar que `npx tsc --noEmit` y `npm run lint` siguen pasando.

## 2. Transporte SMTP y selección de proveedor

- [x] 2.1 Crear `src/lib/email/transporte.ts` con la lectura y validación de
      variables SMTP, la resolución `smtp | resend | null`, el envío por
      `nodemailer` y el envío por Resend; verificar que `npx tsc --noEmit`
      compila sin errores.
- [x] 2.2 Conectar `src/lib/email.ts` con el nuevo módulo manteniendo
      `enviarCorreo`, el gate `HABILITAR_CONFIRMACION_EVENTO`, `after()` y la
      contención de errores; verificar que los casos existentes de
      `tests/integration/email.test.ts` siguen cubiertos.
- [x] 2.3 Implementar la regla de configuración SMTP parcial: si existe al menos
      una variable `SMTP_*`, no usar Resend y tratar el transporte como no
      configurado; verificar con un test que ningún proveedor recibe el envío.

## 3. Configuración, documentación y herramienta de humo

- [x] 3.1 Documentar en `.env.example` `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
      `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, la prioridad SMTP → Resend y
      el flag `HABILITAR_CONFIRMACION_EVENTO`; verificar que los nombres
      coinciden exactamente con los que lee el código.
- [x] 3.2 Actualizar `CONTEXT.md` (sección de notificación) y la referencia a
      correo de `CONTRIBUTING.md` para describir SMTP con respaldo Resend;
      verificar que no quede documentación que diga que Resend es el único
      transporte.
- [x] 3.3 Adaptar `scripts/probar-correo.ts` para informar si el transporte
      resuelto es `smtp`, `resend` o ninguno, sin imprimir credenciales;
      verificar con `npx tsx scripts/probar-correo.ts --preview`.

## 4. Pruebas de integración

- [x] 4.1 Actualizar `tests/integration/email.test.ts` para mockear
      `nodemailer` y `resend`; cubrir SMTP completo, Resend sin SMTP, SMTP
      parcial, ausencia de transporte y errores de envío; verificar con
      `npx vitest run tests/integration/email.test.ts`.
- [x] 4.2 Confirmar que `tests/integration/inscripcion-email.test.ts` sigue
      pasando sin cambios; verificar con
      `npx vitest run tests/integration/inscripcion-email.test.ts`.
- [x] 4.3 Ejecutar la suite completa con `npm test` y confirmar que no hay
      regresiones.

## 5. Verificación final

- [x] 5.1 `npm run lint` sin errores.
- [x] 5.2 `npx tsc --noEmit` sin errores.
- [x] 5.3 `npm run build` con `nodemailer` externalizado y salida standalone
      correcta.
- [x] 5.4 `npm run test:e2e` sin regresiones de UI.
- [x] 5.5 `openspec validate transporte-smtp-correo --strict` y
      `openspec validate --specs --strict` sin errores.
