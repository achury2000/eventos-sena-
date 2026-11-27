# Spec Delta

## MODIFIED Requirements

### Requirement: Tablero de asistencia en tiempo real

El panel SHALL mostrar por cada checkpoint el número de registros acumulados contra su base de destinatarios. Para checkpoints manuales, la base SHALL ser el total de asistentes vigentes del evento —`Asistente` cuya `Inscripcion` no está en estado `CANCELADO`— (por ejemplo, «148 / 200»). Para checkpoints respaldados por una habitación (relación `Checkpoint.habitacionId`), la base SHALL ser el número de asistentes asignados a ese cuarto (por ejemplo, «2 / 2»), y SHALL excluir del conteo de registros y del avance cualquier `RegistroControl` histórico de asistentes no asignados, conservándolo en la base de datos. El panel SHALL mostrar además la ocupación del cuarto —asignados/capacidad— como señal distinta del avance. El componente cliente SHALL refrescar estos conteos por sondeo (polling) cada 5 segundos mediante `GET /api/operador/dashboard`, que SHALL requerir una sesión de Operador y SHALL devolver los conteos agrupados por `checkpointId`, la base de destinatarios, la ocupación y los identificadores de ocupantes por habitación, únicamente de los eventos asignados a ese Operador.

#### Scenario: Los conteos se actualizan con el sondeo

- **WHEN** un asistente se registra en un checkpoint mientras el Operador mantiene su panel abierto
- **THEN** el conteo de ese checkpoint aumenta en el siguiente sondeo, sin recargar la página

#### Scenario: Ocupación de un checkpoint de habitación

- **WHEN** un evento tiene checkpoints de habitación y un Administrador asigna o desasigna asistentes a esos cuartos
- **THEN** el panel del Operador muestra la ocupación actualizada (asignados/capacidad) de cada cuarto en el siguiente sondeo, sin recargar la página

#### Scenario: Avance de una habitación con sus ocupantes registrados

- **WHEN** una habitación tiene dos asistentes asignados, ambos registraron en su checkpoint y el evento tiene cinco asistentes vigentes
- **THEN** el panel muestra para esa habitación `2/2` y `100%`, sin usar los cinco asistentes del evento como denominador

#### Scenario: Registros históricos de no asignados no cuentan

- **WHEN** existen registros antiguos de asistentes no asignados a una habitación
- **THEN** el panel conserva esos registros en la base de datos pero no los incluye en el conteo ni en el avance de la habitación

#### Scenario: Checkpoint sin habitación

- **WHEN** un checkpoint no está respaldado por una habitación (checkpoint manual)
- **THEN** el panel no muestra la línea de ocupación del cuarto y conserva el conteo de registrados contra el total de asistentes del evento

#### Scenario: Consulta del tablero sin sesión de Operador

- **WHEN** se llama a `GET /api/operador/dashboard` sin una sesión de rol `OPERADOR`
- **THEN** el sistema responde `401`/`403` y no expone conteos ni ocupaciones

### Requirement: Registro manual asistido

El endpoint `POST /api/operador/registro-manual` SHALL registrar la asistencia de un asistente cuando lo ejecuta un Operador, persistiendo `metodo = "MANUAL"` y `operadorId` del Operador que lo hizo. SHALL exigir que el checkpoint esté `activo` y que pertenezca a un evento asignado al Operador. SHALL responder `201` en el registro exitoso, `409` si el asistente ya estaba registrado en ese checkpoint, `404` si el documento no pertenece a ningún asistente del evento, `422` si el checkpoint está inactivo o si el documento pertenece a un asistente del evento no asignado al checkpoint de habitación, `400` si el documento no es válido, y `403` si el checkpoint no es de un evento asignado. SHALL aplicar las mismas reglas de integridad del autoregistro (restricción única `(asistenteId, checkpointId)`, insertar y capturar `P2002`).

#### Scenario: Registro manual exitoso

- **WHEN** un Operador registra manualmente a un asistente inscrito en un checkpoint activo de un evento asignado
- **THEN** el sistema crea el registro con `metodo = "MANUAL"` y `operadorId` del Operador, y responde `201`

#### Scenario: Asistente ya registrado en el checkpoint

- **WHEN** un Operador registra manualmente a alguien que ya estaba registrado en ese checkpoint
- **THEN** el sistema responde `409` y no crea un segundo registro

#### Scenario: Checkpoint inactivo o de evento no asignado

- **WHEN** un Operador intenta un registro manual en un checkpoint inactivo o de un evento que no tiene asignado
- **THEN** el sistema responde `422` o `403` respectivamente y no crea el registro

#### Scenario: Asistente no asignado a la habitación

- **WHEN** un Operador intenta registrar manualmente en el checkpoint de una habitación a un asistente inscrito en el evento que no está asignado a ese cuarto
- **THEN** el sistema responde `422`, no crea el registro y muestra el mensaje que indica que debe asignarlo a la habitación

#### Scenario: Documento o cuerpo inválido

- **WHEN** se llama a `POST /api/operador/registro-manual` sin un documento válido
- **THEN** el sistema responde `400` y no crea ningún registro

