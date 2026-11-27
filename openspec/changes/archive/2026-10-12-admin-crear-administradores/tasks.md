# Tasks

## 1. Validaciones

- [x] 1.1 En `src/lib/validations/admin.ts`, generalizar `operadorSchema` → `usuarioSchema` agregando `rol: z.enum(["OPERADOR", "ADMINISTRADOR"])`, y verificar que `tsc --noEmit` pasa sin errores
- [x] 1.2 Verificar que los imports de `operadorSchema` existentes compilan (mantener alias `operadorSchema = usuarioSchema` si hace falta) y correr `npm run lint`

## 2. Acciones de servidor

- [x] 2.1 Refactorizar `src/lib/actions/admin/operadores.ts` → `src/lib/actions/admin/usuarios.ts`: `crearUsuario` lee y valida `rol` del form, crea con `rol` parametrizado (hash bcryptjs cost 10, manejo `P2002` email/documento) y verifica con `pnpm vitest run tests/integration/` que nada se rompe
- [x] 2.2 Implementar `eliminarUsuario` en `usuarios.ts` con: validación de sesión admin, verificación de que `target.rol === rol` (id que no corresponde → rechazo), rechazo de auto-eliminación, y rechazo si es la última cuenta `ADMINISTRADOR` (conteo atómico en `$transaction` Serializable), conservando el manejo `P2003`; verificar con test unitario que un id de Admin rechazado desde pestaña Operadores no borra
- [x] 2.3 Verificar el rechazo de un id de Administrador desde la pestaña Operadores (test de integración `usuarios.test.ts`, mismo escenario exacto) y la creación de Administrador punta a punta (spec e2e `cuentas.spec.ts`)

## 3. Sección Cuentas (rutas y UI)

- [x] 3.1 Mover `src/app/admin/cuentas/` desde `src/app/admin/operadores/`: renombrar `page.tsx` (listado con tabs `?rol=`), `form-operador.tsx` → `form-usuario.tsx` (con selector de rol), y `nuevo/page.tsx` (lee `?rol=` para preseleccionar) y verificar que `/admin/cuentas` renderiza con login admin
- [x] 3.2 En `src/app/admin/layout.tsx` cambiar la nav de "Operadores" a "Cuentas" con href `/admin/cuentas`, y en `src/app/admin/page.tsx` actualizar el enlace del listado; verificar navegación admin completa
- [x] 3.3 En `next.config.ts` agregar `redirects()` de `/admin/operadores(:path*)` → `/admin/cuentas(:path*)` y verificar que la URL vieja redirige (spec e2e `cuentas.spec.ts`: navegador sigue el redirect a `/admin/cuentas?rol=OPERADOR`)
- [x] 3.4 En la pestaña Administradores ocultar el botón "Eliminar" de la fila de la propia sesión ("(tu cuenta)"), y mostrar estado vacío correcto cuando no hay cuentas; verificado en e2e (`cuentas.spec.ts` + `zz-estado-vacio.spec.ts`)

## 4. Tests

- [x] 4.1 Crear `tests/integration/usuarios.test.ts` cubriendo: creación de Administrador exitosa + correo/documento duplicados (P2002), rechazo de auto-eliminación, rechazo de eliminar último admin, y rechazo de eliminar `id` cuyo rol no corresponde a la pestaña; verificar con `pnpm vitest run tests/integration/usuarios.test.ts`
- [x] 4.2 Correr toda la suite: `pnpm vitest run` (20/20) y `pnpm playwright test` (12/12) — nada existente se rompe

## 5. Verificación y cierre

- [x] 5.1 Ejecutar `openspec validate --strict` sobre el change y corregir cualquier violación de formato
- [x] 5.2 Commit del change (rama `feature/2026-10-12-admin-crear-administradores`), PR vía API (sin `gh`), y confirmar merge/`main` local