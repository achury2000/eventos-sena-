# Spec Delta

## ADDED Requirements

### Requirement: Botones por evento en el tablero del operador

Cada sección de evento del panel SHALL conservar sus cuatro cuadros originales —**Asistentes**, **Cobertura**, **Checkpoints activos** y **Registros**— y convertirlos en controles que cambian el contenido únicamente de esa sección. Los controles SHALL aparecer en ese orden y SHALL seguir mostrando el valor agregado que mostraban antes. No SHALL existir un control global que cambie todos los eventos a la vez. Al entrar a `/operador`, cada evento SHALL abrir en **Cobertura**. El estado de vista SHALL ser independiente por evento y SHALL permanecer igual durante los refrescos por sondeo y al aplicar o vaciar el buscador global de checkpoints. El buscador SHALL seguir filtrando tarjetas y barras por checkpoint, sin filtrar las vistas Asistentes ni Registros.

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

- **WHEN** el Operador aplica o vacía el buscador de checkpoints
- **THEN** las vistas activas por evento no cambian y el filtro solo afecta a tarjetas y barras

### Requirement: Vista de Asistentes

La vista Asistentes SHALL mostrar, por cada evento asignado, los nombres completos de los asistentes vigentes —es decir, aquellos cuyas inscripciones no están `CANCELADO`— sin exhibir sus documentos. SHALL incluir una tabla con una columna por checkpoint del evento, con el estado `SÍ` o `NO` de registro de cada asistente en cada checkpoint, y una columna final con el número de checkpoints completados sobre el total. Si el evento no tiene asistentes vigentes, SHALL mostrar un estado vacío informativo en lugar de la tabla.

#### Scenario: El operador consulta los asistentes

- **WHEN** un Operador pulsa el botón Asistentes de un evento con asistentes vigentes y checkpoints
- **THEN** ese evento muestra una tabla con el nombre de cada asistente, su estado por checkpoint y su total de completados

#### Scenario: No se expone el documento

- **WHEN** un Operador consulta la vista Asistentes
- **THEN** la tabla no muestra el documento de ningún asistente

#### Scenario: Evento sin asistentes vigentes

- **WHEN** un evento asignado no tiene asistentes vigentes
- **THEN** su vista Asistentes muestra un mensaje informativo y no una tabla vacía

### Requirement: Vista de Checkpoints activos

El botón **Checkpoints activos** SHALL mostrar las tarjetas de los checkpoints del evento con su nombre, categoría, estado activo/inactivo, el control para activarlos o desactivarlos y el formulario de registro manual. SHALL deshabilitar el registro manual cuando el checkpoint esté inactivo, mostrando una explicación, y SHALL conservar las reglas de permisos e integridad existentes para ambas acciones.

#### Scenario: Activar o desactivar desde la vista

- **WHEN** un Operador pulsa el botón Checkpoints activos de un evento y usa el control de activación de una tarjeta
- **THEN** el checkpoint cambia de estado y el cambio se refleja en la tarjeta tras el siguiente refresco

#### Scenario: Registro manual en checkpoint activo

- **WHEN** un Operador pulsa el botón Checkpoints activos de un evento y utiliza el formulario de registro manual de un checkpoint activo
- **THEN** el registro se crea con las mismas reglas y respuestas que en el panel actual

#### Scenario: Registro manual en checkpoint inactivo

- **WHEN** un Operador ve un checkpoint inactivo en la vista Checkpoints activos
- **THEN** el formulario de registro manual aparece deshabilitado con un mensaje que indica que debe activar el checkpoint primero

### Requirement: Vista de Registros

El botón **Registros** SHALL mostrar una tabla por checkpoint con el número de registros totales, cuántos fueron manuales, cuántos fueron por autoregistro y el avance frente al total de asistentes del evento. El valor total de registros SHALL seguir visible en el propio botón. Si el evento no tiene checkpoints, SHALL mostrar un estado vacío informativo en lugar de la tabla.

#### Scenario: El operador consulta el detalle de registros

- **WHEN** un Operador pulsa el botón Registros de un evento con checkpoints
- **THEN** ese evento muestra una tabla con el total de registros, manuales, autoregistros y avance por checkpoint

#### Scenario: Evento sin checkpoints en Registros

- **WHEN** un Operador pulsa Registros en un evento sin checkpoints
- **THEN** el evento muestra un mensaje informativo y no una tabla vacía

### Requirement: Nombres y estados de asistentes en el tablero

`GET /api/operador/dashboard` SHALL devolver, para cada evento asignado al Operador, la lista de asistentes vigentes con su identificador, nombre completo y un mapa que indique si cada asistente está registrado en cada checkpoint del evento. El endpoint SHALL mantener la autenticación y autorización por rol `OPERADOR`, SHALL limitar los datos a eventos asignados a ese Operador y SHALL NO incluir documentos de identidad en la respuesta.

#### Scenario: El tablero entrega nombres y estados

- **WHEN** un Operador consulta `/api/operador/dashboard` y tiene eventos asignados
- **THEN** la respuesta incluye para cada evento los nombres de los asistentes vigentes y su estado de registro por checkpoint, sin documentos

#### Scenario: Acceso no autorizado al tablero

- **WHEN** se llama a `/api/operador/dashboard` sin sesión o con un rol distinto de `OPERADOR`
- **THEN** el sistema responde `401` o `403` y no expone nombres ni estados

#### Scenario: Eventos no asignados quedan fuera

- **WHEN** un Operador consulta el tablero y existen eventos no asignados a él
- **THEN** la respuesta no incluye asistentes ni checkpoints de esos eventos
