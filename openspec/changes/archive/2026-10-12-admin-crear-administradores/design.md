# Design

## Context

See proposal.md — Why. Estado actual relevante:

- `crearOperador` (`src/lib/actions/admin/operadores.ts`) fija `rol: OPERADOR` a
  propósito; no existe ninguna acción que cree `ADMINISTRADOR`.
- `eliminarOperador` borra por `id` sin verificar el rol de la cuenta objetivo:
  un `id` de Administrador invocado desde la gestión de Operadores se eliminaría.
- `src/app/admin/operadores/**` es la sección actual (layout.tsx nav, listado,
  `nuevo/page.tsx`, `form-operador.tsx`); `requireAdmin()` (`src/lib/actions/admin/guard.ts`)
  devuelve la sesión (Authorization.js v5, JWT con `user.id`), útil para la
  guarda de auto-eliminación.
- En el schema, `EventoOperador.operador` tiene `onDelete: Cascade` (las
  asignaciones M:N se liberan solas al eliminar la cuenta) y
  `RegistroControl.operadorId` es opcional sin `onDelete` → `SetNull` (los
  registros manuales conservan evidencia con el operador en `NULL`).
  `Evento.creadoPorId` es requerido y **sin** `onDelete` → `Restrict`: eliminar
  una cuenta que creó eventos falla con `P2003`, manejado hoy con mensaje claro.
- Escenarios y URLs: la sección pasa a llamarse "Cuentas" (`/admin/cuentas`),
  no "Operadores".

## Goals / Non-Goals

**Goals:**
- Sección única "Cuentas" en `/admin/cuentas` con filtro por rol (pestañas
  Administradores | Operadores) y un solo formulario/acción para crear cuentas
  de ambos roles.
- El Administrador puede crear y eliminar cuentas de Administrador.
- Reglas de eliminación: el id debe corresponder al rol gestionado en esa
  pestaña (cierra el hallazgo de seguridad), no se puede auto-eliminar una
  cuenta de Administrador, y no se puede eliminar la última cuenta de
  Administrador activa.
- Sin dependencias nuevas, sin cambios de modelo ni migración.

**Non-Goals:**
- No construir la opción B (correo + `Invitacion`) ahora: solo dejar el punto de
  extensión documentado. Ver D5.
- No cambiar autenticación, roles existentes, ni el flujo de Operadores ya
  construido (checkpoints, dashboard, inscripciones).
- No añadir el campo `activo` a `Usuario` ni contabilidad de intentos.

## Decisions

### D1 — Centro de la sección en `/admin/cuentas` con pestañas por rol

La sección se mueve de `/admin/operadores` a `/admin/cuentas`. El listado lee
`searchParams.rol` (`OPERADOR` | `ADMINISTRADOR`, default `OPERADOR`) validado
contra el set permitido, siguiendo el patrón ya usado en
`src/app/admin/eventos/[id]/reporte/page.tsx` y `.../inscripciones/page.tsx`
(searchParams async en Next 16). El botón "Crear" enlaza a
`/admin/cuentas/nuevo?rol=...` para preseleccionar el rol.

- **URL antigua**: se agrega un redirect de `/admin/operadores` → `/admin/cuentas`
  en `next.config.ts` (`redirects()`) para no romper enlaces/checkpoints de
  sesiones abiertas; es una URL interna, sin SEO.
- **Alternativa considerada**: mantener `/admin/operadores`. Se descarta porque
  el nombre "operadores" quedaría engañoso gestionando Administradores, y el
  costo del redirect es mínimo.

### D2 — Acciones genéricas `crearUsuario` / `eliminarUsuario` (rol parametrizado)

Se refactoriza `src/lib/actions/admin/operadores.ts` → `.../usuarios.ts`:

- `crearUsuario(_prev, formData)`: lee `rol` del form, lo valida con
  `usuarioSchema` (ver D3), crea con `rol` parametrizado, mantiene hash bcryptjs
  cost 10 y el manejo de `P2002` (email/documento únicos).
- `eliminarUsuario(_prev, formData)`: recibe `id` **y** `rol` (el rol de la
  pestaña desde la que se invoca, oculto en el form). Valida: (1) `requireAdmin()`
  devuelve la sesión; (2) el `id` existe; (3) `target.rol === rol` — si el id no
  corresponde al rol gestionado se rechaza sin borrar (cierra el hallazgo de
  seguridad); (4) solo si `rol === ADMINISTRADOR`: rechazar auto-eliminación
  (`target.id === session.user.id`) y rechazar si es la última cuenta de
  Administrador (conteo `ADMINISTRADOR` ≤ 1 antes del borrado); (5) `delete`
  con manejo de `P2003` (cuenta con eventos creados que la referencian) intacto.
