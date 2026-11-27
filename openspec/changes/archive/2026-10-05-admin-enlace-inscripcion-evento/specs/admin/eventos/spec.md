# Spec Delta

## ADDED Requirements

### Requirement: Enlace público de inscripción visible para el Administrador

El sistema SHALL mostrar en el detalle de un evento (`/admin/eventos/[id]`) el
enlace público de inscripción de ese evento, compuesto por la URL base de la
aplicación y la ruta pública `/inscripcion/[eventoId]`. El Administrador SHALL
poder copiar el enlace completo al portapapeles mediante una acción explícita,
y el sistema SHALL ofrecer un código QR que codifique ese mismo enlace. El
enlace mostrado SHALL ser exactamente la URL por la que los funcionarios
acceden al formulario público de inscripción.

#### Scenario: Ver el enlace de inscripción en el detalle

- **WHEN** un Administrador abre `/admin/eventos/[id]`
- **THEN** el sistema muestra el enlace completo de inscripción del evento,
  apuntando a la ruta pública `/inscripcion/[eventoId]`

#### Scenario: Copiar el enlace de inscripción

- **WHEN** un Administrador activa la acción de copiar sobre el enlace de
  inscripción
- **THEN** el sistema copia el enlace completo al portapapeles e indica
  visualmente que la copia se realizó

#### Scenario: Código QR del enlace de inscripción

- **WHEN** un Administrador consulta el código QR del enlace de inscripción en
  el detalle del evento
- **THEN** el sistema muestra un código QR que codifica el enlace completo de
  inscripción, listo para ser escaneado