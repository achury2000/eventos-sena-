## 1. Setup y dependencias

- [x] 1.1 Instalar `qrcode` como dependencia de producción y `@types/qrcode` como dependencia de desarrollo, y verificar que el paquete queda disponible en `node_modules`.
- [x] 1.2 Verificar que la variable de entorno `NEXT_PUBLIC_URL` está documentada en `.env.example` (con valor por defecto `http://localhost:3000` para dev) y que el archivo `.env` existente la expone.

## 2. Módulo compartido `registro-checkpoint.ts`

- [x] 2.1 Crear `src/lib/registro-checkpoint.ts` exportando `ResultadoRegistro` (tipo `"OK" | "YA_REGISTRADO" | "NO_ENCONTRADO" | "CHECKPOINT_NO_ACTIVO"`) y la función `registrarAsistenciaEnCheckpoint` con la lógica descrita en diseño D1–D3.
- [x] 2.2 Verificar que el módulo compila sin errores (`npx tsc --noEmit` tras limpiar `tsconfig.tsbuildinfo` si persiste el cache obsoleto).

## 3. Generación y visualización del QR en el administrador

- [x] 3.1 Instanciar `QRCode.toDataURL(...)` en `src/app/admin/eventos/[id]/page.tsx` para construir la imagen data-URL de cada checkpoint usando el valor de `codigoQr` y `NEXT_PUBLIC_URL`, y renderizarla en una nueva columna dentro de la tabla de checkpoints existente.
- [x] 3.2 Verificar que la página `/admin/eventos/[id]` carga sin errores en el servidor y que la imagen QR aparece con la URL correcta para cada checkpoint visible. _(Verificado vía HTTP autenticado: 200 + `data:image/png;base64` + URL `/checkpoint/<codigoQr>` presente.)_

## 4. Página pública `/checkpoint/[token]`

- [x] 4.1 Crear `src/app/checkpoint/[token]/page.tsx` como Server Component que resuelve el checkpoint por `codigoQr`, mostrando mensajes de error para token inactivo o inexistente, y renderizando el componente cliente con el formulario cuando el checkpoint está activo.
- [x] 4.2 Crear `src/app/checkpoint/[token]/form-autoregistro.tsx` como Client Component que captura el documento, envía `POST /api/checkpoints/<token>/registro`, muestra el resultado (201/409/404/422/400) y permite reintentar con otro documento tras cualquier respuesta.
- [x] 4.3 Verificar que la ruta `/checkpoint/[token]` responde 200 con la página correcta cuando el token existe, y que el formulario aparece solo cuando el checkpoint está activo. _(Verificado: activo muestra formulario, inactivo e inexistente muestran su aviso.)_

## 5. Route handler `POST /api/checkpoints/[token]/registro`

- [x] 5.1 Crear `src/app/api/checkpoints/[token]/registro/route.ts` con `runtime = "nodejs"`, siguiendo la estructura de `src/app/api/inscripciones/route.ts`, reutilizando la validación de documento existente en `src/lib/validations/inscripcion.ts` (extracto: 6–12 dígitos), validando el token, verificando `activo`, resolviendo el asistente por `(eventoId, documento)`, intentando el `create` de `RegistroControl` y capturando `P2002` → `YA_REGISTRADO`.
- [x] 5.2 Verificar que `POST /api/checkpoints/<token>/registro` devuelve 201 con `{ resultado: "OK" }` para documento inscrito, 409 para documento ya registrado, 404 para documento no inscrito, 422 para checkpoint inactivo, 400 para documento inválido, y 404 para token inexistente. _(Verificado: 6/6 respuestas correctas y un único registro persistido tras el duplicado.)_

## 6. Integración y verificación final

- [x] 6.1 Ejecutar `npm run lint` y `npx tsc --noEmit` y verificar que ambos completan sin errores.
- [x] 6.2 Verificar end-to-end manual: crear evento, añadir checkpoint, verificar que el QR aparece en el detalle, escanear el QR y registrarse con un documento inscrito, intentar registrarse dos veces con el mismo documento (esperar 409). _(Verificado por HTTP contra `next dev` con checkpoints temporales sobre un evento con asistentes existente; datos de prueba limpiados al final.)_
