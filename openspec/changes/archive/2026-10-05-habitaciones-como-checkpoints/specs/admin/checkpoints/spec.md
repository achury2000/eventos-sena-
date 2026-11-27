# Spec Delta

## MODIFIED Requirements

### Requirement: El Administrador lista y edita checkpoint

El sistema SHALL mostrar el listado de checkpoints de un evento con su nombre, categoría, estado de activación y si posee registros de control. SHALL excluir de ese listado los checkpoints de habitación (los vinculados a una habitación), que se gestionan desde la sección de Habitaciones del evento. El Administrador SHALL poder editar nombre y categoría de un checkpoint existente. El `codigoQr` y el estado `activo` SHALL quedar fuera de la edición administrativa.

#### Scenario: Listado de checkpoints

- **WHEN** un Administrador abre la sección de checkpoints de un evento
- **THEN** el sistema muestra cada checkpoint con nombre, categoría, estado de activación y cantidad de registros de control

#### Scenario: Checkpoints de habitación excluidos del listado

- **WHEN** un evento tiene checkpoints manuales y checkpoints de habitación
- **THEN** el listado de la sección de checkpoints muestra únicamente los manuales, y los de habitación aparecen en la sección de Habitaciones con su QR

#### Scenario: Edición de nombre y categoría

- **WHEN** un Administrador modifica el nombre o la categoría de un checkpoint
- **THEN** el sistema persiste los cambios y los refleja en el listado

#### Scenario: Edición con nombre vacío

- **WHEN** la edición deja el nombre vacío
- **THEN** el sistema no persiste el cambio y muestra el error de validación