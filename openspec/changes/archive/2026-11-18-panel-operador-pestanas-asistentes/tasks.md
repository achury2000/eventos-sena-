# Tasks

## 1. Datos del tablero

- [x] 1.1 Ampliar `src/lib/operador/tablero.ts` con un tipo `AsistenteTablero` (`id`, `nombreCompleto`, `registradoPorCheckpoint`) e incluirlo en `EventoTablero`, consultando solo asistentes vigentes de eventos asignados y sin campo `documento`; verificar con una prueba de integración que el DTO contiene nombres y estados pero no documentos.
- [x] 1.2 Confirmar que `GET /api/operador/dashboard` mantiene `401`/`403` para sesión ausente o rol distinto de `OPERADOR` y que no devuelve eventos no asignados; verificar con prueba de integración sobre la ruta.

## 2. Botones por evento

- [x] 2.1 Restaurar los cuatro cuadros de cada evento en `src/app/operador/panel-operador.tsx` como botones **Asistentes**, **Cobertura**, **Checkpoints activos** y **Registros**, con `aria-pressed`, valor agregado visible y estado `vistasPorEvento` inicializado en `cobertura`; verificar con E2E que cada evento abre en Cobertura.
- [x] 2.2 Hacer que el estado sea independiente por evento: cambiar la vista de uno no debe afectar a los otros; verificar con E2E usando dos eventos o comprobando que no existe control global.
- [x] 2.3 Mantener `vistasPorEvento` y `filtro` en `useState`, fuera del DTO; verificar con E2E que tras cambiar de vista y esperar un sondeo la vista sigue activa y que el buscador no la modifica.

## 3. Vista Cobertura

- [x] 3.1 Ubicar `GraficosEvento` dentro de la vista Cobertura del evento, conservando donut global, barras filtradas y las tablas `sr-only`; verificar con E2E que los gráficos siguen presentes al entrar y que el filtro sigue afectando solo las barras.
- [x] 3.2 Quitar el grupo global de pestañas y el texto redundante de “Registros totales”, dejando el total visible en el botón Registros; verificar con E2E que no existe un control global de vistas.

## 4. Vista Asistentes

- [x] 4.1 Conectar `src/app/operador/tabla-asistentes.tsx` a la vista Asistentes de cada evento, con columna de nombre, `SÍ`/`NO` por checkpoint, `Completados`, orden por nombre y desplazamiento horizontal; verificar con E2E que aparecen los nombres y el estado por checkpoint.
- [x] 4.2 Asegurar que la tabla no renderiza `documento`, `centroFormacion` ni rol, y mostrar estado vacío cuando el evento no tenga asistentes vigentes; verificar con E2E que el documento de prueba no aparece y con prueba de integración que el DTO no lo contiene.

## 5. Vista Checkpoints activos

- [x] 5.1 Mostrar el listado de tarjetas, `BotonToggleCheckpoint` y `FormRegistroManual` al pulsar el cuadro **Checkpoints activos** del evento; verificar con E2E que al pulsarlo aparecen el toggle y el formulario.
- [x] 5.2 Deshabilitar el formulario de registro manual cuando `checkpoint.activo` sea `false`, mostrando el mensaje “Active el checkpoint para registrar”; verificar con E2E que un checkpoint inactivo no permite enviar el formulario y que el endpoint sigue respondiendo `422` si se invoca directamente.
- [x] 5.3 Actualizar `tests/e2e/operador.spec.ts` y `tests/e2e/checkpoint.spec.ts` para abrir **Checkpoints activos** del evento antes de usar `Documento del asistente` y `Registrar`, conservando las aserciones de contador y duplicados; verificar que las pruebas pasen.

## 6. Vista Registros

- [x] 6.1 Crear `src/app/operador/tabla-registros.tsx` con columnas Checkpoint, Registrados, Manuales, Autoregistro, Total asistentes y Avance, usando los agregados del DTO y mostrando estado vacío sin checkpoints; verificar con E2E que la tabla aparece al pulsar Registros.
- [x] 6.2 Conectar la tabla al botón Registros de cada evento y conservar el total en el propio botón; verificar con E2E que el total del botón coincide con la suma de la tabla.

## 7. Verificación final

- [x] 7.1 Ejecutar `npm run lint` y `npx tsc --noEmit` sin errores después de los cambios de tipos y componentes.
- [x] 7.2 Ejecutar `npm test`, `npm run build` y `npm run test:e2e` completos sin fallos; verificar que las pruebas del operador y del reporte siguen pasando.
- [x] 7.3 Ejecutar `openspec validate "panel-operador-pestanas-asistentes" --strict` y confirmar que los 4 artefactos están completos antes de solicitar la integración.
