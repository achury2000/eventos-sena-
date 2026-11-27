# Proposal

## Why

Dado que el SENA no va a contratar un servicio de correo, la confirmación por correo tras una inscripción exitosa debe poder activarse/desactivarse desde la configuración del entorno. Esto evita que la app intente enviar correos cuando el proveedor no está disponible/pagado, sin romper el flujo de negocio (la inscripción sigue siendo exitosa).

## What Changes

- Añadir una variable de entorno `HABILITAR_CONFIRMACION_EVENTO` (booleano). Por defecto `false` (más seguro según las restricciones del SENA).
- Encapsular el gate en `src/lib/email.ts` dentro de `programarConfirmacionInscripcion(datos)`: si está deshabilitado, no se programa `after()` y no se llama al módulo de correo.
- Mantener el comportamiento actual de falla abierta: si está habilitado pero faltan credenciales (`RESEND_API_KEY`/`EMAIL_FROM`), no se envía y se registra un solo aviso (sin cambiar ese comportamiento).
- Actualizar `.env.example` con el nuevo flag.
- Ajustar la spec de `inscripcion-publica` para dejar explícito que la confirmación ocurre únicamente cuando está habilitada.
- (Opcional) Ajustar la spec de `plataforma/email` para documentar que el envío puede estar deshabilitado por configuración.

## Capabilities

### Modified Capabilities

- `inscripcion-publica`: Añadir escenario/condición para "confirmación deshabilitada por configuración" en el requisito de confirmación por correo (la confirmación solo ocurre cuando `HABILITAR_CONFIRMACION_EVENTO` es verdadero).
- `plataforma/email`: Documentar que el envío de correos transaccionales puede activarse/desactivarse mediante `HABILITAR_CONFIRMACION_EVENTO` (cuando está deshabilitado, no se programa ni intenta enviar correos).

## Impact

- `src/lib/email.ts`: leer flag (case-insensitive: `true/1/yes/on`), gating en `programarConfirmacionInscripcion`.
- `.env.example`: añadir `HABILITAR_CONFIRMACION_EVENTO=false`.
- Tests: añadir caso en `tests/integration/inscripcion-email.test.ts` para cuando flag es `false` (no debe programarse envío). `email.test.ts` no cambia (prueba transporte directo).
- OpenSpec: actualizar specs `inscripcion-publica` y `plataforma/email`.