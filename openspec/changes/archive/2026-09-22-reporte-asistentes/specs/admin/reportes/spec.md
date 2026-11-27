# Spec Delta

## Purpose

Permite que el Administrador consulte y exporte el reporte de asistentes esperados vs. asistencia real por checkpoint de un evento, cerrando el flujo de reporte final del evento (paso 8 de CONTEXT.md §3).

## ADDED Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir consultar y exportar el reporte de asistentes de un evento únicamente a usuarios autenticados con rol `ADMINISTRADOR`. Una persona sin rol `ADMINISTRADOR` (incluido un Operador) no podrá ver la página del reporte ni invocar la exportación.

#### Scenario: Admin consulta el reporte

- **WHEN** un usuario con rol `ADMINISTRADOR` visita `/admin/eventos/[id]/reporte`
- **THEN** el sistema muestra el reporte de asistentes del evento solicitado

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión intenta acceder al reporte o a la exportación
- **THEN** el sistema rechaza la operación (redirige al login o a su panel, y el endpoint de exportación responde no autorizado) sin exponer datos

### Requirement: Disponible para cualquier evento y estado

El sistema SHALL mostrar el reporte de un evento que existe, en cualquier estado del ciclo de vida (`PLANEADO`, `INSCRIPCIONES_ABIERTAS`, `CERRADO`, `FINALIZADO`, `CANCELADO`), con los datos correspondientes a inscripciones y registros vigentes en el momento de la consulta.

#### Scenario: Reporte durante el evento

- **WHEN** un Administrador consulta el reporte de un evento en estado `INSCRIPCIONES_ABIERTAS` o `CERRADO` con registros de checkpoint ya capturados
- **THEN** el sistema muestra los conteos en vivo de los registros existentes

#### Scenario: Evento inexistente

- **WHEN** el identificador del evento no existe
- **THEN** el sistema muestra un mensaje de no encontrado sin fallar

### Requirement: Resumen por checkpoint

El sistema SHALL mostrar, por cada checkpoint del evento, el nombre, el tipo, el total de asistentes esperados, el total de registrados (asistencia real), la diferencia entre ambos y el porcentaje de asistencia. Se considera "esperado" a todo asistente cuya inscripción **no** esté `CANCELADA`; "registrado" es el número de filas de `RegistroControl` del checkpoint (cada documento cuenta una sola vez por restricción única).

#### Scenario: Resumen con asistencia parcial

- **WHEN** un evento tiene 100 asistentes esperados y un checkpoint "Almuerzo" registró 85 asistentes
- **THEN** el resumen muestra para "Almuerzo": esperados 100, registrados 85, diferencia 15 y porcentaje 85%

#### Scenario: Checkpoints sin registros

- **WHEN** un checkpoint del evento aún no tiene ningún registro
- **THEN** el resumen muestra registrados 0, diferencia igual al total de esperados y porcentaje 0%

#### Scenario: Cancelaciones excluidas del esperado

- **WHEN** una inscripción fue cancelada y sus asistentes ya no se consideran vigentes
- **THEN** el conteo de esperados no los incluye, y los registros de checkpoint de esos asistentes (si los hubiera) tampoco cuentan como esperados

### Requirement: Desglose por persona

El sistema SHALL mostrar la lista de asistentes esperados del evento (nombre, documento, si es titular o acompañante, y centro de formación cuando aplique) indicando, por cada checkpoint, si la persona se registró o no, junto con un resumen de checkpoints completados.

#### Scenario: Desglose con estado por checkpoint

- **WHEN** un Administrador consulta el desglose por persona de un evento con asistentes inscritos y registros en checkpoints
- **THEN** el sistema muestra por cada asistente qué checkpoints marcó y cuáles le faltan, y el conteo de completados

### Requirement: Filtros del reporte

El sistema SHALL permitir filtrar el reporte por tipo de checkpoint (`COMIDA`, `TRANSPORTE`, `ALOJAMIENTO`, `OTRO`) y por condición de titular/acompañante, aplicando el filtro tanto al resumen como al desglose por persona.

#### Scenario: Filtrar por tipo de checkpoint

- **WHEN** un Administrador filtra el reporte por tipo `COMIDA`
- **THEN** el resumen y el desglose muestran únicamente los checkpoints de ese tipo

#### Scenario: Filtrar por titular/acompañante

- **WHEN** un Administrador filtra el desglose para mostrar solo titulares
- **THEN** el desglose muestra únicamente los asistentes con `esTitular = true`

### Requirement: Exportación del reporte a XLSX

El sistema SHALL permitir al Administrador descargar un único archivo `.xlsx` con dos hojas: "Resumen" (por checkpoint) y "Detalle" (por persona), generadas con los mismos datos y filtros del reporte visible, y con los valores escritos como datos tipados (números reales y texto) para evitar que Excel los interprete como fórmulas.

#### Scenario: Exportación exitosa

- **WHEN** un Administrador solicita la exportación del reporte
- **THEN** el sistema descarga un archivo `.xlsx` que contiene las hojas Resumen y Detalle con los datos del evento

#### Scenario: Exportación de evento sin datos

- **WHEN** un evento no tiene asistentes ni checkpoints
- **THEN** la exportación produce un archivo válido con las dos hojas y encabezados, sin filas de datos