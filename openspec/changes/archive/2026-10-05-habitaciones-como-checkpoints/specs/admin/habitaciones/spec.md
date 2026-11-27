# Spec Delta

## ADDED Requirements

### Requirement: Habitaciones como checkpoints con QR

El sistema SHALL tratar cada habitación de un evento con `incluyeHotel = true` como un checkpoint del evento: al crear una habitación, SHALL crear automáticamente su `Checkpoint` asociado con `tipo = ALOJAMIENTO`, `activo = true` y un `codigoQr` de estación único (relación 1:1 con la habitación). La llegada de un asistente a su habitación SHALL registrarse con el mismo flujo de autoregistro por documento de los checkpoints, persistiendo un `RegistroControl` contra el checkpoint de ese cuarto sin necesidad de sesión. El `codigoQr` de la habitación SHALL quedar fuera de la edición administrativa y SHALL generarse únicamente con la creación del cuarto.

#### Scenario: Crear habitación crea su checkpoint

- **WHEN** un Administrador crea una habitación en un evento con alojamiento incluido
- **THEN** el sistema crea además el checkpoint de esa habitación con `tipo = ALOJAMIENTO`, `activo = true` y un `codigoQr` único

#### Scenario: Escanear el QR de una habitación registra la llegada

- **WHEN** un asistente inscrito en el evento escanea el QR de una habitación e ingresa su documento
- **THEN** el sistema registra su llegada como un `RegistroControl` del checkpoint de esa habitación, con las mismas reglas de integridad que cualquier checkpoint (sin duplicados por la restricción única `(asistenteId, checkpointId)`)

### Requirement: QR de habitación visible para el Administrador

El sistema SHALL mostrar en el detalle del evento (`/admin/eventos/[id]`), en la sección de Habitaciones, una imagen QR por cada habitación que codifique la URL pública `/checkpoint/{codigoQr}` del checkpoint de ese cuarto, junto con el enlace completo. El Administrador SHALL poder copiar el enlace completo al portapapeles mediante una acción explícita. Ningún cuarto de un mismo evento SHALL compartir el código QR con otro.

#### Scenario: Ver el QR de una habitación

- **WHEN** un Administrador abre el detalle de un evento que tiene habitaciones
- **THEN** cada habitación muestra una imagen QR escaneable que apunta a la URL `/checkpoint/<codigoQr>` de esa estación

#### Scenario: Copiar el enlace de una habitación

- **WHEN** un Administrador activa la acción de copiar sobre el enlace de una habitación
- **THEN** el sistema copia la URL completa `/checkpoint/<codigoQr>` al portapapeles e indica visualmente que la copia se realizó

#### Scenario: QR únicos por habitación

- **WHEN** un evento tiene varias habitaciones
- **THEN** el código QR de cada habitación es diferente al de las demás

### Requirement: Ciclo de vida sincronizado entre habitación y checkpoint

El sistema SHALL mantener sincronizado el checkpoint automático de cada habitación con su ciclo de vida: al editar el identificador del cuarto, el nombre del checkpoint pasará a ser "Habitación {identificador}"; al eliminar la habitación, SHALL eliminar también su checkpoint y los registros de control asociados a ese cuarto. El checkpoint de una habitación SHALL crearse, modificarse o eliminarse únicamente a través de las acciones de gestión de habitaciones.

#### Scenario: Editar el identificador sincroniza el nombre del checkpoint

- **WHEN** un Administrador cambia el identificador de una habitación existente
- **THEN** el checkpoint asociado refleja el nuevo nombre "Habitación {identificador}"

#### Scenario: Eliminar la habitación elimina su checkpoint

- **WHEN** un Administrador elimina una habitación
- **THEN** el sistema elimina también su checkpoint y los registros de control de ese cuarto, conservando intacto el resto del evento