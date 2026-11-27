## Purpose

Da al Operador las herramientas del día del evento: activar y desactivar los checkpoints que tiene asignados, vigilar la asistencia en tiempo real por evento y registrar manualmente a quien no puede autoregistrarse, con las mismas garantías de integridad del autoregistro por QR.

## Requirements

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

El panel SHALL mostrar, por cada evento asignado, un indicador gráfico de **cobertura** — el número de asistentes distintos que ya registraron en al menos un checkpoint del evento frente al total de asistentes vigentes (por ejemplo, "2 de 5") — y un **gráfico de barras por checkpoint** que muestre el progreso de registros de cada checkpoint frente a su base de destinatarios —total de asistentes vigentes para checkpoints manuales, ocupantes asignados para habitaciones— desglosado por método de registro: **autoregistro vs manual**. Estos gráficos SHALL refrescarse con el mismo sondeo de 5 segundos que alimenta las tarjetas, SHALL calcular las barras sobre el conjunto de checkpoints visibles según el buscador de la vista `Cobertura` de ese evento —con texto activo solo se grafican los checkpoints que coinciden— y SHALL presentar un estado vacío en las barras cuando no haya coincidencias, sin ocultar la sección del evento ni el donut de cobertura. El donut SHALL depender únicamente del evento, no del buscador. SHALL tolerar los casos extremos sin errores: evento sin asistentes vigentes muestra "0 / 0" sin dividir entre cero, y evento sin checkpoints no muestra barras.

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

- **WHEN** un asistente se registra (autoregistro o manual) mientras el Operador mantiene su panel abierto y el buscador de `Cobertura` está vacío
- **THEN** la cobertura y las barras del evento afectado se actualizan en el siguiente sondeo, sin recargar la página

#### Scenario: El filtro de búsqueda también filtra las barras

- **WHEN** el Operador escribe en el buscador de `Cobertura` un texto (ej. "60") que coincide solo con algunos checkpoints del evento
- **THEN** las barras muestran únicamente esos checkpoints coincidentes y, si ninguno coincide, muestran un estado vacío sin ocultar la sección ni el donut de cobertura

#### Scenario: La cobertura no depende del filtro

- **WHEN** el Operador tiene texto en el buscador de `Cobertura` de un evento
- **THEN** el donut de cobertura de ese evento sigue mostrando el total de asistentes distintos ya registrados, independientemente de qué checkpoints coincidan con el buscador

#### Scenario: Evento sin asistentes vigentes

- **WHEN** un evento asignado no tiene asistentes vigentes
- **THEN** el panel muestra la cobertura como "0 / 0" sin errores de división entre cero

#### Scenario: Evento sin checkpoints

- **WHEN** un evento asignado no tiene checkpoints
- **THEN** el panel no muestra gráfico de barras para ese evento (no hay nada que graficar) y conserva el resto de la sección

### Requirement: Botones por evento en el tablero del operador

Cada sección de evento del panel SHALL conservar sus cuatro cuadros originales —**Asistentes**, **Cobertura**, **Checkpoints activos** y **Registros**— y convertirlos en controles que cambian el contenido únicamente de esa sección. Los controles SHALL aparecer en ese orden y SHALL seguir mostrando el valor agregado que mostraban antes. No SHALL existir un control global que cambie todos los eventos a la vez ni un buscador global. Al entrar a `/operador`, cada evento SHALL abrir en **Cobertura**. El estado de vista SHALL ser independiente por evento y SHALL permanecer igual durante los refrescos por sondeo. Cada vista SHALL conservar su propio buscador, sin que escribir en él cambie la vista activa ni afecte a otros eventos.

#### Scenario: El operador entra al panel

- **WHEN** un Operador abre `/operador` con al menos un evento asignado
- **THEN** cada evento muestra sus cuatro cuadros como botones y la vista Cobertura activa en ese evento

#### Scenario: El operador cambia la vista de un evento

- **WHEN** el Operador pulsa cualquiera de los cuatro botones de un evento
- **THEN** solo cambia el contenido de ese evento y los demás eventos conservan su vista activa

#### Scenario: El sondeo no reinicia las vistas

- **WHEN** el tablero se refresca por sondeo mientras distintos eventos tienen vistas activas diferentes
- **THEN** cada evento conserva su vista activa y muestra los datos actualizados en esa misma vista

#### Scenario: El buscador no cambia las vistas

- **WHEN** el Operador escribe en el buscador de la vista activa de un evento
- **THEN** solo se filtra el contenido de esa vista y la vista activa del evento no cambia

### Requirement: Vista de Asistentes

