# Proposal

## Why

Hoy la plataforma solo puede tener **un único Administrador**: el que crea el seed
(`prisma/seed.ts`). El panel solo permite crear cuentas con rol `OPERADOR`
(`crearOperador` fija `rol: RolUsuario.OPERADOR` a propósito) y no existe ninguna
acción para crear un `ADMINISTRADOR` desde la app. Si una persona nueva se integra
al equipo de Bienestar del SENA y debe administrar la plataforma, la única vía de
hoy es un `UPDATE` manual sobre la base de datos — un workaround frágil, sin
auditoría, y que contradice la regla de CONTEXT §6 de que "las cuentas las crea el
Administrador". Además, la acción de eliminación actual (`eliminarOperador`) no
verifica el rol del id que borra: un admin podría eliminar otra cuenta de admin por
error desde la gestión de operadores.

## What Changes

- **Sección única "Cuentas"**: la gestión actual de Operadores se reformula como
  una sección de cuentas con pestañas/filtro por rol — **Administradores** y
  **Operadores** — con el mismo formulario de alta y el mismo patrón de listado
  para ambos.
- **Nueva capacidad de alta**: un Admin puede crear otra cuenta de **Administrador**
  (nombre, documento, correo, contraseña, afiliación, centro) con las mismas
  validaciones y unicidad (`email`/`documento`) que hoy aplican a Operadores.
- **Reglas de eliminación reforzadas**: la acción de eliminación valida que el id
  corresponde al rol gestionado en esa sección, **no permite auto-eliminarse**, y
  **nunca permite eliminar el último Administrador activo** del sistema (evita
  dejar la plataforma sin administradores).
- **Extensión futura a invitación por correo (opción B)**: el diseño separa el
  punto de creación de cuentas del mecanismo de entrega de credenciales, de modo
  que cuando exista el sistema de correos (Resend, ya previsto en CONTEXT §9) se
  pueda agregar el flujo de invitación con contraseña auto-definida **sin modificar
  el modelo `Usuario` ni reescribir la sección de cuentas**. Esto no cambia
  comportamiento observable hoy; se documenta en `design.md`.

## Capabilities

### New Capabilities

Ninguna: se reutiliza la capability existente de gestión de cuentas.

### Modified Capabilities

- `admin/operadores`: la gestión pasa de "cuentas con rol OPERADOR" a "cuentas de
  la plataforma" (Administradores y Operadores). Se modifica el propósito y los
  requisitos de listado, creación y eliminación, y se **elimina** el requisito
  vigente *"No se crean cuentas de Administrador desde esta gestión"*, que queda
  revertido por este change.

## Impact

- **UI admin**: `src/app/admin/layout.tsx` (nav "Operadores" → "Cuentas"),
  `src/app/admin/operadores/**` se reorganiza como sección de cuentas con filtro de
  rol (listado, alta y formulario parametrizado).
- **Acciones**: `src/lib/actions/admin/operadores.ts` → `.../usuarios.ts` — acciones
  `crearUsuario` / `eliminarUsuario` con rol parametrizado (generalización de
  `crearOperador`/`eliminarOperador`), reforzando la eliminación (validación de
  rol, no auto-eliminación, protección del último admin).
- **Validaciones**: `src/lib/validations/admin.ts` — `operadorSchema` se generaliza
  a `usuarioSchema` para aceptar el rol de destino.
- **Guardas**: `src/lib/actions/admin/guard.ts` (`requireAdmin`) ya sirve intacta.
- **Tests**: suite e2e existente sigue pasando (login/operador); se agrega cobertura
  de gestión de cuentas de Administrador si aplica.
- **Sin dependencias nuevas, sin cambios de API pública, sin cambios de modelo**
  (`Usuario` queda igual — lo necesario para la futura opción B es solo
  infraestructura de correo y una tabla de invitaciones, fuera de este change).