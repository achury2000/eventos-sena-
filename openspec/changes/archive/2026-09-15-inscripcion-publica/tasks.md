## 1. Dependencias y validaciones

- [x] 1.1 Instalar `@aws-sdk/client-s3`, `react-signature-canvas` y `@types/react-signature-canvas`; verificar que `npm run build` sigue compilando
- [x] 1.2 Crear `src/lib/validations/inscripcion.ts` con `esquemaAsistente`, `esquemaInscripcion` (Zod, patrón CONTEXT.md §7: documento `^\d{6,12}$`, nombre 3–150, centro opcional, acompañantes max 10, correo opcional) y helper `validarEventoParaInscripcion` (estado `INSCRIPCIONES_ABIERTAS` + periodo vigente); verificar `npx tsc --noEmit`

## 2. Storage de firmas (MinIO/S3)

- [x] 2.1 Crear `src/lib/storage.ts` con cliente `@aws-sdk/client-s3` (endpoint `S3_ENDPOINT`, `forcePathStyle: true`, `S3_REGION`, credenciales de env), `subirFirma(png: Buffer): Promise<string>` (clave `inscripciones/<uuid>.png`) y `eliminarFirma(clave: string)`; verificar typecheck y que el módulo no se arrastra a bundle de cliente
- [x] 2.2 Probar `subirFirma`/`eliminarFirma` localmente contra MinIO (`docker compose up -d db storage`) con un script `tsx` desechable; verificar que el objeto aparece/desaparece del bucket `firmas-digitales`

## 3. Route Handler de inscripción

- [x] 3.1 Crear `src/app/api/inscripciones/route.ts` (`export const runtime = "nodejs"`): `POST` que recibe JSON (titular, acompañantes, correo, firma base64), valida con Zod, valida estado/periodo del evento (400/403), sube la firma, ejecuta la transacción atómica de cupo por total de personas (`$executeRaw` con `cuposOcupados + total <= cupoMaximo` y `estado = 'INSCRIPCIONES_ABIERTAS'`), captura `P2002` y elimina la firma en caso de fallo; respuestas `201 {id}` / `400` / `409` / `500`; verificar typecheck
- [x] 3.2 Probar concurrencia con `curl`: dos POST simultáneos cuando solo queda 1 cupo → exactamente un `201` y un `409`; verificar `cuposOcupados` en DB
- [x] 3.3 Probar duplicado de documento en el mismo evento → segundo POST responde `409` (P2002, sin consulta previa) y no hay objetos de firma huérfanos en MinIO

## 4. Cancelación por Administrador

- [x] 4.1 Crear `src/app/api/inscripciones/[id]/cancelar/route.ts` (`runtime = "nodejs"`): valida sesión con `auth()` y rol `ADMINISTRADOR` (401/403), calcula total de asistentes de la inscripción, en una `$transaction` hace `update` de `Inscripcion.estado → CANCELADO` (filtrando por no cancelada) + `$executeRaw` decrementando `cuposOcupados` (guarda `>= 0`); respuestas `204` / `404` / `409`; verificar typecheck
- [x] 4.2 Probar con `curl` como Admin (cookie de sesión): cancelación de un grupo de 3 decrementa `cuposOcupados` en 3; doble cancelación responde `409` sin tocar el cupo; request sin sesión Admin es rechazada

## 5. Página pública de inscripción

- [x] 5.1 Crear `src/app/inscripcion/[eventoId]/page.tsx` (server): valida evento (existencia, estado, periodo) y decide entre formulario o mensaje informativo; pasa evento y lista de centros al form; verificar renderizado en `/inscripcion/[eventoId]`
- [x] 5.2 Crear `src/app/inscripcion/[eventoId]/firma.tsx` (cliente): wrapper de `react-signature-canvas` con limpiar y acceso al dataURL de la firma
- [x] 5.3 Crear `src/app/inscripcion/[eventoId]/form-inscripcion.tsx` (cliente): titular (nombre, documento, centro opcional, correo opcional), acompañantes dinámicos (máx. 10), firma obligatoria, casilla única de tratamiento de datos, envío `fetch` a `/api/inscripciones`, estados de éxito/error mapeando `400`/`409`; verificar flujo completo en `npm run dev`

## 6. Vista admin de inscripciones

- [x] 6.1 Crear `src/app/admin/eventos/[id]/inscripciones/page.tsx` (server con `requireAdmin`): lista paginada (`take: 50`, orden por `fechaInscripcion desc`) con titular, nº de asistentes, correo, fecha, estado y botón Cancelar con `confirm`; total de inscripciones; verificar renderizado con login Admin
- [x] 6.2 Agregar enlace "Inscripciones" desde `src/app/admin/eventos/[id]/page.tsx` y verificar navegación

## 7. Verificación integral

- [x] 7.1 `npm run lint` y `npx tsc --noEmit` pasan sin errores
- [x] 7.2 `npm run build` compila en modo producción
- [x] 7.3 Prueba end-to-end manual: crear evento → abrir inscripciones → inscribir grupo de 3 (verificar subida de firma y `cuposOcupados`) → cancelar desde el panel Admin (verificar `CANCELADO` y decremento) → intentar inscribir documento duplicado (verificar `409`)