# Proposal

## Why

Hoy el Administrador crea las cuentas y entrega las contraseñas, pero no existe
ninguna vía para que un usuario cambie su propia contraseña ni para que un
Administrador restablezca una perdida (p. ej. alguien que olvidó su clave o la
compartió). Sin servicio de correo contratado por el SENA, esas cuentas quedan
bloqueadas o con claves de compartición permanente.

## What Changes

- **Cambio propio de contraseña desde el acceso**: formulario enlazado bajo el
  botón de inicio de sesión, accesible **sin sesión**, que exige el correo de la
  cuenta, la contraseña actual —verificada contra el hash— y una nueva de mínimo
  8 caracteres con su confirmación. Errores genéricos y límite por IP propio.
- **Restablecimiento por el Administrador** desde la sección Cuentas: el
  Administrador genera una clave temporal que se muestra una sola vez y se
  entrega **fuera del sistema** (en persona o por teléfono), dado que no hay
  correo.
- **Cambio forzado**: una cuenta recién restablecida queda marcada y no puede
  acceder a su panel hasta que defina su propia contraseña nueva.
- **Modelo de datos**: campo `debeCambiarClave` en `Usuario` (migración
  aditiva; usuarios existentes quedan sin la marca).

## Capabilities

### New Capabilities

- `plataforma/gestion-claves`: cambio de contraseña propio desde el acceso
  (sin sesión) y acceso condicionado al cambio forzado de contraseña temporal.

### Modified Capabilities

- `admin/operadores`: la sección Cuentas gana la capacidad de restablecer la
  contraseña de cualquier usuario de la plataforma (nuevo requisito y escenarios);
  el propósito se amplía para incluirlo.
- `plataforma/seguridad`: las superficies públicas con límite por IP incorporan
  el cambio de contraseña (3 intentos / 15 min, contador independiente del de
  login).

## Impact

- `prisma/schema.prisma` + migración: `Usuario.debeCambiarClave Boolean @default(false)`.
- Server Actions nuevas (cambio propio y restablecimiento) bajo `src/lib/actions/`.
- UI: opción "Restablecer contraseña" en `/admin/cuentas`, enlace "Cambiar
  contraseña" bajo el botón del inicio de sesión y página de cambio de
  contraseña pública (con su modo forzado al entrar con una temporal).
- Enforcement del cambio forzado en el acceso a los paneles (proxy o layouts,
  ver design.md).
- Límite por IP: nueva superficie `cambio-clave` junto a `login`, `inscripcion`
  y `checkpoint` en `src/lib/rate-limit.ts`.
- Pruebas: unitarias de las acciones y de la redirección forzada; `src/auth.ts`
  y `src/proxy.ts` solo si la decisión de enforcement lo requiere.
- Specs: `openspec/specs/plataforma/gestion-claves/spec.md` (nuevo), delta en
  `openspec/specs/admin/operadores/spec.md` y delta en
  `openspec/specs/plataforma/seguridad/spec.md`.
