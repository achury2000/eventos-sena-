## Purpose

Permite que el Administrador cree, consulte, edite y administre los eventos
del Bienestar al Aprendiz: datos del evento, período y cupo de inscripción,
estado del ciclo de vida, cancelación y asignación de Operadores al evento.

## Requirements

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

### Requirement: El Administrador puede crear un evento

El sistema SHALL permitir crear un evento con nombre, lugar, descripción
opcional, `fechaInicio` y `fechaFin`, `inscripcionApertura` y
`inscripcionCierre`, `cupoMaximo` (personas totales), `maxAcompanantes`
(máximo de acompañantes por inscripción, adicional al titular), `incluyeHotel` e
`incluyeBus`. El evento SHALL crearse en estado `PLANEADO` y con
`maxAcompanantes` igual a 3 si el Administrador no especifica otro valor. La
validación SHALL exigir `cupoMaximo >= 1`, `maxAcompanantes` entero entre 0 y 10
inclusive, `maxAcompanantes + 1 <= cupoMaximo`, `fechaInicio < fechaFin` e
`inscripcionApertura < inscripcionCierre`.

#### Scenario: Creación exitosa

- **WHEN** un Administrador envía un formulario de evento válido
- **THEN** el sistema crea el evento en estado `PLANEADO` con `cuposOcupados`
  en 0 y regresa al listado mostrando el nuevo evento

#### Scenario: Cupo inválido

- **WHEN** `cupoMaximo` es menor a 1
- **THEN** el sistema no crea el evento y muestra el error de validación

#### Scenario: Límite de acompañantes coherente con el cupo

- **WHEN** se envía un evento con `maxAcompanantes` mayor que 9, o con un grupo
  titular más acompañantes que no cabe en `cupoMaximo`
- **THEN** el sistema no crea el evento y muestra el error de validación
  indicando el rango permitido o la incoherencia con el cupo

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
Reducir `maxAcompanantes` en un evento que ya tiene inscripciones SHALL NOT
invalidar, modificar ni cancelar esas inscripciones ni sus asistentes: los grupos
ya registrados se conservan tal como fueron inscritos y solo se aplica el nuevo
límite a las inscripciones posteriores al cambio.

#### Scenario: Edición exitosa

- **WHEN** un Administrador modifica campos válidos de un evento existente
- **THEN** el sistema persiste los cambios y los refleja en el detalle y el
  listado

#### Scenario: Edición con validación fallida

- **WHEN** la edición viola alguna regla de validación (por ejemplo, fechas
  inconsistentes)
- **THEN** el sistema no persiste los cambios y muestra los errores

#### Scenario: Reducir el límite no altera lo ya inscrito

- **WHEN** un Administrador reduce `maxAcompanantes` de 5 a 2 en un evento que
  ya tiene una inscripción de titular más 3 acompañantes
- **THEN** esa inscripción y sus 4 asistentes se conservan intactos, y el nuevo
  límite solo restringe las inscripciones que se creen después del cambio

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

### Requirement: Búsqueda de Operadores al asignar a un evento

El sistema SHALL permitir al Administrador filtrar la lista de Operadores
disponibles para asignar a un evento mediante un texto que coincida con el
nombre o el correo del Operador. Cuando el texto no coincide con ningún
Operador disponible, el sistema SHALL mostrar un mensaje que lo indique y no
ofrecer opciones para asignar que no coincidan con el filtro. La asignación de
un Operador luego de filtrar SHALL comportarse igual que sin filtro.

#### Scenario: Filtrar Operadores por nombre o correo

- **WHEN** un Administrador escribe un texto en el filtro que coincide con el nombre o el correo de uno o más Operadores disponibles
- **THEN** el sistema muestra únicamente esos Operadores en la lista de asignación

#### Scenario: Filtro sin coincidencias

- **WHEN** el texto del filtro no coincide con ningún Operador disponible para asignar
- **THEN** el sistema indica que no hay Operadores que coincidan con el texto y no permite asignar una opción que no esté visible

#### Scenario: Asignar un Operador tras filtrar

- **WHEN** un Administrador filtra la lista y asigna un Operador que coincide con el filtro
- **THEN** el sistema asigna el Operador al evento y deja de ofrecerlo como disponible, igual que sin filtro

### Requirement: El cero de acompañantes significa inscripción individual

El valor `maxAcompanantes = 0` SHALL significar que el evento admite
únicamente al titular, sin acompañantes. El sistema SHALL tratar `0` como un
valor de configuración legítimo y completo, y en ningún caso como "sin límite",
como ausencia de valor o como un valor por defecto implícito: ningún valor
aceptado equivale a un límite ilimitado, y el valor mayor permitido es el techo
técnico. Un límite enviado vacío SHALL ser rechazado por validación de campo y
nunca interpretado como `0`.

#### Scenario: Evento de inscripción individual

- **WHEN** un Administrador configura un evento con `maxAcompanantes = 0`
- **THEN** el sistema persiste el valor 0 y el evento queda configurado para
  admitir solo al titular

#### Scenario: Límite enviado vacío

- **WHEN** un Administrador envía el formulario de creación o edición de evento
  con el campo de máximo de acompañantes vacío o sin completar
- **THEN** el sistema rechaza el evento y muestra un error de validación
  requiriendo un valor, sin interpretarlo como `0`

#### Scenario: No existe un modo ilimitado

- **WHEN** se revisan los valores que el sistema acepta para el máximo de
  acompañantes
- **THEN** ninguno de ellos significa "sin límite"; el mayor valor aceptado es el
  techo técnico de 10
