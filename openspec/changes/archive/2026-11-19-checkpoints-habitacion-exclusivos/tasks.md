# Tasks

## 1. Reglas de registro en habitaciones

- [x] 1.1 Ampliar las factories de prueba con habitación, su checkpoint de `ALOJAMIENTO` y asignación de asistentes; verificar que las pruebas actuales sigan pasando con `npm test`.
- [x] 1.2 Incorporar `habitacionId` a `CheckpointParaRegistro` y pasarlo desde las rutas de QR y registro manual; verificar con `npx tsc --noEmit`.
- [x] 1.3 Agregar el resultado `NO_ASIGNADO_A_HABITACION` y validar la relación `AsistenteHabitacion` en `registrarAsistenciaEnCheckpoint`; verificar con una prueba de integración que un inscrito no asignado sea rechazado sin crear `RegistroControl`.
- [x] 1.4 Actualizar los mapas de mensaje y estatus de ambas rutas para responder `422` con texto explicativo; verificar que las respuestas de QR y manual contengan ese mensaje.

## 2. Tablero y base de destinatarios

- [x] 2.1 Ampliar `CheckpointTablero` con `baseDestinatarios` y `habitacion.asignados: string[]`, sin documentos; verificar con `npx tsc --noEmit`.
- [x] 2.2 Sustituir el `groupBy` de registros por una consulta plana y calcular en `cargarTableroOperador` la base y los conteos filtrados por ocupantes; verificar con una prueba de integración donde 2 registros sobre 2 ocupantes den 100% aunque el evento tenga 5 asistentes.
- [x] 2.3 Comprobar que los registros históricos de no asignados se conservan en la base de datos pero no cuentan para la habitación; verificar con la prueba de integración del DTO.

## 3. Interfaz del Operador

- [x] 3.1 Usar `baseDestinatarios` en la `BarraProgreso` y en el detalle de la tarjeta del panel; verificar en E2E que Habitación 601 muestre `2/2` y `100%`.
- [x] 3.2 Usar `baseDestinatarios` en las barras de `GraficosEvento`; verificar en E2E que la barra de la habitación no use el total de asistentes del evento.
- [x] 3.3 Mostrar `N/A` en `TablaAsistentes` para checkpoints de habitación no aplicables y dividir `Completados` solo entre checkpoints aplicables; verificar en E2E la celda y el total.
- [x] 3.4 Mostrar la columna de base real y el avance recalculado en `TablaRegistros`; verificar en E2E que la base sea `2` y el avance `100%`.
- [x] 3.5 Mostrar en `FormRegistroManual` el aviso de que solo se registran ocupantes asignados cuando el checkpoint sea de habitación; verificar en E2E que el texto aparece y que un documento no asignado devuelve el error `422`.

## 4. Verificación y entrega

- [x] 4.1 Ejecutar `npm run lint`, `npx tsc --noEmit`, `npm test` y `npm run build`; verificar que todo termine sin errores.
- [x] 4.2 Ejecutar `npm run test:e2e`; verificar que la suite completa pase, incluidas las pruebas nuevas de habitación.
- [x] 4.3 Reconstruir el contenedor `bienestar_sena_app` con `docker compose --profile full up -d --build app` y verificar que `GET /login` responda `200`.
- [x] 4.4 Confirmar que no hay cambios en `prisma/schema.prisma` ni migraciones nuevas y que el working tree está limpio tras el commit.
