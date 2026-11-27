# Spec Delta

## MODIFIED Requirements

### Requirement: Habitaciones como checkpoints con QR

El sistema SHALL tratar cada habitación de un evento con `incluyeHotel = true` como un checkpoint del evento: al crear una habitación, SHALL crear automáticamente su `Checkpoint` asociado con `tipo = ALOJAMIENTO`, `activo = true` y un `codigoQr` de estación único (relación 1:1 con la habitación). El checkpoint SHALL aceptar únicamente el registro de asistentes asignados a esa habitación: antes de persistir SHALL verificar la relación `AsistenteHabitacion` y, si el asistente pertenece al evento pero no al cuarto, SHALL responder `422` con un mensaje que indique que debe asignarlo a la habitación, sin crear `RegistroControl`. La llegada de un ocupante asignado SHALL registrarse con el mismo flujo de autoregistro por documento de los checkpoints, persistiendo un `RegistroControl` contra el checkpoint de ese cuarto sin necesidad de sesión. El `codigoQr` de la habitación SHALL quedar fuera de la edición administrativa y SHALL generarse únicamente con la creación del cuarto.

#### Scenario: Crear habitación crea su checkpoint

- **WHEN** un Administrador crea una habitación en un evento con alojamiento incluido
- **THEN** el sistema crea además el checkpoint de esa habitación con `tipo = ALOJAMIENTO`, `activo = true` y un `codigoQr` único

#### Scenario: Escanear el QR de una habitación registra la llegada

- **WHEN** un asistente asignado a la habitación escanea el QR de la habitación e ingresa su documento
- **THEN** el sistema registra su llegada como un `RegistroControl` del checkpoint de esa habitación, con las mismas reglas de integridad que cualquier checkpoint (sin duplicados por la restricción única `(asistenteId, checkpointId)`)

#### Scenario: Asistente del evento no asignado al cuarto

- **WHEN** un asistente inscrito en el evento pero no asignado a la habitación escanea su QR e ingresa un documento válido
- **THEN** el sistema responde `422`, no crea ningún `RegistroControl` y explica que ese asistente debe estar asignado a la habitación

#### Scenario: Documento ajeno al evento

- **WHEN** se intenta registrar en el QR de una habitación un documento que no pertenece a ningún asistente del evento
- **THEN** el sistema responde `404` y no crea ningún `RegistroControl`