La vista Asistentes SHALL mostrar, por cada evento asignado, los nombres completos de los asistentes vigentes —es decir, aquellos cuyas inscripciones no están `CANCELADO`— sin exhibir sus documentos. SHALL incluir una tabla con una columna por checkpoint del evento, con el estado `SÍ` o `NO` de registro de cada asistente en los checkpoints que le son aplicables. En checkpoints de habitación, un asistente no asignado a ese cuarto SHALL mostrar `N/A` y SHALL NO contarse en su total de completados. La columna final SHALL mostrar los checkpoints completados sobre el número de checkpoints aplicables al asistente, con independencia de qué columnas estén visibles; cuando el buscador oculte columnas, SHALL mostrar además cuántas columnas están visibles. La tabla SHALL soportar scroll horizontal sin apretar la información: columnas `Nombre` y `Completados` fijas, cabecera fija, ancho mínimo por columna de checkpoint y etiqueta corta de la habitación con el nombre completo disponible en `title`/`aria-label`. El buscador de esta vista SHALL comparar, sin distinguir mayúsculas ni tildes, el texto con el nombre completo del asistente y con el nombre y la categoría del checkpoint: SHALL filtrar filas cuando coincida con asistentes y SHALL filtrar columnas cuando coincida con checkpoints, aplicando ambos filtros si hay coincidencias en los dos. Si el evento no tiene asistentes vigentes o no hay coincidencias, SHALL mostrar un estado vacío informativo en lugar de la tabla.

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

#### Scenario: El buscador filtra asistentes por nombre

- **WHEN** el Operador escribe un nombre o fragmento de nombre en el buscador de `Asistentes`
- **THEN** la tabla muestra únicamente las filas de los asistentes cuyo nombre completo coincide, sin distinguir mayúsculas ni tildes

#### Scenario: El buscador filtra habitaciones por nombre o categoría

- **WHEN** el Operador escribe un fragmento como "601" o "alojamiento" en el buscador de `Asistentes`
- **THEN** la tabla muestra únicamente las columnas de checkpoints cuyo nombre o categoría coincide, sin distinguir mayúsculas ni tildes

#### Scenario: El buscador filtra filas y columnas a la vez

- **WHEN** el texto del buscador de `Asistentes` coincide con un asistente y con un checkpoint
- **THEN** la tabla muestra la fila de ese asistente y la columna de ese checkpoint, con el estado que corresponda a su intersección

#### Scenario: Completados conserva su denominador con columnas ocultas

- **WHEN** el buscador de `Asistentes` oculta columnas de checkpoints aplicables a un asistente
- **THEN** su columna `Completados` sigue mostrando los completados sobre todos los checkpoints aplicables e indica cuántas columnas están visibles

#### Scenario: La tabla conserva columnas fijas al desplazarse

- **WHEN** un evento tiene bastantes habitaciones para requerir scroll horizontal en `Asistentes`
- **THEN** las columnas `Nombre` y `Completados` y la cabecera permanecen visibles mientras se desplazan las columnas de habitaciones

#### Scenario: Sin coincidencias en Asistentes

- **WHEN** el texto del buscador de `Asistentes` no coincide con ningún asistente ni checkpoint
- **THEN** la vista muestra un mensaje informativo de sin resultados y no una tabla vacía

### Requirement: Vista de Checkpoints activos

El botón **Checkpoints activos** SHALL mostrar las tarjetas de los checkpoints del evento con su nombre, categoría, estado activo/inactivo, el control para activarlos o desactivarlos y el formulario de registro manual. SHALL deshabilitar el registro manual cuando el checkpoint esté inactivo, mostrando una explicación, y SHALL conservar las reglas de permisos e integridad existentes para ambas acciones. Cuando el checkpoint corresponda a una habitación, SHALL indicar que el registro manual está limitado a los asistentes asignados a ese cuarto. El buscador de esta vista SHALL filtrar las tarjetas del evento por nombre o categoría del checkpoint, sin distinguir mayúsculas ni tildes, conservando intactas las acciones de las tarjetas visibles durante el filtro y el sondeo. Si ningún checkpoint coincide, SHALL mostrar un estado vacío informativo sin ocultar la sección del evento.

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

#### Scenario: El buscador filtra tarjetas

- **WHEN** el Operador escribe un fragmento de nombre o categoría en el buscador de `Checkpoints activos`
- **THEN** solo se muestran las tarjetas coincidentes del evento, con sus controles y formularios intactos

#### Scenario: Sin coincidencias en Checkpoints activos

- **WHEN** el texto del buscador de `Checkpoints activos` no coincide con ningún checkpoint del evento
- **THEN** la vista muestra un mensaje informativo de sin resultados y no una lista vacía

