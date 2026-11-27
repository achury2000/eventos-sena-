## Purpose

Permite que el Administrador configure los checkpoints de cada evento dentro
del detalle del evento: puntos de control (comidas, transporte, alojamiento,
otros) con nombre libre y categoría, y con identificador QR de estación
generado automáticamente.

## Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir gestionar los checkpoints de un evento únicamente a
usuarios autenticados con rol `ADMINISTRADOR` y únicamente sobre eventos que
existen.

#### Scenario: Admin gestiona checkpoints de un evento

- **WHEN** un usuario con rol `ADMINISTRADOR` visita la sección de checkpoints
  de un evento existente
- **THEN** el sistema muestra el listado de checkpoints del evento y el acceso
  para crear uno nuevo

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión intenta gestionar
  checkpoints
- **THEN** el sistema lo redirige a `/login` (sin sesión) o a su panel
  correspondiente (rol `OPERADOR`), y la acción no se ejecuta

#### Scenario: Evento inexistente

- **WHEN** un Administrador intenta gestionar checkpoints de un evento que no
  existe
- **THEN** el sistema muestra un mensaje de no encontrado sin crear nada

### Requirement: El Administrador crea un checkpoint

El sistema SHALL permitir crear un checkpoint con un nombre libre y una
categoría `tipo` (`COMIDA`, `TRANSPORTE`, `ALOJAMIENTO` u `OTRO`). El
identificador QR de estación (`codigoQr`) SHALL generarse automáticamente de
forma única, y el checkpoint SHALL crearse inactivo (`activo = false`). El QR
no se pide ni se permite editarlo.

#### Scenario: Creación exitosa

- **WHEN** un Administrador envía un nombre y una categoría válidos para un
  evento existente
- **THEN** el sistema crea el checkpoint inactivo con un `codigoQr` único
  generado automáticamente y lo muestra en el listado del evento

#### Scenario: Nombre vacío

- **WHEN** el nombre del checkpoint está vacío
- **THEN** el sistema no crea el checkpoint y muestra el error de validación

#### Scenario: Categoría inválida

- **WHEN** la categoría no es una de las permitidas
- **THEN** el sistema no crea el checkpoint y muestra el error de validación

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

### Requirement: El Administrador elimina un checkpoint

El sistema SHALL permitir eliminar un checkpoint de un evento. Al eliminar, el
sistema SHALL disponer también de sus registros de control asociados
(evidencia operativa del mismo checkpoint), y el resto de los datos del evento
debe permanecer intacto.

#### Scenario: Eliminación de un checkpoint

- **WHEN** un Administrador confirma la eliminación de un checkpoint
- **THEN** el sistema lo elimina junto con sus registros de control, y el
  evento sigue existiendo con sus demás checkpoints intactos

#### Scenario: Eliminación confirmada

- **WHEN** se elimina un checkpoint que tiene registros de control
- **THEN** el sistema ejecuta la eliminación solo tras confirmación explícita
  del Administrador
