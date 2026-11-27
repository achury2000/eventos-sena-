# Design

## Context

Ver proposal.md (Why). Puntos del estado actual que condicionan la solución:

- `src/proxy.ts` (proxy de Auth.js en Next 16) lee **solo el JWT** de la cookie,
  sin Prisma: la regla del proyecto es que las validaciones que requieren base
  de datos van en route handlers/layouts, no en el proxy.
- Las contraseñas se crean en `crearUsuario` (`src/lib/actions/admin/usuarios.ts`)
  con `bcryptjs.hash(..., 10)` y el esquema de validación ya exige mínimo 8
  caracteres.
- Los paneles tienen layout propio: `src/app/admin/layout.tsx` y
  `src/app/operador/layout.tsx` (server components, con acceso a sesión y BD).
- El inicio de sesión vive en `src/app/login/page.tsx` (server component) con
  el formulario en `src/app/login/login-form.tsx` (client component).
- No hay servicio de correo: la entrega de la contraseña temporal es por canales
  externos (persona a persona).

## Goals / Non-Goals

**Goals:**

- Cambio propio de contraseña **desde el acceso** (sin sesión abierta),
  verificando la contraseña actual.
- Restablecimiento administrativo con contraseña temporal mostrada una sola vez.
- Acceso al panel bloqueado (redirigido) hasta definir contraseña propia cuando
  la cuenta tiene la marca de restablecimiento.

**Non-Goals:**

- Invalidar sesiones JWT abiertas con la contraseña anterior (ver Risks).
- Envío de la temporal por correo u otros canales automáticos.
- Preguntas de seguridad, códigos de recuperación o autorregistro.
- Cambios en el flujo de creación de cuentas (la admin sigue asignando clave).
- Cambio de contraseña desde dentro del panel: el enlace vive en el acceso (ver
  Risks).

## Decisions

**D1: Enforcement del cambio forzado — consulta a BD en los layouts de panel**
- Al entrar a `/admin` o `/operador` (layouts server), se consulta
  `Usuario.debeCambiarClave` de la sesión activa; si está activa, `redirect` a
  `/cambiar-clave` antes de renderizar cualquier vista del panel.
- La página de cambio vive en la ruta raíz `/cambiar-clave` (fuera de ambas
  zonas), por lo que el layout del panel no la intercepta y no hay bucle.
- *Alternativa A: claim en el JWT (claim → proxy).* Rechazada: el claim se
  fija al hacer login y quedaría desfasado tras el cambio (o obligaría a
  `update()` de sesión), y el proxy evita deliberadamente la BD.
- *Alternativa B: solo la página `/cambiar-clave` se proteja.* Rechazada: la
  spec exige que **ninguna** vista del panel se muestre; un usuario podría
  navegar directo a otra URL del panel.
- Costo: una consulta por render del layout de panel; despreciable.

**D2: Contraseña temporal generada, legible y hasheada**
- Generada con `crypto.randomBytes` → alfanumérica de 14 caracteres, **sin
  caracteres ambiguos** (0/O/1/l/I) para que un humano pueda leerla en voz
  alta o por teléfono.
- Se muestra al Administrador **una sola vez** en pantalla (el action la
  devuelve en su resultado y la UI la muestra con opción de copiar); en BD solo
  vive su hash `bcrypt`.
- *Alternativa: que el admin escriba su propia clave temporal.* Rechazada: la
  spec pide generarla y el admin podría elegir algo débil o reutilizado.

**D3: Ubicación de las acciones server**
- `cambiarClavePropia` → `src/lib/actions/auth.ts` (junto a `login`: es vida
  de sesión, no gestión de cuentas).
- `restablecerClave` → `src/lib/actions/admin/usuarios.ts` (junto al resto de
  gestión de cuentas, tras `requireAdmin()` y con la misma validación de id).
- Ambas reutilizan la política existente de contraseña (mínimo 8, zod) y
  `bcryptjs` con costo 10.

**D4: Marca y transiciones de estado**
- `Usuario.debeCambiarClave Boolean @default(false)` (migración aditiva; los
  usuarios existentes quedan en `false`).
- `restablecerClave`: transacción única → `passwordHash = hash(temporal)`,
  `debeCambiarClave = true`.
