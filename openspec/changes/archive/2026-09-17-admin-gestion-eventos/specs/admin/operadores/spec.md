## Purpose

Permite que el Administrador gestione las cuentas de Usuario con rol OPERADOR
de la plataforma (crear, listar y eliminar), sin que exista autorregistro
público para estos accesos.

## ADDED Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir ver y modificar la gestión de Operadores únicamente
a usuarios autenticados con rol `ADMINISTRADOR`.

#### Scenario: Admin accede a la gestión de operadores

- **WHEN** un usuario con rol `ADMINISTRADOR` visita `/admin/operadores`
- **THEN** el sistema le muestra el listado de Operadores y el acceso para
  crear uno nuevo

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión intenta acceder a
  `/admin/operadores` o invocar una acción de gestión de Operadores
- **THEN** el sistema lo redirige a `/login` (sin sesión) o a su panel
  correspondiente (rol `OPERADOR`), y la acción no se ejecuta

### Requirement: El Administrador puede listar Operadores

El sistema SHALL mostrar el listado de cuentas de Operador con nombre
completo, documento, correo, tipo de afiliación, centro de formación
asociado y fecha de creación.

#### Scenario: Listado de operadores

- **WHEN** un Administrador visita `/admin/operadores`
- **THEN** el sistema muestra todas las cuentas con rol `OPERADOR` ordenadas
  por fecha de creación descendente

#### Scenario: Sin operadores registrados

- **WHEN** no existen cuentas de Operador
- **THEN** el sistema muestra un estado vacío con la invitación a crear la
  primera cuenta

### Requirement: El Administrador puede crear un Operador

El sistema SHALL permitir crear una cuenta de Operador indicando nombre
completo, documento, correo, contraseña, tipo de afiliación y centro de
formación. La contraseña es asignada por el Administrador y se almacena
hasheada. El documento y el correo SHALL ser únicos en el sistema.

#### Scenario: Creación exitosa

- **WHEN** un Administrador envía un formulario válido de creación de
  Operador
- **THEN** el sistema crea la cuenta con rol `OPERADOR`, guarda la contraseña
  hasheada y regresa al listado mostrando la nueva cuenta

#### Scenario: Correo ya registrado

- **WHEN** el correo ingresado ya pertenece a otra cuenta
- **THEN** el sistema no crea la cuenta y muestra un mensaje de error claro
  indicando que el correo ya está en uso

#### Scenario: Documento ya registrado

- **WHEN** el documento ingresado ya pertenece a otra cuenta
- **THEN** el sistema no crea la cuenta y muestra un mensaje de error claro
  indicando que el documento ya está en uso

#### Scenario: Datos inválidos

- **WHEN** el formulario tiene campos vacíos, un correo mal formado, un
  documento fuera del formato `^\d{6,12}$`, o una contraseña con menos de 8
  caracteres
- **THEN** el sistema no crea la cuenta y muestra los errores de validación

### Requirement: El Administrador puede eliminar un Operador

El sistema SHALL permitir eliminar la cuenta de un Operador. La eliminación
SHALL liberar las relaciones del Operador con eventos (asignaciones M:N) y
SHALL conservar la evidencia de registros de control manuales existentes
dejando sin Operador asociado al registro.

#### Scenario: Eliminación exitosa

- **WHEN** un Administrador confirma la eliminación de una cuenta de
  Operador
- **THEN** el sistema elimina la cuenta y deja de mostrarla en el listado

#### Scenario: Operador con registros manuales históricos

- **WHEN** el Operador a eliminar tiene registros de control manuales
  (campo `operadorId` poblado)
- **THEN** el sistema elimina la cuenta pero preserva los registros, que
  quedan sin referencia al Operador

### Requirement: No se crean cuentas de Administrador desde esta gestión

El sistema SHALL impedir que desde la gestión de Operadores se cree o
modifique una cuenta con rol `ADMINISTRADOR`.

#### Scenario: Intento de crear un Administrador

- **WHEN** una acción de creación de Operador intenta asignar el rol
  `ADMINISTRADOR`
- **THEN** el sistema rechaza la operación y crea la cuenta con rol
  `OPERADOR` o devuelve un error de autorización

#### Scenario: No se puede autopromover el rol

- **WHEN** una acción de gestión intenta cambiar el rol de una cuenta
- **THEN** el sistema rechaza el cambio de rol