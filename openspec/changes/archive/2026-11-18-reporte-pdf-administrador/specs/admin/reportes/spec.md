# Spec Delta

## ADDED Requirements

### Requirement: Exportación del reporte a PDF

El sistema SHALL permitir al Administrador descargar un único archivo `.pdf` con el mismo resumen por checkpoint y desglose por persona que el reporte visible, incluyendo los encabezados del evento, la descripción de los filtros aplicados y las notas de contexto. El PDF SHALL respetar los filtros vigentes de tipo de checkpoint y de titular/acompañante, y SHALL estar disponible únicamente para usuarios autenticados con rol `ADMINISTRADOR`. La exportación a XLSX existente SHALL permanecer disponible e inalterada.

#### Scenario: Exportación PDF exitosa

- **WHEN** un Administrador solicita la exportación PDF de un evento con asistentes y checkpoints
- **THEN** el sistema descarga un archivo PDF válido que contiene una sección de resumen por checkpoint, una sección de desglose por persona, los datos del evento y la descripción de los filtros

#### Scenario: Exportación PDF con filtros

- **WHEN** un Administrador solicita el PDF con un filtro de tipo de checkpoint o de titular/acompañante activo
- **THEN** el PDF contiene únicamente los checkpoints y las personas que coinciden con esos filtros, igual que el reporte visible y el XLSX

#### Scenario: Exportación PDF sin datos

- **WHEN** un Administrador solicita el PDF de un evento sin asistentes ni checkpoints
- **THEN** el sistema produce un archivo PDF válido con los encabezados de resumen y desglose, sin filas de datos y sin fallar

#### Scenario: No-admin no puede exportar PDF

- **WHEN** un usuario sin rol `ADMINISTRADOR` intenta invocar la exportación PDF
- **THEN** el sistema rechaza la petición con un estado no autorizado y no expone datos del reporte
