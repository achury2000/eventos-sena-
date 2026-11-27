# Spec Delta

## MODIFIED Requirements

### Requirement: Formulario de inscripción de titular y acompañantes

El formulario SHALL capturar los datos del titular (nombre completo, documento
de 6 a 12 dígitos, centro de formación opcional, correo opcional), permitir
agregar acompañantes con el mismo esquema (centro de formación opcional) hasta
un máximo que provenga del evento, exigir una única casilla de aceptación de
tratamiento de datos y una firma digital en el canvas antes de enviar. El
máximo mostrado SHALL ser el configurado en ese evento y SHALL NOT ser un valor
fijo del sistema. Cuando el evento tenga un máximo de 0, el formulario SHALL
ocultar por completo el control para agregar acompañantes y SHALL mostrar un
mensaje informativo de que la inscripción es individual, en lugar de mostrar un
botón deshabilitado sin explicación.

#### Scenario: Inscripción completa y válida

- **WHEN** el titular completa nombre, documento, correo opcional, firma digital,
  acepta el tratamiento de datos y envía con un acompañante válido
- **THEN** el sistema registra la inscripción con `esTitular = true` para el
  titular y un `Asistente` con `esTitular = false` para el acompañante

#### Scenario: Firma o consentimiento faltante

- **WHEN** el titular intenta enviar sin firmar o sin aceptar el tratamiento de
  datos
- **THEN** el sistema impide el envío y muestra el error correspondiente

#### Scenario: El formulario respeta el límite del evento

- **WHEN** el titular abre el formulario de un evento cuyo máximo de
  acompañantes es 2
- **THEN** el sistema permite agregar hasta 2 acompañantes, muestra ese límite en
  la ayuda y no ofrece una tercera opción de forma utilizable

#### Scenario: Evento de inscripción individual

- **WHEN** el titular abre el formulario de un evento cuyo máximo de
  acompañantes es 0
- **THEN** el sistema no muestra ningún control para agregar acompañantes y
  muestra un mensaje indicando que ese evento es de inscripción individual

### Requirement: Validación servidor de la inscripción

El sistema SHALL validar en el servidor los datos de la inscripción, incluida
la unicidad del documento dentro del evento (`@@unique([eventoId, documento])`),
el cupo y el máximo de acompañantes configurado en el evento. SHALL rechazar con
`400` una inscripción con datos inválidos, con `409` si el documento ya está
inscrito en el evento o si el cupo está completo, con `422` si el grupo enviado
supera el máximo de acompañantes del evento, y con `500` solo en fallos internos.
La validación de cliente SHALL ser solo de UX. El rechazo por exceso de
acompañantes SHALL ocurrir antes de almacenar la firma, de modo que una
inscripción rechazada por esta regla no deje archivos en el almacenamiento de
firmas.

#### Scenario: Documento ya inscrito en el evento

- **WHEN** se envía una inscripción cuyo documento (titular o acompañante) ya
  existe para ese evento
- **THEN** el sistema responde `409` indicando que ese documento ya está
  inscrito y NO crea inscripción ni asistentes

#### Scenario: Datos inválidos

- **WHEN** se envía una inscripción con documento, nombre o correo inválidos
- **THEN** el sistema responde `400` con errores por campo y NO crea nada

#### Scenario: Grupo que excede el máximo de acompañantes del evento

- **WHEN** se envía una inscripción con más acompañantes que el máximo
  configurado en el evento
- **THEN** el sistema responde `422`, no crea inscripción ni asistentes, no
  modifica `cuposOcupados` y no deja almacenada la firma del intento rechazado

### Requirement: Cupo atómico por personas

El sistema SHALL incrementar `cuposOcupados` por el total de personas del grupo
(titular + acompañantes) en la misma transacción que crea la inscripción y los
asistentes, usando `cuposOcupados + totalPersonas <= cupoMaximo` como condición.
Esa misma actualización condicional SHALL exigir además que
`totalPersonas <= 1 + maxAcompanantes`, de modo que el máximo de acompañantes se
evalúe de forma atómica junto con el cupo y no mediante una comprobación
separada susceptible a carreras. SHALL rechazar con `409` si el total del grupo
no cabe completo en el cupo, y con `422` si el grupo excede el máximo de
acompañantes del evento.

#### Scenario: Cupo exacto alcanzado

- **WHEN** un grupo de 3 personas (1 titular + 2 acompañantes) se inscribe y solo
  quedan 3 cupos
- **THEN** la inscripción se crea y `cuposOcupados` queda en el máximo

#### Scenario: Grupo que no cabe en el cupo

- **WHEN** un grupo de 3 personas se inscribe cuando solo quedan 2 cupos
- **THEN** el sistema responde `409` y no crea ninguna persona, dejando el cupo
  intacto

#### Scenario: Peticiones simultáneas sobre el último cupo

- **WHEN** dos inscripciones concurrentes compiten por el último cupo disponible
- **THEN** exactamente una obtiene `201` y la otra `409`, sin exceder jamás
  `cupoMaximo`

#### Scenario: El exceso de acompañantes no consume cupo

- **WHEN** un grupo que excede el máximo de acompañantes del evento se rechaza
- **THEN** el sistema responde `422` y `cuposOcupados` del evento queda
  exactamente igual, sin ningún incremento residual