### Requirement: Gráficos de estadísticas en vivo del evento

El panel SHALL mostrar, por cada evento asignado, un indicador gráfico de **cobertura** — el número de asistentes distintos que ya registraron en al menos un checkpoint del evento frente al total de asistentes vigentes (por ejemplo, "2 de 5") — y un **gráfico de barras por checkpoint** que muestre el progreso de registros de cada checkpoint frente a su base de destinatarios —total de asistentes vigentes para checkpoints manuales, ocupantes asignados para habitaciones— desglosado por método de registro: **autoregistro vs manual**. Estos gráficos SHALL refrescarse con el mismo sondeo de 5 segundos que alimenta las tarjetas, SHALL calcular las barras sobre el mismo conjunto de checkpoints visibles que aplique el filtro de búsqueda (con el filtro activo solo se grafican los checkpoints que coinciden, y la sección del evento, con sus gráficos, se oculta si ninguno coincide), y SHALL presentar el donut de cobertura dependiendo únicamente del evento, no del filtro. SHALL tolerar los casos extremos sin errores: evento sin asistentes vigentes muestra "0 / 0" sin dividir entre cero, y evento sin checkpoints no muestra barras.

#### Scenario: El Operador ve la cobertura del evento

- **WHEN** un evento asignado tiene 5 asistentes vigentes y 2 de ellos ya registraron en al menos un checkpoint
- **THEN** el panel muestra un gráfico de cobertura indicando "2 de 5" (o su equivalente porcentual) para ese evento

#### Scenario: Barras de progreso por checkpoint

- **WHEN** el Operador ve la sección de un evento asignado con checkpoints
- **THEN** el panel muestra una barra por checkpoint con sus registros frente a la base de destinatarios de ese checkpoint, desglosada en los segmentos de autoregistro y registro manual

#### Scenario: Barras de habitaciones usan a sus ocupantes como base

- **WHEN** un evento tiene un checkpoint manual y una habitación con dos ocupantes asignados
- **THEN** la barra del checkpoint manual usa el total de asistentes del evento y la barra de la habitación usa sus dos ocupantes

#### Scenario: El desglose distingue registro manual de autoregistro

- **WHEN** un checkpoint tiene registros creados por ambos métodos (AUTOREGISTRO y MANUAL)
- **THEN** el gráfico de ese checkpoint muestra ambos segmentos de forma distinguible (por color/leyenda), y la suma de ambos es igual al total de registros del checkpoint

#### Scenario: Los gráficos se actualizan con el sondeo

- **WHEN** un asistente se registra (autoregistro o manual) mientras el Operador mantiene su panel abierto y el filtro está vacío
- **THEN** la cobertura y las barras del evento afectado se actualizan en el siguiente sondeo, sin recargar la página

#### Scenario: El filtro de búsqueda también filtra las barras

- **WHEN** el Operador escribe un filtro (ej. "60") que coincide solo con algunos checkpoints del evento
- **THEN** las barras muestran únicamente esos checkpoints coincidentes, junto con las tarjetas visibles, y la sección completa —con sus gráficos— se oculta si ningún checkpoint coincide

#### Scenario: La cobertura no depende del filtro

- **WHEN** el Operador tiene un filtro activo que coincide con checkpoints de un evento
- **THEN** el donut de cobertura de ese evento sigue mostrando el total de asistentes distintos ya registrados, independientemente de qué checkpoints coincidan con el filtro

#### Scenario: Evento sin asistentes vigentes

- **WHEN** un evento asignado no tiene asistentes vigentes
- **THEN** el panel muestra la cobertura como "0 / 0" sin errores de división entre cero

#### Scenario: Evento sin checkpoints

- **WHEN** un evento asignado no tiene checkpoints
- **THEN** el panel no muestra gráfico de barras para ese evento (no hay nada que graficar) y conserva el resto de la sección

### Requirement: Vista de Asistentes

La vista Asistentes SHALL mostrar, por cada evento asignado, los nombres completos de los asistentes vigentes —es decir, aquellos cuyas inscripciones no están `CANCELADO`— sin exhibir sus documentos. SHALL incluir una tabla con una columna por checkpoint del evento, con el estado `SÍ` o `NO` de registro de cada asistente en los checkpoints que le son aplicables. En checkpoints de habitación, un asistente no asignado a ese cuarto SHALL mostrar `N/A` y SHALL NO contarse en su total de completados. La columna final SHALL mostrar los checkpoints completados sobre el número de checkpoints aplicables al asistente. Si el evento no tiene asistentes vigentes, SHALL mostrar un estado vacío informativo en lugar de la tabla.

#### Scenario: El operador consulta los asistentes

- **WHEN** un Operador pulsa el botón Asistentes de un evento con asistentes vigentes y checkpoints
- **THEN** ese evento muestra una tabla con el nombre de cada asistente, su estado por checkpoint aplicable y su total de completados

#### Scenario: No se expone el documento

- **WHEN** un Operador consulta la vista Asistentes
- **THEN** la tabla no muestra el documento de ningún asistente

