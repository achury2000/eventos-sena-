## Purpose

Permite que cualquier persona inscrita en un evento registre su asistencia en un checkpoint escaneando el QR fijo de la estación: el QR lleva a una página pública donde se ingresa solo el documento, y el sistema registra la asistencia de forma atómica e impide duplicados.

## Requirements

### Requirement: QR de estación visible para el Administrador

El sistema SHALL generar una imagen QR por cada checkpoint del evento que codifique la URL pública `/checkpoint/{codigoQr}` del token de esa estación, y SHALL mostrarla al Administrador en el detalle del evento (`/admin/eventos/[id]`), junto al token y al estado actual del checkpoint.

#### Scenario: Imagen QR de un checkpoint

- **WHEN** un Administrador abre el detalle de un evento que tiene checkpoints configurados
- **THEN** cada checkpoint muestra una imagen QR escaneable que apunta a la URL `/checkpoint/<codigoQr>` de esa estación

### Requirement: Página pública de autoregistro

El sistema SHALL publicar la página `/checkpoint/[token]` accesible sin sesión. Si el token no corresponde a ningún checkpoint existente, SHALL mostrar un mensaje informativo. Si el checkpoint existe pero su campo `activo` es `false`, SHALL mostrar un mensaje indicando que el checkpoint está desactivado.

#### Scenario: Token inválido

- **WHEN** un usuario visita `/checkpoint/[token]` con un token que no corresponde a ningún checkpoint
- **THEN** el sistema muestra un mensaje informativo y ningún formulario

#### Scenario: Checkpoint desactivado

- **WHEN** un usuario visita `/checkpoint/[token]` de un checkpoint existente pero inactivo
- **THEN** el sistema muestra un mensaje indicando que el checkpoint está desactivado y ningún formulario

#### Scenario: Checkpoint activo

- **WHEN** un usuario visita `/checkpoint/[token]` de un checkpoint existente y activo
- **THEN** el sistema muestra el formulario de autoregistro con el nombre del checkpoint y el evento

### Requirement: Formulario de autoregistro con solo documento

El formulario SHALL pedir únicamente el número de documento de identidad (de 6 a 12 dígitos), sin nombre ni otro dato personal. SHALL permitir reenviar una nueva consulta con un documento distinto después de cualquier resultado.

#### Scenario: Documento de formato inválido

- **WHEN** un usuario envía un documento que no tiene entre 6 y 12 dígitos
- **THEN** el sistema rechaza el envío y muestra el error de validación en pantalla

#### Scenario: Consulta repetida tras un resultado

- **WHEN** un usuario obtiene un resultado de autoregistro (éxito o rechazo)
- **THEN** el sistema mantiene visible el formulario para que el usuario pueda ingresar otro documento y volver a enviar

### Requirement: Registro de asistencia en el checkpoint

El endpoint `POST /api/checkpoints/[token]/registro` SHALL registrar la asistencia del asistente cuyo documento se envía. SHALL responder `201` con el resultado `OK` cuando el registro se crea, `404` cuando el documento no corresponde a un asistente inscrito en el evento de ese checkpoint, `422` cuando el checkpoint está inactivo, y `400` cuando los datos recibidos no son válidos. El registro SHALL persistirse con la referencia al asistente (`Asistente`), al checkpoint y el método de registro, sin requerir sesión.

#### Scenario: Registro exitoso

- **WHEN** un asistente inscrito en el evento envía su documento en un checkpoint activo
- **THEN** el sistema crea el registro de control y responde `201`

#### Scenario: Documento no inscrito en el evento

- **WHEN** se envía un documento que no pertenece a ningún asistente del evento de ese checkpoint
- **THEN** el sistema responde `404` y no crea ningún registro

#### Scenario: Checkpoint inactivo

- **WHEN** se envía un documento a un checkpoint desactivado
- **THEN** el sistema responde `422` y no crea ningún registro

#### Scenario: Cuerpo de solicitud inválido

- **WHEN** se envía una solicitud sin documento o con un formato no válido
- **THEN** el sistema responde `400` y no crea ningún registro

### Requirement: Bloqueo de duplicados por asistente y checkpoint

El sistema SHALL impedir que el mismo documento (asistente) registre el mismo checkpoint dos veces, apoyándose en la restricción única `(asistenteId, checkpointId)` de `RegistroControl` e insertando siempre en vez de verificar antes. Al detectar el duplicado, SHALL responder `409` con resultado `YA_REGISTRADO`, sin crear un segundo registro. Bajo peticiones simultáneas del mismo documento, exactamente una obtiene `201` y las demás `409`.

#### Scenario: Documento repetido en el mismo checkpoint

- **WHEN** un asistente que ya se registró en ese checkpoint envía su documento nuevamente
- **THEN** el sistema responde `409` indicando que ya está registrado y no crea un segundo registro

#### Scenario: Peticiones simultáneas del mismo documento

- **WHEN** dos solicitudes concurrentes del mismo documento llegan al mismo checkpoint al mismo tiempo
- **THEN** exactamente una responde `201` y la otra `409`, sin que existan dos registros del mismo asistente en el checkpoint