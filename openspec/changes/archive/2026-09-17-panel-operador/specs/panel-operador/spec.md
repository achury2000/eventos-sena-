## Purpose

Da al Operador las herramientas del día del evento: activar y desactivar los checkpoints que tiene asignados, vigilar la asistencia en tiempo real por evento y registrar manualmente a quien no puede autoregistrarse, con las mismas garantías de integridad del autoregistro por QR.

## ADDED Requirements

### Requirement: Acceso exclusivo del Operador a su panel

El sistema SHALL permitir el acceso a `/operador` y a sus endpoints (`/api/operador/*`) solo a sesiones con rol `OPERADOR`. Sin sesión, SHALL redirigir a `/login`; con una sesión de rol `ADMINISTRADOR`, SHALL redirigir a su propia zona. Las Server Actions del Operador SHALL validar además el rol en el servidor, sin confiar en el proxy.

#### Scenario: Operador accede a su panel

- **WHEN** un usuario con sesión de rol `OPERADOR` visita `/operador`
- **THEN** el sistema muestra su panel de operación

#### Scenario: Acceso sin sesión o con otro rol

- **WHEN** un usuario sin sesión, o con sesión de rol `ADMINISTRADOR`, intenta acceder a `/operador`
- **THEN** el sistema lo redirige a `/login` o a la zona de Administrador según corresponda, sin mostrar el panel

### Requirement: Eventos asignados y sus checkpoints

El panel SHALL mostrar únicamente los eventos asignados al Operador (relación `EventoOperador`) y, por cada evento, sus checkpoints con nombre, categoría y estado `activo`. Si el Operador no tiene eventos asignados, SHALL mostrar un estado vacío informativo.

#### Scenario: Operador con eventos asignados

- **WHEN** un Operador abre su panel y tiene al menos un evento asignado
- **THEN** el sistema lista esos eventos con sus checkpoints y el estado de cada uno

#### Scenario: Operador sin eventos asignados

- **WHEN** un Operador abre su panel y no tiene eventos asignados
- **THEN** el sistema muestra un mensaje indicando que aún no tiene eventos asignados

### Requirement: Activación y desactivación de checkpoint por el Operador

El panel SHALL permitir al Operador activar o desactivar cada checkpoint de un evento asignado. Al cambiar el estado, el sistema SHALL persistir `Checkpoint.activo` y SHALL registrar en `activadoPorId` al Operador que realizó el cambio (último cambio, no historial — CONTEXT.md §5). SHALL rechazar el cambio si el checkpoint no pertenece a un evento asignado a ese Operador.

#### Scenario: Activar un checkpoint

- **WHEN** un Operador activa un checkpoint de un evento asignado
- **THEN** el checkpoint queda `activo = true` y `activadoPorId` apunta a ese Operador

#### Scenario: Desactivar un checkpoint

- **WHEN** un Operador desactiva un checkpoint de un evento asignado
- **THEN** el checkpoint queda `activo = false` y `activadoPorId` apunta a ese Operador

#### Scenario: Checkpoint de un evento no asignado

- **WHEN** un Operador intenta cambiar el estado de un checkpoint de un evento que no tiene asignado
- **THEN** el sistema rechaza la operación y no modifica el checkpoint

### Requirement: Tablero de asistencia en tiempo real

El panel SHALL mostrar por cada checkpoint el número de registros acumulados contra el total de asistentes del evento, entendido como los `Asistente` cuya `Inscripcion` no está en estado `CANCELADO` (por ejemplo, "148 / 200"). El componente cliente SHALL refrescar estos conteos por sondeo (polling) cada 5 segundos mediante `GET /api/operador/dashboard`, que SHALL requerir una sesión de Operador y SHALL devolver los conteos agrupados por `checkpointId` únicamente de los eventos asignados a ese Operador.

#### Scenario: Los conteos se actualizan con el sondeo

- **WHEN** un asistente se registra en un checkpoint mientras el Operador mantiene su panel abierto
- **THEN** el conteo de ese checkpoint aumenta en el siguiente sondeo, sin recargar la página

#### Scenario: Consulta del tablero sin sesión de Operador

- **WHEN** se llama a `GET /api/operador/dashboard` sin una sesión de rol `OPERADOR`
- **THEN** el sistema responde `401`/`403` y no expone conteos

### Requirement: Registro manual asistido

El endpoint `POST /api/operador/registro-manual` SHALL registrar la asistencia de un asistente cuando lo ejecuta un Operador, persistiendo `metodo = "MANUAL"` y `operadorId` del Operador que lo hizo. SHALL exigir que el checkpoint esté `activo` y que pertenezca a un evento asignado al Operador. SHALL responder `201` en el registro exitoso, `409` si el asistente ya estaba registrado en ese checkpoint, `404` si el documento no pertenece a ningún asistente del evento, `422` si el checkpoint está inactivo, `400` si el documento no es válido, y `403` si el checkpoint no es de un evento asignado. SHALL aplicar las mismas reglas de integridad del autoregistro (restricción única `(asistenteId, checkpointId)`, insertar y capturar `P2002`).

#### Scenario: Registro manual exitoso

- **WHEN** un Operador registra manualmente a un asistente inscrito en un checkpoint activo de un evento asignado
- **THEN** el sistema crea el registro con `metodo = "MANUAL"` y `operadorId` del Operador, y responde `201`

#### Scenario: Asistente ya registrado en el checkpoint

- **WHEN** un Operador registra manualmente a alguien que ya estaba registrado en ese checkpoint
- **THEN** el sistema responde `409` y no crea un segundo registro

#### Scenario: Checkpoint inactivo o de evento no asignado

- **WHEN** un Operador intenta un registro manual en un checkpoint inactivo o de un evento que no tiene asignado
- **THEN** el sistema responde `422` o `403` respectivamente y no crea el registro

#### Scenario: Documento o cuerpo inválido

- **WHEN** se llama a `POST /api/operador/registro-manual` sin un documento válido
- **THEN** el sistema responde `400` y no crea ningún registro