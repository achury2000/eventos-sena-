# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Búsqueda y filtro de checkpoints por nombre o categoría

**Reason**: El buscador global obligaba a una excepción para no filtrar `Asistentes` y `Registros`, ocultaba eventos completos y no ayudaba a reducir el ancho de la tabla de asistentes. El Operador atiende un evento por día, así que la búsqueda cruzada aporta poco frente a una búsqueda ubicada en cada vista.

**Migration**: Usar el buscador dentro de la vista activa de cada evento. La vista `Asistentes` filtra filas por nombre de asistente y columnas por checkpoint; `Cobertura`, `Checkpoints activos` y `Registros` filtran checkpoints por nombre o categoría. No hay migración de datos ni cambios de endpoint.
