# Tasks

## 1. Modelo de datos

- [x] 1.1 Añadir `debeCambiarClave Boolean @default(false)` a `Usuario` en
      `prisma/schema.prisma` y generar la migración con `npx prisma migrate dev`
      — verificar: migración creada, `npx prisma generate` sin errores y tipos
      de `Usuario` disponibles en `src/generated/prisma`.

## 2. Server Actions

- [x] 2.1 Implementar `cambiarClavePropia` en `src/lib/actions/auth.ts`
      (sesión activa, contraseña actual verificada con `bcrypt.compare`, nueva
      ≥ 8 con confirmación, guarda hash y limpia `debeCambiarClave`) — verificar:
      test unitario cubre correcta/incorrecta/inválida y que solo cambia la
      cuenta propia.
- [x] 2.2 Implementar `restablecerClave` en
      `src/lib/actions/admin/usuarios.ts` (`requireAdmin`, id de usuario de la
      plataforma, temporal de 14 caracteres sin ambiguos generada con `crypto`,
      hash bcrypt, marca `debeCambiarClave = true`, devuelve la temporal una
      sola vez) — verificar: tests de operador rechazado, id inexistente
      rechazado y restablecimiento exitoso (marca activa + anterior no sirve).

## 3. Enforcement del cambio forzado

- [x] 3.1 Extraer la consulta de marca (p. ej. `debeCambiarClave` por id de
      sesión) a un helper server testeable — verificar: test unitario de la
      consulta con marca activa/inactiva.
- [x] 3.2 Redirigir a `/cambiar-clave` desde `src/app/admin/layout.tsx` y
      `src/app/operador/layout.tsx` cuando la marca esté activa — verificar:
      test de los layouts (marca activa → redirect, inactiva → render) o, si el
      harness no cubre layouts server, prueba manual documentada.
- [x] 3.3 Agregar `/cambiar-clave` a las rutas con sesión en `src/proxy.ts`
      (sin sesión → `/login`) — verificar: `npm test` y prueba manual de que
      `/cambiar-clave` sin sesión redirige a `/login`. **(Reemplazado por 6.1:
      la página pasa a ser pública.)**

## 4. UI

- [x] 4.1 Crear la página `/cambiar-clave` (nueva + confirmación; con
      contraseña actual solo si es cambio voluntario; éxito → redirige al panel
      del rol) — verificar: `npx tsc --noEmit` y navegación manual con cuenta
      marcada y sin marcar.
- [x] 4.2 Añadir la acción "Restablecer contraseña" en `/admin/cuentas` con
      confirmación y vista única de la contraseña temporal (aviso de entrega
      segura + copiar) — verificar: flujo manual completo (restablecer →
      login con temporal → cambio forzado → panel).
- [x] 4.3 Exponer el enlace de "Cambiar contraseña" en ambos paneles
      (`/admin` y `/operador`) — verificar: enlace visible con sesión de cada
      rol y que lleva a `/cambiar-clave`. **(Reemplazado por 6.4/6.5: el enlace
      se movió al inicio de sesión.)**

## 5. Verificación

- [x] 5.1 `npm run lint` sin errores.
- [x] 5.2 `npx tsc --noEmit` sin errores.
- [x] 5.3 `npm test` completo en verde (tests nuevos + existentes).
- [x] 5.4 `openspec validate --specs --strict` en verde (14+ capacidades).
- [x] 5.5 (extra) Suite e2e `tests/e2e/gestion-claves.spec.ts` en verde: sustituye
      las pruebas manuales de 3.2/3.3/4.1/4.2/4.3 por flujos reales en
      navegador (cambio voluntario y restablecimiento + cambio forzado; en 6.6
      se le suman el formulario público, el enlace del login y la ausencia de
      enlaces en los paneles: `npx playwright test` 18/18).

## 6. Cambio de contraseña desde el acceso (ajuste de diseño)

- [x] 6.1 Hacer pública `/cambiar-clave`: retirarla de las rutas con sesión en
      `src/proxy.ts` y adaptar `src/app/cambiar-clave/page.tsx` a los tres modos
      (con marca → define la nueva; con sesión sin marca → contraseña actual;
      sin sesión → correo + contraseña actual) — verificar: sin sesión la página
      renderiza el formulario público (ya no redirige a `/login`).
- [x] 6.2 Ampliar `cambiarClavePropia` (`src/lib/actions/auth.ts`): sin sesión
      exige `email` + `passwordActual` contra el hash de la cuenta de ese
      correo, con **mensaje genérico** y límite `cambio-clave`; con sesión se
      mantiene la cuenta de la sesión — verificar: tests de correo inexistente,
      contraseña actual incorrecta (mismo mensaje), cambio exitoso sin sesión y
      límite agotado sin tocar la BD.
- [x] 6.3 Registrar la superficie `cambio-clave` (3 intentos / 900 s) con su
      mensaje en `src/lib/rate-limit.ts` — verificar: test de que la acción no
      consulta ni modifica la cuenta cuando el límite rechaza.
- [x] 6.4 Añadir el enlace "Cambiar contraseña" bajo el botón "Iniciar sesión"
      en el inicio de sesión — verificar: enlace visible sin sesión y que lleva
      al formulario.
- [x] 6.5 Quitar el enlace "Cambiar contraseña" de la nav de `/admin` y
      `/operador` (se conserva el redirect del cambio forzado) — verificar:
      e2e de que ya no está y de que el cambio forzado sigue funcionando.
- [x] 6.6 Actualizar `tests/integration/cambiar-clave.test.ts` y
      `tests/e2e/gestion-claves.spec.ts` (el e2e ya no espera redirección a
      `/login` ni enlaces en los paneles) y correr toda la verificación
      (`npm run lint`, `npx tsc --noEmit`, `npm test`, `npx playwright test`,
      `openspec validate --specs --strict` y
      `openspec validate gestion-de-claves --strict`).
- [x] 6.7 Reconstruir la imagen Docker (`docker compose --profile full up -d
      --build`) y verificar el flujo completo en el contenedor — verificar:
      enlace en el login (bajo el botón), `/cambiar-clave` público con cambio
      real de una cuenta desechable, mensaje genérico ante un correo
      inexistente, entrada con la contraseña nueva y paneles sin el enlace.
