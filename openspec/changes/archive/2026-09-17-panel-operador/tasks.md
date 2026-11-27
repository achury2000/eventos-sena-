## 1. Guard y layout del Operador

- [x] 1.1 Crear `src/lib/actions/operador/guard.ts` con `requireOperador()` (sin sesión → `/login`; rol ≠ `OPERADOR` → `/`) y verificar que `npx tsc --noEmit` sigue pasando.
- [x] 1.2 Crear `src/app/operador/layout.tsx` con encabezado propio y `BotonCerrarSesion`, y verificar que `/operador` renderiza el layout con la sesión de Operador.

## 2. Carga de datos del tablero

- [x] 2.1 Crear `src/lib/operador/tablero.ts` con `cargarTableroOperador(operadorId)` que devuelve eventos asignados con checkpoints, `totalAsistentes` (inscripción vigente vía `_count` filtrado) y `registros` por checkpoint (un solo `groupBy`), y verificar que compila.
- [x] 2.2 Verificar contra los datos de desarrollo que un Operador asignado solo ve sus eventos y que el `totalAsistentes` excluye inscripciones `CANCELADO`.

## 3. Toggle de checkpoint

- [x] 3.1 Crear la Server Action `cambiarEstadoCheckpoint` en `src/lib/actions/operador/checkpoints.ts` (valida asignación `EventoOperador`, actualiza `activo` y `activadoPorId`, `revalidatePath("/operador")`) y verificar que rechaza checkpoints de eventos no asignados.
- [x] 3.2 Verificar que activar y desactivar un checkpoint deja `activadoPorId` = Operador que hizo el cambio.

## 4. Endpoint de polling

- [x] 4.1 Crear `src/app/api/operador/dashboard/route.ts` (`runtime = "nodejs"`, `auth()` con rol `OPERADOR` → `401` en caso contrario) reutilizando `cargarTableroOperador`, y verificar la forma del JSON de respuesta.
- [x] 4.2 Verificar que `GET /api/operador/dashboard` responde `401` sin sesión de Operador y que con sesión devuelve solo los eventos asignados.

## 5. Registro manual asistido

- [x] 5.1 Crear `src/app/api/operador/registro-manual/route.ts` (`runtime = "nodejs"`) con validación Zod del documento, verificación de rol y asignación, y mapeo de `ResultadoRegistro` con `metodo = "MANUAL"` + `operadorId`; verificar que el archivo compila con `npx tsc --noEmit`.
- [x] 5.2 Verificar que `POST /api/operador/registro-manual` devuelve `201` (ok), `409` (duplicado), `404` (documento ajeno al evento), `422` (checkpoint inactivo), `400` (documento inválido) y `403` (evento no asignado).

## 6. Interfaz del panel

- [x] 6.1 Reescribir `src/app/operador/page.tsx` como Server Component que carga el snapshot y lo pasa a `PanelOperador`, y crear el componente cliente con sondeo cada 5 s (sin solicitudes solapadas) y botón de toggle por checkpoint; verificar que la página compila y renderiza sin errores en el servidor.
- [x] 6.2 Crear el `FormRegistroManual` (cliente) que envía `POST /api/operador/registro-manual` y muestra el resultado permitiendo reintentar con otro documento; verificar que el componente compila y que tras un envío despliega el mensaje devuelto.
- [x] 6.3 Verificar en el navegador que los conteos suben tras un registro y que el estado activo/inactivo se refleja tras el toggle.

## 7. Verificación final

- [x] 7.1 Ejecutar `npm run lint` y `npx tsc --noEmit` y verificar que ambos completan sin errores.
- [x] 7.2 Verificación end-to-end con sesión de Operador: ver tablero, activar checkpoint, registrar manualmente (201), reintentar el mismo documento (409), registrar un documento inexistente (404) y confirmar que los conteos del sondeo reflejan los registros.
