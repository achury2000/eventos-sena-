# Spec Delta

## ADDED Requirements

### Requirement: Confirmación por correo de la inscripción

El sistema SHALL enviar un correo de confirmación al correo declarado por el
titular cuando la inscripción se cree exitosamente, siempre que el titular haya
declarado un correo. El envío SHALL programarse únicamente después de que la
transacción de inscripción (cupo atómico y asistentes) se confirme, SHALL NOT
bloquear ni alterar la respuesta de la inscripción, y SHALL NOT ocurrir cuando la
inscripción fue rechazada. El correo SHALL identificar al titular y el tamaño del
grupo e SHALL incluir el nombre del evento, el lugar y las fechas de inicio y fin.

#### Scenario: Inscripción exitosa con correo declarado

- **WHEN** un titular se inscribe exitosamente y declaró un correo
- **THEN** el sistema envía a ese correo una confirmación que incluye el nombre
  del evento, el lugar y las fechas de inicio y fin, y el resultado de la
  inscripción sigue siendo exitoso

#### Scenario: Inscripción exitosa sin correo

- **WHEN** un titular se inscribe exitosamente sin declarar correo
- **THEN** el sistema no envía ninguna confirmación y la inscripción sigue siendo
  exitosa

#### Scenario: Inscripción rechazada

- **WHEN** una inscripción es rechazada (datos inválidos, duplicado, cupo lleno o
  exceso de acompañantes)
- **THEN** el sistema no envía ninguna confirmación

#### Scenario: El envío falla

- **WHEN** una inscripción exitosa con correo declarado no puede enviar la
  confirmación por un fallo del proveedor
- **THEN** la inscripción permanece creada, el cupo consumido y el sistema
  responde con éxito, registrando el fallo del envío
