# Spec Delta

## MODIFIED Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir consultar la firma de una inscripción únicamente a
usuarios autenticados con rol `ADMINISTRADOR`. Una persona sin rol
`ADMINISTRADOR` (incluido un Operador) no podrá invocar el visor ni obtener la
imagen de la firma.

#### Scenario: Admin consulta una firma

- **WHEN** un usuario con rol `ADMINISTRADOR` solicita ver la firma de una
  inscripción de un evento
- **THEN** el sistema le sirve la imagen de la firma del titular desde el propio
  visor

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión solicita ver la firma de una
  inscripción
- **THEN** el sistema rechaza la operación (no autenticado o no autorizado) sin
  exponer ningún dato de la firma ni del almacenamiento

### Requirement: Consulta por evento e inscripción

El sistema SHALL permitir al Administrador consultar la firma de una inscripción
indicando tanto el evento como la inscripción, y SHALL devolver la firma
únicamente cuando la inscripción exista y pertenezca al evento indicado. Cuando
el evento no exista, o cuando la inscripción no exista o no pertenezca a ese
evento, el sistema SHALL responder con el mismo resultado de "no encontrado" en
ambos casos, sin revelar cuál de los dos identificadores fue inválido.

#### Scenario: Inscripción perteneciente al evento

- **WHEN** un Administrador consulta la firma de una inscripción que pertenece al
  evento indicado
- **THEN** el sistema sirve la imagen de la firma del titular

#### Scenario: Inscripción de otro evento o inexistente

- **WHEN** un Administrador consulta la firma de una inscripción que no pertenece
  al evento indicado, o que no existe
- **THEN** el sistema responde "no encontrado" con el mismo comportamiento en
  ambos casos y sin fallar

### Requirement: Firma disponible en cualquier estado de la inscripción

El sistema SHALL permitir ver la firma de una inscripción en cualquier estado
(`INSCRITO`, `CONFIRMADO`, `NO_ASISTIO`, `CANCELADO`), porque la firma es evidencia
del consentimiento y compromiso del titular y se conserva al cancelar la
inscripción.

#### Scenario: Firma de inscripción cancelada

- **WHEN** un Administrador consulta la firma de una inscripción que fue cancelada
- **THEN** el sistema sigue sirviendo la imagen de la firma del titular, ya que la
  cancelación no elimina la evidencia almacenada

## ADDED Requirements

### Requirement: Firma servida por el visor autenticado

El sistema SHALL servir la imagen de la firma en la respuesta del propio visor
autenticado, sin redirigir al navegador a una dirección del almacenamiento. El
sistema SHALL leer el objeto del almacenamiento privado con las credenciales del
servidor en cada solicitud, SHALL NOT exponer la ruta interna del almacenamiento
ni sus credenciales, y SHALL marcar la imagen como no almacenable en cachés
compartidas. Cuando el objeto de la firma no exista en el almacenamiento, el
sistema SHALL responder "no encontrado" sin fallar con un error interno.

#### Scenario: Firma servida al Administrador

- **WHEN** un Administrador solicita ver la firma de una inscripción cuya imagen
  está en el almacenamiento privado
- **THEN** el sistema responde con la imagen de la firma (tipo `image/png`) y con
  cabeceras que impiden almacenarla en cachés compartidas, sin exponer ninguna
  dirección ni credencial del almacenamiento

#### Scenario: Objeto ausente en el almacenamiento

- **WHEN** un Administrador solicita la firma de una inscripción cuya clave ya no
  existe en el almacenamiento
- **THEN** el sistema responde "no encontrado" sin revelar detalles del
  almacenamiento y sin fallar con un error interno

#### Scenario: Acceso directo al almacenamiento

- **WHEN** se intenta obtener la firma sin pasar por el visor (por ejemplo, usando
  la clave interna de almacenamiento directamente)
- **THEN** el sistema no sirve la imagen por ninguna vía pública; la firma solo se
  obtiene a través del visor con sesión de Administrador

## REMOVED Requirements

### Requirement: Firma servida como URL firmada y temporal

**Reason**: La URL firmada apuntaba al endpoint del almacenamiento, que en el
despliegue real no es alcanzable desde el navegador del Administrador (el
`S3_ENDPOINT` interno de la red de contenedores), así que el visor quedaba
inservible. Además, entregar la firma por una dirección propia convertía al
navegador en cliente del bucket.

**Migration**: El visor autenticado entrega la imagen en su propia respuesta
(requisito nuevo "Firma servida por el visor autenticado"). La vigencia corta que
aportaba la expiración de la URL la cubren ahora el `Cache-Control: private,
no-store` y la exigencia de sesión de Administrador en cada solicitud.
