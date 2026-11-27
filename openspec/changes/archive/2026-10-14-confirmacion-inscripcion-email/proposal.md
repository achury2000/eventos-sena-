# Proposal

## Why

El formulario público de inscripción ya captura un `correo` opcional
(`Inscripcion.correo`, con la promesa "correo opcional, para confirmación" en
`CONTEXT.md` §5), pero **ese correo nunca se usa**: hoy nadie recibe confirmación
de su inscripción. `CONTEXT.md` §9 describe el envío previsto ("Enviar con Resend
(o similar) únicamente después de que la transacción de inscripción con cupo
atómico se confirme exitosamente"), y el sistema de correos es la pieza que
`CONTRIBUTING.md` lista como pendiente y que el change archivado
`2026-10-12-admin-crear-administradores` señaló como bloqueante de la "opción B"
(invitación por correo). Este change entrega el flujo de menor alcance que
necesita esa infraestructura: la confirmación de inscripción.

## What Changes

- **Nueva infraestructura de correo** (`src/lib/email.ts`): un módulo de servidor
  que envía correos transaccionales mediante el **SDK oficial de Resend** cuando
  hay credenciales configuradas, y que en su ausencia (desarrollo, CI) **no envía
  y lo advierte**, siguiendo el patrón de **falla abierta** ya usado por
  `src/lib/rate-limit.ts`.
- **Confirmación de inscripción al titular**: tras confirmarse la transacción de
  inscripción (cupo atómico + asistentes), el sistema envía un correo con los
  datos del evento al `correo` declarado, **solo si existe**.
- **El envío no bloquea ni condiciona la inscripción**: se programa con `after()`
  de `next/server` una vez que la transacción ya confirmó; un fallo del proveedor
  se registra y nunca cambia la respuesta `201` ni revierte datos.
- **Configuración**: variables de entorno nuevas (`RESEND_API_KEY`, `EMAIL_FROM`)
  documentadas en `.env.example`.
- **Sin cambios de modelo ni migración**; se agrega la dependencia `resend` (ver
  Impact).

Fuera de alcance (se mantiene diferido): la **opción B** (invitación por correo
para crear usuarios), los correos a acompañantes (no tienen correo), el
recordatorio previo al evento, las colas/reintentos y el registro del estado de
envío.

## Capabilities

### New Capabilities

- `plataforma/email`: envío de correos transaccionales con un proveedor
  configurable (Resend) y falla abierta cuando no hay credenciales; contrato
  mínimo reutilizable por futuros flujos (invitaciones, recordatorios).

### Modified Capabilities

- `inscripcion-publica`: se agrega el requisito de **notificar por correo al
  titular** tras una inscripción exitosa, cuando haya declarado un correo.

## Impact

- **Nuevo módulo**: `src/lib/email.ts` (transporte con el SDK oficial de Resend,
  armado del mensaje de confirmación, fallback de desarrollo).
- **Dependencia nueva**: `resend` (SDK oficial) en `package.json` y
  `package-lock.json` (archivos compartidos; `CONTRIBUTING.md` pide avisar antes
  de instalar una dependencia).
- **Route handler**: `src/app/api/inscripciones/route.ts` — programa el envío
  después del `$transaction` exitoso (sin tocar la lógica de cupo/duplicados).
- **Configuración**: `.env.example` (`RESEND_API_KEY`, `EMAIL_FROM`); en
  producción, el secreto se crea en el entorno de despliegue (acción de
  infraestructura, no de código).
- **Testing**: nueva cobertura de integración del transporte y del disparo desde
  la inscripción.
- **Documentación**: `CONTEXT.md` §9 y la lista de pendientes de
  `CONTRIBUTING.md` dejan de listar "notificaciones por correo" como pendiente
  (parcial: solo confirmación de inscripción).
- **Sin migración de BD**, sin cambios de esquema, sin cambios de API pública.
