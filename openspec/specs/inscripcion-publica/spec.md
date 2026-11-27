## Purpose

Permite que un titular se inscriba por su cuenta a un evento de Bienestar al Aprendiz mediante una ruta pública, declarando acompañantes, firmando digitalmente una sola vez y aceptando el tratamiento de datos, y permite al Administrador cancelar inscripciones liberando cupos de forma atómica.

## Requirements

### Requirement: Acceso a la página pública de inscripción

El sistema SHALL publicar la página de inscripción en `/inscripcion/[eventoId]` solo mientras el evento esté en estado `INSCRIPCIONES_ABIERTAS` y la fecha actual esté dentro del periodo de inscripción (`inscripcionApertura`/`inscripcionCierre`). Fuera de ese estado o periodo, la página SHALL mostrar un mensaje informativo y NO renderizar el formulario.

#### Scenario: Evento con inscripciones abiertas dentro del periodo

- **WHEN** un usuario visita `/inscripcion/[eventoId]` de un evento en estado `INSCRIPCIONES_ABIERTAS` y dentro del periodo de inscripción
- **THEN** se muestra el formulario de inscripción con nombre, lugar y cupo del evento

#### Scenario: Evento no disponible

- **WHEN** un usuario visita `/inscripcion/[eventoId]` de un evento que no existe, no está en `INSCRIPCIONES_ABIERTAS`, o está fuera del periodo de inscripción
- **THEN** el sistema muestra un mensaje informativo y el formulario no está disponible

### Requirement: Formulario de inscripción de titular y acompañantes

El formulario SHALL capturar los datos del titular (nombre completo, documento
de 6 a 12 dígitos, centro de formación opcional, correo opcional), donde el
centro de formación SHALL ser un texto libre escrito por el titular y SHALL NOT
requerir elegirlo de una lista cerrada, permitir agregar acompañantes con nombre
completo y documento —sin centro de formación, que solo declara el titular—
hasta un máximo que provenga del evento, exigir una única casilla de aceptación
de tratamiento de datos y una firma digital en el canvas antes de enviar. El
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

#### Scenario: Titular sin centro de formación

- **WHEN** el titular completa el resto del formulario y envía sin escribir un
  centro de formación
- **THEN** el sistema registra la inscripción con el centro de formación vacío
  para el titular

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

### Requirement: Almacenamiento privado de la firma

El sistema SHALL subir la imagen de la firma del titular a almacenamiento de objetos privado (MinIO/S3) durante el alta, guardar solo la referencia en `Inscripcion.firmaUrl` y nunca persistir la imagen en base64 en la base de datos. Si la transacción de inscripción falla después de subir la firma, el sistema SHALL eliminar el objeto subido para no dejar huérfanos.

#### Scenario: Firma subida y referencia guardada

- **WHEN** una inscripción se crea exitosamente
- **THEN** la firma queda en un objeto del bucket privado y `Inscripcion.firmaUrl` contiene solo la referencia, no la imagen

#### Scenario: Fallo posterior a la subida de la firma

- **WHEN** la transacción de inscripción falla (cupo lleno o documento duplicado) después de haber subido la firma
- **THEN** el sistema elimina el objeto subido y no queda un archivo huérfano en el bucket

### Requirement: Cancelación de inscripción por el Administrador

El sistema SHALL expone un endpoint `POST /api/inscripciones/[id]/cancelar` accesible solo para sesiones con rol `ADMINISTRADOR`. Al cancelar, SHALL actualizar `Inscripcion.estado` a `CANCELADO`, decrementar `cuposOcupados` por el total de asistentes activos de esa inscripción y liberar las habitaciones asignadas a los asistentes de esa inscripción, todo ello en la misma transacción. SHALL rechazar con `409` si la inscripción ya está cancelada o si el evento está `FINALIZADO`/`CANCELADO`.

#### Scenario: Cancelación exitosa

- **WHEN** un Administrador cancela una inscripción de 3 personas
- **THEN** la inscripción queda `CANCELADA`, `cuposOcupados` se decrementa en 3 y ninguna de esas personas conserva una habitación asignada en el evento

#### Scenario: Cancelación duplicada

- **WHEN** un Administrador intenta cancelar una inscripción ya cancelada
- **THEN** el sistema responde `409` y no modifica `cuposOcupados` ni las asignaciones de habitación

#### Scenario: Acceso sin rol de Administrador

- **WHEN** una petición a `POST /api/inscripciones/[id]/cancelar` no proviene de una sesión de Administrador
- **THEN** el sistema la rechaza sin modificar la inscripción

### Requirement: Vista de inscripciones del evento para el Administrador

El sistema SHALL mostrar en `/admin/eventos/[id]/inscripciones` la lista de inscripciones del evento con titular, cantidad de asistentes (grupo), correo, fecha de inscripción, estado y un botón de cancelación con confirmación, accesible solo para `ADMINISTRADOR`.

#### Scenario: Listado con cancelación

- **WHEN** un Administrador abre la página de inscripciones de un evento
- **THEN** ve la lista de inscripciones del evento y puede cancelar cada una de ellas con confirmación previa

### Requirement: Confirmación por correo de la inscripción

El sistema SHALL enviar un correo de confirmación al correo declarado por el
titular cuando la inscripción se cree exitosamente, **únicamente cuando la
confirmación por correo esté habilitada** (variable de entorno
`HABILITAR_CONFIRMACION_EVENTO` con valor verdadero), siempre que el titular haya
declarado un correo. El envío SHALL programarse únicamente después de que la
transacción de inscripción (cupo atómico y asistentes) se confirme, SHALL NOT
bloquear ni alterar la respuesta de la inscripción, y SHALL NOT ocurrir cuando la
inscripción fue rechazada. El correo SHALL identificar al titular y el tamaño del
grupo e SHALL incluir el nombre del evento, el lugar y las fechas de inicio y fin.

#### Scenario: Inscripción exitosa con correo declarado

- **WHEN** un titular se inscribe exitosamente y declaró un correo, y
  `HABILITAR_CONFIRMACION_EVENTO` tiene valor verdadero
- **THEN** el sistema envía a ese correo una confirmación que incluye el nombre
  del evento, el lugar y las fechas de inicio y fin, y el resultado de la
  inscripción sigue siendo exitoso

#### Scenario: Confirmación deshabilitada por configuración

- **WHEN** una inscripción exitosa con correo declarado ocurre y
  `HABILITAR_CONFIRMACION_EVENTO` no es verdadero (falso, ausente, o con valor
  no reconocido)
- **THEN** el sistema NO envía ninguna confirmación y la inscripción sigue siendo
  exitosa

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
