# Spec Delta

## MODIFIED Requirements

### Requirement: El Administrador puede crear un usuario con rol ADMINISTRADOR

El sistema SHALL permitir a un usuario con rol `ADMINISTRADOR` crear un nuevo
usuario con rol `ADMINISTRADOR` desde la sección Cuentas, indicando nombre
completo, documento, correo, contraseña, tipo de afiliación y centro de
formación. El centro de formación SHALL ser obligatorio para este rol —los
Administradores son siempre personal del SENA— y SHALL capturarse como texto
libre escrito por quien crea la cuenta, sin exigir que coincida con un catálogo
ni con una lista cerrada. La contraseña es asignada por el Administrador que crea
el usuario y se almacena hasheada. El documento y el correo SHALL ser únicos en
el sistema, aplicando las mismas reglas de validación que en la creación de un
Operador.

#### Scenario: Creación exitosa de un Administrador

- **WHEN** un Administrador envía un formulario válido de creación con rol
  `ADMINISTRADOR`
- **THEN** el sistema crea el usuario con rol `ADMINISTRADOR`, guarda la
  contraseña hasheada y regresa al listado mostrando el nuevo usuario

#### Scenario: Centro de formación faltante en un Administrador

- **WHEN** un Administrador envía el formulario de creación con rol
  `ADMINISTRADOR` y el centro de formación vacío
- **THEN** el sistema no crea el usuario y muestra el error de validación del
  centro de formación

#### Scenario: Correo ya registrado

- **WHEN** el correo ingresado ya pertenece a otro usuario (Operador o
  Administrador)
- **THEN** el sistema no crea el usuario y muestra un mensaje de error claro
  indicando que el correo ya está en uso

#### Scenario: Documento ya registrado

- **WHEN** el documento ingresado ya pertenece a otro usuario (Operador o
  Administrador)
- **THEN** el sistema no crea el usuario y muestra un mensaje de error claro
  indicando que el documento ya está en uso

#### Scenario: Datos inválidos

- **WHEN** el formulario tiene campos vacíos, un correo mal formado, un documento
  fuera del formato `^\d{6,12}$`, o una contraseña con menos de 8 caracteres
- **THEN** el sistema no crea el usuario y muestra los errores de validación

### Requirement: El Administrador puede crear un Operador

El sistema SHALL permitir crear una cuenta de Operador indicando nombre
completo, documento, correo, contraseña, tipo de afiliación y, opcionalmente,
centro de formación. El centro de formación SHALL capturarse como texto libre y
SHALL ser opcional para este rol, porque un Operador puede ser personal del SENA
o una persona externa. La contraseña es asignada por el Administrador y se
almacena hasheada. El documento y el correo SHALL ser únicos en el sistema.

#### Scenario: Creación exitosa

- **WHEN** un Administrador envía un formulario válido de creación de
  Operador
- **THEN** el sistema crea la cuenta con rol `OPERADOR`, guarda la contraseña
  hasheada y regresa al listado mostrando la nueva cuenta

#### Scenario: Operador sin centro de formación

- **WHEN** un Administrador envía un formulario válido de creación de Operador
  sin declarar centro de formación
- **THEN** el sistema crea la cuenta y la muestra en el listado de Operadores
  con el centro de formación vacío

#### Scenario: Correo ya registrado

- **WHEN** el correo ingresado ya pertenece a otra cuenta
- **THEN** el sistema no crea la cuenta y muestra un mensaje de error claro
  indicando que el correo ya está en uso

#### Scenario: Documento ya registrado

- **WHEN** el documento ingresado ya pertenece a otra cuenta
- **THEN** el sistema no crea la cuenta y muestra un mensaje de error claro
  indicando que el documento ya está en uso

#### Scenario: Datos inválidos

- **WHEN** el formulario tiene campos vacíos (salvo el centro de formación, que
  es opcional), un correo mal formado, un documento fuera del formato
  `^\d{6,12}$`, o una contraseña con menos de 8 caracteres
- **THEN** el sistema no crea la cuenta y muestra los errores de validación
