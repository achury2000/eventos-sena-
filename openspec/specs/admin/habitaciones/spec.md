# Habitaciones de Hotel Specification

## Purpose

Permite que el Administrador gestione manualmente las habitaciones de hotel de un evento que incluye alojamiento: crear, editar y eliminar cuartos, y asignar/desasignar asistentes por persona respetando la capacidad de cada cuarto.

## Requirements

### Requirement: Acceso restringido a Administradores

El sistema SHALL permitir gestionar habitaciones y asignar asistentes a cuartos únicamente a usuarios autenticados con rol `ADMINISTRADOR`. Las acciones SHALL valerse de la misma guarda de rol que el resto de la gestión de eventos.

#### Scenario: Admin gestiona habitaciones

- **WHEN** un usuario con rol `ADMINISTRADOR` accede a la sección de habitaciones de un evento con `incluyeHotel = true`
- **THEN** el sistema le permite crear, editar, eliminar y asignar asistentes a las habitaciones

#### Scenario: No-admin bloqueado

- **WHEN** un usuario `OPERADOR` o sin sesión intenta invocar una acción de habitaciones o consultar asistentes asignables
- **THEN** el sistema lo redirige (sin sesión) o lo bloquea y la acción no se ejecuta

### Requirement: La sección de habitaciones solo aparece si el evento incluye hotel

El sistema SHALL mostrar la sección de habitaciones en el detalle del evento únicamente cuando `evento.incluyeHotel = true`. Si el evento no incluye hotel, la sección SHALL no renderizarse.

#### Scenario: Evento con hotel

- **WHEN** un Administrador abre el detalle de un evento con `incluyeHotel = true`
- **THEN** ve la sección de habitaciones con el estado de cada cuarto (identificador, capacidad, ocupación y ocupantes)

#### Scenario: Evento sin hotel

- **WHEN** un Administrador abre el detalle de un evento con `incluyeHotel = false`
- **THEN** la sección de habitaciones no está presente

### Requirement: El Administrador crea, edita y elimina habitaciones

El sistema SHALL permitir crear una habitación con `identificador` (texto no vacío) y `capacidad` (entero >= 1). El `identificador` SHALL ser único dentro del evento. SHALL permitir editar `identificador` y `capacidad`, sin bajar `capacidad` por debajo de los ocupantes actuales ni duplicar el `identificador`. SHALL permitir eliminar solo habitaciones sin asistentes asignados; una habitación ocupada SHALL rechazar la eliminación con un mensaje que pida desasignar primero.

#### Scenario: Creación exitosa

- **WHEN** un Administrador crea una habitación "101" con capacidad 3 en un evento
- **THEN** la habitación aparece en la sección con 0 ocupantes

#### Scenario: Identificador duplicado en el evento

- **WHEN** un Administrador intenta crear o renombrar a un `identificador` que ya existe en ese evento
- **THEN** el sistema rechaza la operación y muestra un mensaje de duplicado, sin crear ni modificar nada

#### Scenario: Capacidad inválida

- **WHEN** un Administrador crea una habitación con `capacidad < 1`
- **THEN** el sistema rechaza la operación y muestra el error de validación

#### Scenario: Reducir capacidad por debajo de la ocupación

- **WHEN** un Administrador baja la `capacidad` de una habitación que tiene 3 ocupantes a 2
- **THEN** el sistema rechaza la edición y mantiene la capacidad anterior

#### Scenario: Eliminar habitación ocupada

- **WHEN** un Administrador intenta eliminar una habitación que tiene al menos un asistente asignado
- **THEN** el sistema rechaza la eliminación indicando que primero debe desasignar a sus ocupantes

### Requirement: El Administrador asigna y desasigna asistentes por persona

El sistema SHALL permitir asignar asistentes del evento a las habitaciones de forma manual y por persona. Un cuarto SHALL admitir de 1 a `capacidad` ocupantes. Un asistente SHALL ocupar una sola habitación del evento en un momento dado. SHALL permitir desasignar a un asistente de su cuarto. La ocupación de cada cuarto SHALL verse en todo momento (asignados / capacidad) con el nombre y documento de sus ocupantes.

#### Scenario: Asignación dentro de la capacidad

- **WHEN** un Administrador asigna a un asistente sin habitaración a un cuarto con lugar disponible
- **THEN** el asistente queda asignado a ese cuarto y la ocupación del cuarto aumenta

#### Scenario: Cuarto lleno

- **WHEN** un Administrador intenta asignar un asistente a un cuarto que ya tiene tantos ocupantes como su `capacidad`
- **THEN** el sistema rechaza la asignación y el cuarto conserva sus ocupantes

#### Scenario: Asistente que ya tiene cuarto

- **WHEN** un Administrador intenta asignar a un asistente que ya está asignado a otro cuarto del mismo evento
- **THEN** el sistema rechaza la asignación indicando que el asistente ya tiene habitación

#### Scenario: Asistente de inscripción cancelada

- **WHEN** un Administrador intenta asignar a un asistente cuya inscripción está en estado `CANCELADO`
- **THEN** el sistema rechaza la asignación y ese asistente no aparece como asignable

#### Scenario: Desasignación

- **WHEN** un Administrador desasigna a un asistente de su cuarto
- **THEN** el asistente queda sin habitación en el evento y la ocupación del cuarto disminuye

### Requirement: Búsqueda de asistentes asignables

El sistema SHALL exponer un endpoint `GET /api/admin/eventos/[eventoId]/asistentes` accesible solo para sesiones `ADMINISTRADOR`, que permita buscar asistentes del evento por nombre o documento para su asignación. SHALL excluir asistentes con inscripción `CANCELADO` y asistentes que ya tienen habitación asignada. SHALL acotar los resultados (límite) para no cargar eventos de hasta 1000 personas de una vez.

#### Scenario: Búsqueda por nombre o documento

- **WHEN** un Administrador busca "rodríguez" o "1234" en el asignador de un cuarto
- **THEN** el sistema devuelve coincidencias de asistentes del evento que no están cancelados ni tienen habitación

#### Scenario: Se excluyen cancelados y ya asignados

- **WHEN** un asistente de una inscripción `CANCELADO` o un asistente que ya tiene cuarto coincide con la búsqueda
- **THEN** el sistema no lo incluye en los resultados

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
