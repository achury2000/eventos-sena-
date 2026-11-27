## Purpose

Permite que el Administrador cree, consulte, edite y administre los eventos
del Bienestar al Aprendiz: datos del evento, período y cupo de inscripción,
estado del ciclo de vida, cancelación y asignación de Operadores al evento.

## ADDED Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir gestionar eventos únicamente a usuarios
autenticados con rol `ADMINISTRADOR`.

#### Scenario: Admin accede a la gestión de eventos

- **WHEN** un usuario con rol `ADMINISTRADOR` visita `/admin/eventos`
- **THEN** el sistema le muestra el listado de eventos y el acceso para crear
  uno nuevo

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión intenta acceder a las
  rutas de gestión de eventos o invocar una acción de eventos
- **THEN** el sistema lo redirige a `/login` (sin sesión) o a su panel
  correspondiente (rol `OPERADOR`), y la acción no se ejecuta

### Requirement: El Administrador puede listar y ver eventos

El sistema SHALL mostrar el listado de eventos con nombre, lugar, rango de
fechas, estado, cupo máximo y cupos ocupados. El detalle SHALL incluir además
descripción, período de inscripción, las opciones de hotel/bus, los
checkpoints configurados y los Operadores asignados.

#### Scenario: Listado de eventos

- **WHEN** un Administrador visita `/admin/eventos`
- **THEN** el sistema muestra los eventos ordenados por fecha de creación
  descendente, cada uno con nombre, lugar, fechas, estado y ocupación de cupo

#### Scenario: Ver detalle de un evento

- **WHEN** un Administrador abre `/admin/eventos/[id]`
- **THEN** el sistema muestra todos los datos del evento, sus checkpoints y
  los Operadores asignados

#### Scenario: Evento inexistente

- **WHEN** el identificador del evento no existe
- **THEN** el sistema muestra un mensaje de no encontrado sin fallar

### Requirement: El Administrador puede crear un evento

El sistema SHALL permitir crear un evento con nombre, lugar, descripción
opcional, `fechaInicio` y `fechaFin`, `inscripcionApertura` y
`inscripcionCierre`, `cupoMaximo` (personas totales), `incluyeHotel` e
`incluyeBus`. El evento SHALL crearse en estado `PLANEADO`. La validación SHALL
exigir `cupoMaximo >= 1`, `fechaInicio < fechaFin` e
`inscripcionApertura < inscripcionCierre`.

#### Scenario: Creación exitosa

- **WHEN** un Administrador envía un formulario de evento válido
- **THEN** el sistema crea el evento en estado `PLANEADO` con `cuposOcupados`
  en 0 y regresa al listado mostrando el nuevo evento

#### Scenario: Cupo inválido

- **WHEN** `cupoMaximo` es menor a 1
- **THEN** el sistema no crea el evento y muestra el error de validación

#### Scenario: Fechas inconsistentes

- **WHEN** `fechaInicio >= fechaFin` o `inscripcionApertura >=
  inscripcionCierre`
- **THEN** el sistema no crea el evento y muestra los errores de validación

#### Scenario: Crítico de negocio preservado

- **WHEN** la acción de creación recibe datos incompletos (nombres vacíos,
  lugar vacío, fechas faltantes)
- **THEN** el sistema no crea el evento y muestra los errores de validación

### Requirement: El Administrador puede editar un evento

El sistema SHALL permitir editar los datos de un evento (sin tocar
`cuposOcupados`), aplicando las mismas reglas de validación de la creación.

#### Scenario: Edición exitosa

- **WHEN** un Administrador modifica campos válidos de un evento existente
- **THEN** el sistema persiste los cambios y los refleja en el detalle y el
  listado

#### Scenario: Edición con validación fallida

- **WHEN** la edición viola alguna regla de validación (por ejemplo, fechas
  inconsistentes)
- **THEN** el sistema no persiste los cambios y muestra los errores

### Requirement: El Administrador puede cambiar el estado de un evento

El sistema SHALL permitir la transición de estado de un evento entre
`PLANEADO`, `INSCRIPCIONES_ABIERTAS`, `CERRADO` y `FINALIZADO`, y el paso a
`CANCELADO` desde cualquier estado. El estado `cuposOcupados` nunca se edita
manualmente.

#### Scenario: Avance por el ciclo de vida

- **WHEN** un Administrador cambia el estado de un evento de `PLANEADO` a
  `INSCRIPCIONES_ABIERTAS`
- **THEN** el sistema persiste el nuevo estado y lo refleja en el listado

#### Scenario: Cancelar evento

- **WHEN** un Administrador cancela un evento
- **THEN** el sistema persiste el estado `CANCELADO` conservando el evento, sus
  inscripciones, asistentes y registros de control intactos

#### Scenario: Mantener estado de cancelación

- **WHEN** el estado actual de un evento es `CANCELADO`
- **THEN** el sistema no permite que se cancèle más de una vez ni cambia el
  evento a otro estado posterior sin explicitarse

### Requirement: El Administrador puede eliminar un evento solo sin inscripciones

El sistema SHALL permitir eliminar un evento únicamente cuando no tiene
inscripciones asociadas. Si el evento ya tiene inscripciones, la eliminación
SHALL ser rechazada y el evento conservado, mostrando un mensaje que indica
que debe usarse la cancelación en su lugar.

#### Scenario: Eliminación de evento sin inscripciones

- **WHEN** un evento en estado `PLANEADO` sin inscripciones se elimina
- **THEN** el sistema lo borra y deja de mostrarlo en el listado

#### Scenario: Eliminación bloqueada por inscripciones

- **WHEN** un evento con al menos una inscripción se intenta eliminar
- **THEN** el sistema rechaza la operación, conserva el evento completo y
  muestra un mensaje informando que debe cancelarse en lugar de eliminarse

### Requirement: El Administrador asigna y desasigna Operadores a un evento

El sistema SHALL permitir asignar Operadores existentes a un evento y
desasignarlos, manteniendo la relación M:N entre evento y Operador. El listado
de Operadores disponible SHALL contener solo cuentas con rol `OPERADOR`.

#### Scenario: Asignar un Operador

- **WHEN** un Administrador asigna un Operador a un evento desde el detalle
- **THEN** el sistema crea la relación y el Operador aparece asociado al evento

#### Scenario: Desasignar un Operador

- **WHEN** un Administrador desasigna un Operador de un evento
- **THEN** el sistema elimina la relación y el Operador deja de aparecer
  asociado al evento, sin borrar la cuenta del Operador

#### Scenario: Operador duplicado

- **WHEN** se intenta asignar un Operador ya asignado al evento
- **THEN** el sistema no crea una segunda relación y la asignación queda
  intacta una sola vez