#### Scenario: Asistente no asignado a una habitación

- **WHEN** la vista Asistentes muestra un checkpoint de habitación para un asistente que no está asignado a ese cuarto
- **THEN** esa celda muestra `N/A`, no cuenta como completado y el total usa solo los checkpoints aplicables a ese asistente

#### Scenario: Evento sin asistentes vigentes

- **WHEN** un evento asignado no tiene asistentes vigentes
- **THEN** su vista Asistentes muestra un mensaje informativo y no una tabla vacía

### Requirement: Vista de Checkpoints activos

El botón **Checkpoints activos** SHALL mostrar las tarjetas de los checkpoints del evento con su nombre, categoría, estado activo/inactivo, el control para activarlos o desactivarlos y el formulario de registro manual. SHALL deshabilitar el registro manual cuando el checkpoint esté inactivo, mostrando una explicación, y SHALL conservar las reglas de permisos e integridad existentes para ambas acciones. Cuando el checkpoint corresponda a una habitación, SHALL indicar que el registro manual está limitado a los asistentes asignados a ese cuarto.

#### Scenario: Activar o desactivar desde la vista

- **WHEN** un Operador pulsa el botón Checkpoints activos de un evento y usa el control de activación de una tarjeta
- **THEN** el checkpoint cambia de estado y el cambio se refleja en la tarjeta tras el siguiente refresco

#### Scenario: Registro manual en checkpoint activo

- **WHEN** un Operador pulsa el botón Checkpoints activos de un evento y utiliza el formulario de registro manual de un checkpoint activo
- **THEN** el registro se crea con las mismas reglas y respuestas que en el panel actual

#### Scenario: Registro manual en checkpoint inactivo

- **WHEN** un Operador ve un checkpoint inactivo en la vista Checkpoints activos
- **THEN** el formulario de registro manual aparece deshabilitado con un mensaje que indica que debe activar el checkpoint primero

#### Scenario: Registro manual en una habitación

- **WHEN** un Operador ve el formulario de registro manual de un checkpoint de habitación
- **THEN** el formulario indica que solo puede registrar a asistentes asignados a esa habitación

### Requirement: Vista de Registros

El botón **Registros** SHALL mostrar una tabla por checkpoint con el número de registros totales, cuántos fueron manuales, cuántos fueron por autoregistro y el avance frente a la base de destinatarios del checkpoint —total de asistentes vigentes para checkpoints manuales, ocupantes asignados para habitaciones—. SHALL mostrar esa base en la columna correspondiente en lugar de un total fijo del evento. El valor total de registros SHALL seguir visible en el propio botón. Si el evento no tiene checkpoints, SHALL mostrar un estado vacío informativo en lugar de la tabla.

#### Scenario: El operador consulta el detalle de registros

- **WHEN** un Operador pulsa el botón Registros de un evento con checkpoints
- **THEN** ese evento muestra una tabla con el total de registros, manuales, autoregistros y avance por checkpoint

#### Scenario: Avance de una habitación en Registros

- **WHEN** una habitación con dos ocupantes asignados tiene dos registros y el evento tiene cinco asistentes
- **THEN** la tabla Registros muestra la base `2`, el avance `100%` y no usa los cinco asistentes del evento

#### Scenario: Evento sin checkpoints en Registros

- **WHEN** un Operador pulsa Registros en un evento sin checkpoints
- **THEN** el evento muestra un mensaje informativo y no una tabla vacía

### Requirement: Nombres y estados de asistentes en el tablero

`GET /api/operador/dashboard` SHALL devolver, para cada evento asignado al Operador, la lista de asistentes vigentes con su identificador, nombre completo y un mapa que indique si cada asistente está registrado en cada checkpoint del evento, además de los identificadores de los ocupantes asignados a cada habitación para determinar la aplicabilidad de esos checkpoints. El endpoint SHALL mantener la autenticación y autorización por rol `OPERADOR`, SHALL limitar los datos a eventos asignados a ese Operador y SHALL NO incluir documentos de identidad en la respuesta.

#### Scenario: El tablero entrega nombres y estados

- **WHEN** un Operador consulta `/api/operador/dashboard` y tiene eventos asignados
- **THEN** la respuesta incluye para cada evento los nombres de los asistentes vigentes y su estado de registro por checkpoint, sin documentos

#### Scenario: Identificadores de ocupantes sin documentos

- **WHEN** el tablero incluye un checkpoint de habitación con ocupantes asignados
- **THEN** la respuesta incluye los identificadores de esos ocupantes para marcar la aplicabilidad del checkpoint, pero no sus documentos

#### Scenario: Acceso no autorizado al tablero

- **WHEN** se llama a `/api/operador/dashboard` sin sesión o con un rol distinto de `OPERADOR`
- **THEN** el sistema responde `401` o `403` y no expone nombres ni estados

#### Scenario: Eventos no asignados quedan fuera

- **WHEN** un Operador consulta el tablero y existen eventos no asignados a él
- **THEN** la respuesta no incluye asistentes ni checkpoints de esos eventos