- `cambiarClavePropia` y el cambio forzado (misma action, rama según la marca):
  → `passwordHash = hash(nueva)`, `debeCambiarClave = false`.
- El login **no** cambia: con la temporal funciona igual (el `authorize`
  actual compara hash y ya sirve); la redirección ocurre después, en el layout.

**D5: Proxy**
- `/cambiar-clave` **no** exige sesión: es una superficie pública más, como el
  login. Se retira de las rutas protegidas del proxy, que sigue siendo JWT-only
  (la marca de cambio forzado no se consulta aquí, ver D1).
- *Alternativa: mantener la sesión obligatoria y enlazar solo desde los
  paneles.* Rechazada: el equipo pidió el enlace bajo el botón del inicio de
  sesión (patrón de las plataformas conocidas) y con sesión obligatoria ese
  enlace rebotaría de vuelta a `/login`.

**D6: UI**
- `/admin/cuentas`: acción "Restablecer contraseña" por fila con confirmación;
  al confirmar, la clave temporal aparece **una sola vez** con aviso de entrega
  segura y botón de copiar.
- `/login`: bajo el botón "Iniciar sesión", un separador y el enlace "Cambiar
  contraseña" hacia `/cambiar-clave`.
- `/cambiar-clave`: página única para los tres casos (con marca → define la
  nueva; con sesión sin marca → contraseña actual; sin sesión → correo +
  contraseña actual). Tras el cambio forzado redirige al panel del rol; en los
  demás casos muestra la confirmación en la propia página.
- La nav de ambos paneles ya **no** lleva el enlace (decisión del equipo): el
  cambio voluntario se hace desde el acceso.

**D7: Formulario público sin sesión**
- Sin sesión, la cuenta se identifica por el **correo** enviado y se exige la
  contraseña actual: conocer el correo no basta, hay que probar la contraseña.
- Un correo inexistente y una contraseña actual incorrecta devuelven **el mismo
  mensaje** ("El correo o la contraseña actual no son correctos.") para no
  habilitar enumeración de cuentas.
- Superficie de límite por IP propia (3 intentos / 15 min, `cambio-clave`),
  independiente de la del login: son superficies distintas y agotar una no debe
  bloquear la otra.
- El cambio forzado (con sesión y marca) no pasa por el límite ni pide la
  actual: la persona acaba de iniciar sesión con la temporal.
- *Alternativa: reutilizar la superficie `login`.* Rechazada: el contador se
  compartiría y fallar el login bloquearía el cambio de contraseña (y al revés).

## Risks / Trade-offs

- [Sesiones JWT abiertas con la contraseña anterior siguen válidas hasta cerrar
  sesión o expirar] → Aceptado por ahora (JWT stateless); si el SENA lo exige,
  sería un change aparte con revocación de sesiones.
- [El admin ve la temporal en pantalla: si alguien mira su pantalla, roba la
  clave de un solo uso] → La temporal solo sirve hasta que la víctima (o el
  admin) la cambie; la marca fuerza el cambio en el primer ingreso y el admin
  puede volver a restablecer.
- [El admin puede restablecer su propia contraseña y quedarse con la marca] →
  Aceptado: es un flujo válido (también sirve si olvidó su clave y tiene otro
  admin).
- [Consulta extra por render de layout] → Mínima; se resuelve en la misma
  query de sesión/usuario que ya se hace o en una sola consulta ligera.
- [Cualquiera puede intentar cambiar la contraseña de otra cuenta conociendo su
  correo] → Se exige la contraseña actual, el error es genérico (no distingue
  correo inexistente de contraseña incorrecta) y la superficie tiene su propio
  límite por IP.
- [Un usuario con sesión debe cerrar sesión para cambiar su contraseña] →
  Decisión del equipo: el enlace vive en el acceso, como en las plataformas
  conocidas; el cambio forzado sigue siendo automático al entrar con la
  temporal, sin depender del enlace.

## Migration Plan

1. Migración aditiva de Prisma (columna con default `false`): sin backfill,
   sin downtime, reversible dropeando la columna.
2. Deploy; ninguna cuenta existente queda marcada → cero impacto inmediato.

## Open Questions

- Longitud/temporalidad de las sesiones JWT tras un restablecimiento (ya
  diferable; ver Risks, no afecta specs ni tareas).