- `revalidatePath("/admin/cuentas")` + `redirect("/admin/cuentas")`.

- **Alternativa considerada**: dos acciones separadas (`eliminarOperador` +
  `eliminarAdministrador`). Se descarta: la decisión del usuario fue un solo
  formulario y una sola acción para ambos roles (sección única).
- **Nota de seguridad**: el `rol` del form es solo una pista de qué gestión se
  invocó; la verificación real es `target.rol === rol` contra la BD, así que un
  `id` manipulado no puede borrar una cuenta de rol distinto a la pestaña.
- **Carrera del "último admin"**: el conteo y el borrado se ejecutan dentro de
  `prisma.$transaction` con `isolationLevel: Serializable` para que dos
  eliminaciones simultáneas no dejen cero Administradores. Ver Riesgos.

### D3 — `usuarioSchema` (generaliza `operadorSchema`)

En `src/lib/validations/admin.ts`, `operadorSchema` pasa a ser `usuarioSchema`
(se conserva el alias `operadorSchema` exportado para compatibilidad de imports
si existieran) agregando:

```ts
rol: z.enum(["OPERADOR", "ADMINISTRADOR"])
```

El resto de reglas se mantiene (nombre ≥ 3, documento `^\d{6,12}$`, email,
password ≥ 8, `tipoAfiliacion`, `centroFormacionId`).

### D4 — Listado con pestañas y guardas en la UI

`src/app/admin/cuentas/page.tsx` reemplaza el listado actual:
- Tabs `Administradores | Operadores` como enlaces con `?rol=`.
- Mismo `<table>` para ambos roles (campos: nombre, documento, correo,
  afiliación, centro, creado, acciones).
- En la pestaña Administradores la fila de la propia sesión NO muestra botón
  "Eliminar" (defensa en profundidad; la acción también lo rechaza).
- `<ActionForm>` de eliminación pasa `hidden={{ id, rol }}`.

`form-operador.tsx` → `form-usuario.tsx`: agrega un selector de rol
(preseleccionado por `?rol=`), envía `rol` en el `FormData`, y conserva el
patrón `useActionState` + errores por campo.

### D5 — Punto de extensión para la opción B (invitación por correo)

Diseñado para no bloquear la opción B cuando exista el sistema de correos
(Resend, CONTEXT §9), sin construir nada hoy:

- La creación de usuarios queda en **un solo punto** (`crearUsuario`)
  parametrizado por rol. Cuando exista correo, el flujo de invitación (nueva
  entidad `Invitacion` + tokenHash de un solo uso + ruta pública
  `/invitacion/[token]`) podrá crear el `Usuario` reutilizando la misma
  validación de unicidad (email/documento) y el mismo modelo, sin tocar la
  sección Cuentas ni el modelo `Usuario`.
- Lo único que cambiaría después es *quién define la contraseña*: hoy el Admin la
  escribe en el form; con B la definiría la persona invitada. Ese "paso de
  credenciales" es el único punto a aislar/extraer al implementar B; este change
  no lo extrae para no añadir abstracción sin consumidor todavía (YAGNI).

## Risks / Trade-offs

- [Carrera de último admin] → `$transaction` con `isolationLevel: Serializable`
  para conteo + borrado atómicos; la UI además oculta auto-eliminación.
- [Redirect interno roto] → redirect explícito en `next.config.ts` para
  `/admin/operadores`; el resto de enlaces se actualizan (layout nav, `admin/page.tsx`).
- [P2003 al eliminar quien creó eventos] → se conserva el mensaje actual; es
  comportamiento esperado y documentado (eventos no se borran, `Restrict`).
- [Registros manuales sin operador] → `onDelete: SetNull` ya lo preserva; la
  especificación lo exige y se cubre con escenario en tests.

## Migration Plan

- Sin migración de BD (no hay cambios de modelo).
- Deploy: el redirect de `/admin/operadores` convive con la nueva ruta; se
  actualizan enlaces internos en el mismo merge.
- Rollback: revertir el commit restaura `crearOperador`/`eliminarOperador`,
  `/admin/operadores` y el listado anterior; no hay datos afectados.

## Open Questions

Ninguna que cambie specs, enfoque o tareas. El alcance de la opción B queda
documentado en D5 y se retomará cuando el sistema de correos exista.