### Requirement: Vista de Registros

El botón **Registros** SHALL mostrar una tabla por checkpoint con el número de registros totales, cuántos fueron manuales, cuántos fueron por autoregistro y el avance frente a la base de destinatarios del checkpoint —total de asistentes vigentes para checkpoints manuales, ocupantes asignados para habitaciones—. SHALL mostrar esa base en la columna correspondiente en lugar de un total fijo del evento. El valor total de registros SHALL seguir visible en el propio botón. El buscador de esta vista SHALL filtrar las filas por nombre o categoría del checkpoint, sin distinguir mayúsculas ni tildes, conservando la base y el avance de las filas visibles. Si el evento no tiene checkpoints o ninguno coincide con el buscador, SHALL mostrar un estado vacío informativo en lugar de una tabla vacía.

#### Scenario: El operador consulta el detalle de registros

- **WHEN** un Operador pulsa el botón Registros de un evento con checkpoints
- **THEN** ese evento muestra una tabla con el total de registros, manuales, autoregistros y avance por checkpoint

#### Scenario: Avance de una habitación en Registros

- **WHEN** una habitación con dos ocupantes asignados tiene dos registros y el evento tiene cinco asistentes
- **THEN** la tabla Registros muestra la base `2`, el avance `100%` y no usa los cinco asistentes del evento

#### Scenario: Evento sin checkpoints en Registros

- **WHEN** un Operador pulsa Registros en un evento sin checkpoints
- **THEN** el evento muestra un mensaje informativo y no una tabla vacía

#### Scenario: El buscador filtra checkpoints en Registros

- **WHEN** el Operador escribe un fragmento de nombre o categoría en el buscador de `Registros`
- **THEN** la tabla muestra únicamente las filas de los checkpoints coincidentes con su base y avance

#### Scenario: Sin coincidencias en Registros

- **WHEN** el texto del buscador de `Registros` no coincide con ningún checkpoint del evento
- **THEN** la vista muestra un mensaje informativo de sin resultados y no una tabla vacía

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

### Requirement: Búsqueda dentro de cada evento y vista

El panel SHALL NO incluir un buscador global. Cada sección de evento SHALL mostrar un buscador dentro de la vista activa, de modo que el texto filtre únicamente el contenido que esa vista está listando. El buscador SHALL comparar, sin distinguir mayúsculas ni tildes, contra el nombre y la categoría del checkpoint en `Cobertura`, `Checkpoints activos` y `Registros`, y contra el nombre del asistente y el nombre y la categoría del checkpoint en `Asistentes`, según los requisitos particulares de cada vista. El texto SHALL ser independiente por evento y por vista, SHALL conservarse durante el refresco por sondeo y al cambiar de vista, y SHALL afectar solo a ese evento y esa vista. Vaciar un buscador SHALL restaurar el contenido completo de esa vista sin alterar los demás buscadores. El filtrado SHALL realizarse sobre los datos ya cargados en el cliente, sin consultas adicionales al servidor, y SHALL conservar las acciones de los elementos visibles y el refresco por sondeo. Cuando no haya coincidencias, la sección del evento SHALL permanecer visible y la vista SHALL mostrar su propio estado vacío informativo.

#### Scenario: Cada evento tiene su buscador en la vista activa

- **WHEN** un Operador abre el panel con al menos un evento asignado
- **THEN** cada sección de evento muestra un buscador dentro de su vista activa y no existe un buscador global en el encabezado del panel

#### Scenario: La búsqueda no cruza eventos

- **WHEN** un Operador escribe un texto en el buscador de un evento
- **THEN** solo se filtra el contenido de ese evento y los demás eventos conservan su contenido completo

#### Scenario: Cada vista recuerda su texto

- **WHEN** un Operador escribe en el buscador de `Asistentes`, cambia a `Cobertura` y vuelve a `Asistentes` en el mismo evento
- **THEN** el buscador de `Asistentes` conserva su texto y el buscador de `Cobertura` conserva el suyo

#### Scenario: El texto sobrevive al sondeo

- **WHEN** el tablero se refresca por sondeo mientras un buscador tiene texto
- **THEN** los datos se actualizan y el texto del buscador permanece aplicado

#### Scenario: Vaciar un buscador restaura solo esa vista

- **WHEN** un Operador borra el texto de un buscador
- **THEN** esa vista vuelve a mostrar su contenido completo y los demás eventos y vistas conservan sus textos

#### Scenario: Sin coincidencias no oculta el evento

- **WHEN** el texto de un buscador no coincide con ningún elemento de su vista
- **THEN** la sección del evento sigue visible y esa vista muestra un mensaje informativo de sin resultados
