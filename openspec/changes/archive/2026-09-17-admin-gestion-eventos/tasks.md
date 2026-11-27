## 1. Base compartida

- [x] 1.1 Instalar `zod` como dependencia de runtime y verificar que `npm run build` sigue compilando
- [x] 1.2 Crear esquemas de validación en `src/lib/validations/admin.ts` (operador, evento, checkpoint + helper `estadosSiguientes`) y verificar que TypeScript compila (`npx tsc --noEmit`)
- [x] 1.3 Crear `src/lib/actions/admin/guard.ts` con `requireAdmin()` (usa `auth()` de `@/auth`; sin sesión → `/login`, rol no admin → `/`) y verificar compilación

## 2. Operadores

- [x] 2.1 Crear `src/lib/actions/admin/operadores.ts`: `crearOperador`, `eliminarOperador` (rol fijo `OPERADOR`, hash bcryptjs cost 10, catch de `P2002` correo/documento) y verificar build/lint
- [x] 2.2 Crear `src/app/admin/operadores/page.tsx` (server: lista de Operadores con nombre, documento, correo, tipo afiliación, centro, creadoEn) y verificar que renderiza con login admin
- [x] 2.3 Crear formulario client `src/app/admin/operadores/form-operador.tsx` con `useActionState` + manejo de errores por campo y `src/app/admin/operadores/nuevo/page.tsx`; verificar creación exitosa y errores por duplicado/datos inválidos
- [x] 2.4 Conectar `eliminarOperador` a un botón con `confirm()` en el listado y verificar que se elimina y que los registros manuales históricos no se borran (revisar en DB)

## 3. Eventos

- [x] 3.1 Crear `src/lib/actions/admin/eventos.ts`: `crearEvento`, `editarEvento` (sin `cuposOcupados`), `cambiarEstadoEvento` (valida transición con `estadosSiguientes`), `eliminarEvento` (catch `P2003` → mensaje de cancelar) y verificar build/lint
- [x] 3.2 Crear `src/app/admin/eventos/page.tsx` (server: lista con nombre, lugar, fechas, estado, `cuposOcupados`/`cupoMaximo`) y verificar renderizado
- [x] 3.3 Crear formulario client `src/app/admin/eventos/form-evento.tsx` con `useActionState` y `datetime-local`, y páginas `nuevo` + `editar` (prefill con defaultValue); verificar validaciones (cupo ≥1, fechas consistentes)
- [x] 3.4 Crear `src/app/admin/eventos/[id]/page.tsx` (detalle con datos, botones de transición de estado permitidos, secciones de checkpoints y operadores) y verificar detalle de evento creado
- [x] 3.5 Verificar flujo de cancelación: `PLANEADO → CANCELADO` persiste estado y el evento sigue listado; intentar eliminar un evento sin inscripciones (borra) y uno con inscripciones (error amigable)

## 4. Checkpoints del evento

- [x] 4.1 Crear `src/lib/actions/admin/checkpoints.ts`: `crearCheckpoint` (sin `codigoQr`, DB genera UUID; `activo=false`), `editarCheckpoint` (solo nombre/tipo), `eliminarCheckpoint` y verificar build/lint
- [x] 4.2 Crear formulario client de checkpoint + gestión en la sección "Checkpoints" del detalle (lista con nombre, tipo, activo, #registros) y verificar creación/edición/eliminación con `confirm()`

## 5. Asignación de Operadores al evento

- [x] 5.1 Crear `src/lib/actions/admin/evento-operadores.ts`: `asignarOperador` (solo rol `OPERADOR`, catch `P2002` como idempotente), `desasignarOperador` y verificar build/lint
- [x] 5.2 Agregar sección "Operadores" en el detalle del evento (lista de asignados, selector de operadores disponibles, botones) y verificar asignar/desasignar y duplicado idempotente

## 6. Dashboard y verificación integral

- [x] 6.1 Reescribir `/admin` como dashboard: resumen de eventos + enlaces a eventos y operadores; verificar que el Operador sigue sin acceso (proxy) y como Admin todo renderiza
- [x] 6.2 `npm run build` + `eslint .` pasan sin errores
- [x] 6.3 Prueba manual end-to-end en `npm run dev`: crear operador → crear evento → agregar checkpoints → asignar el operador → login como operador (no ve `/admin`) → login como admin y verificar evidencia de cancelación/eliminación