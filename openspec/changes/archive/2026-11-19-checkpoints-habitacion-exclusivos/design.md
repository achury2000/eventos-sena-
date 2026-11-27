# Design

## Context

Ver `proposal.md` para la motivación. Hoy `registrarAsistenciaEnCheckpoint` solo comprueba que el documento exista en el evento y que el checkpoint esté activo; ambas rutas (QR público y registro manual del Operador) comparten esa función. `cargarTableroOperador` agrupa todos los `RegistroControl` por checkpoint y la interfaz usa `evento.totalAsistentes` como denominador para tarjetas, barras y tabla de registros. El esquema ya modela la ocupación con `AsistenteHabitacion` (clave primaria compuesta), así que no hace falta migración.

## Goals / Non-Goals

**Goals:**

- Aplicar la regla de pertenencia a la habitación en un único lugar, compartido por QR y registro manual.
- Que el tablero entregue una base de destinatarios coherente por checkpoint y los identificadores de ocupantes necesarios para marcar celdas no aplicables.
- Que tarjetas, gráficos y tablas usen esa misma base sin lógica duplicada en el cliente.
- Conservar registros históricos sin borrarlos ni migrarlos.

**Non-Goals:**

- Cambiar el esquema de Prisma ni crear migraciones.
- Modificar el flujo de asignación/desasignación de habitaciones del Administrador.
- Añadir endpoints nuevos ni cambiar las firmas públicas de los existentes.
- Revisar la cobertura global del evento: sigue contando asistentes distintos con cualquier registro.

## Decisions

### 1. Validación de ocupantes en la capa compartida de registro

`CheckpointParaRegistro` incorpora `habitacionId?: string | null` y `registrarAsistenciaEnCheckpoint` consulta `asistenteHabitacion.findUnique` con la clave compuesta `(asistenteId, habitacionId)` después de resolver el documento. Si no existe la relación, devuelve `NO_ASIGNADO_A_HABITACION`.

- **Por qué:** ambas rutas ya delegan en esta función; validar aquí evita divergencias entre QR y registro manual.
- **Estado:** `422`, igual que un checkpoint inactivo. No es `403`: el fallo no es de autenticación del usuario sino de aplicabilidad de la estación al asistente.
- **Alternativas descartadas:** validar en cada ruta (duplicación y riesgo de olvidar una); añadir una restricción en la base de datos (no expresa la regla de pertenencia sin acoplar `RegistroControl` a `AsistenteHabitacion`); responder `404` (confunde «no inscrito» con «no asignado»).

### 2. La base de destinatarios se calcula en el servidor

`CheckpointTablero` incorpora `baseDestinatarios: number` y `habitacion.asignados: string[]`. Para checkpoints manuales, `baseDestinatarios = totalAsistentes`. Para habitaciones, `baseDestinatarios = ocupados` y `asignados` contiene los IDs de esas relaciones. Los conteos `registros` y `manuales` de habitaciones se derivan filtrando los registros cuyo `asistenteId` esté en `asignados`.

- **Por qué:** el cliente solo consume un campo; evita que cinco componentes vuelvan a interpretar la regla y mantiene el sondeo coherente.
- **Consultas:** se sustituye el `groupBy` por un `findMany` plano de `(checkpointId, asistenteId, metodo)` sobre los eventos asignados y se reduce en memoria con los conjuntos de ocupantes por habitación. Sigue siendo un número constante de consultas, sin N+1.
- **Alternativas descartadas:** filtrar solo en la interfaz (los conteos del botón Registros seguirían contradiciendo el avance); un `groupBy` por asistente (más complejo de reducir y con el mismo volumen de filas).

### 3. Presentación: N/A en lugar de ocultar columnas

`TablaAsistentes` decide aplicabilidad con `checkpoint.habitacion?.asignados.includes(asistente.id) ?? true`. Las celdas no aplicables muestran `N/A` con una etiqueta accesible, y `Completados` divide entre el número de checkpoints aplicables al asistente. `TablaRegistros` muestra la columna «Base» con `baseDestinatarios`. La barra de progreso de la tarjeta y las barras de Recharts usan el mismo campo.

- **Por qué:** ocultar columnas cambiaría la estructura de la tabla entre asistentes; `N/A` explica por qué ese checkpoint no aplica sin exponer documentos.

### 4. Historical rows

No se eliminan registros de asistentes no asignados. Siguen en `RegistroControl` como evidencia, pero `cargarTableroOperador` los excluye del conteo y avance de la habitación. Un despliegue anterior puede revertirse solo con código.

## Risks / Trade-offs

- **[Riesgo]** Un QR impreso quede obsoleto si el Administrador reasigna al ocupante a otro cuarto. → Mitigación: el mensaje de rechazo indica explícitamente que el asistente debe estar asignado a esa habitación; la reasignación ya es una acción administrativa existente.
- **[Riesgo]** Registros históricos de no asignados dejen de verse en el panel. → Mitigación: se conservan en base de datos y el change lo declara; no se borra evidencia.
- **[Riesgo]** Una habitación sin ocupantes tenga base 0. → Mitigación: el avance se muestra como 0% y la tabla indicará base 0 sin división por cero.
- **[Trade-off]** Una consulta plana de registros sustituye al `groupBy`; para eventos muy grandes hay más filas en memoria, pero se mantiene el patrón de consulta constante ya usado por el tablero.

## Migration Plan

Despliegue solo de código: no hay cambios de esquema ni datos. Los registros existentes permanecen intactos. Rollback: revertir los commits del change; la interfaz vuelve a usar el total del evento como base y el registro vuelve a aceptar cualquier inscrito.

## Open Questions

- ninguna
