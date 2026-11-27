# Spec Delta

## ADDED Requirements

### Requirement: El Administrador puede listar usuarios con rol ADMINISTRADOR

El sistema SHALL mostrar en la sección Cuentas el listado de usuarios con rol
`ADMINISTRADOR` junto al de Operadores, distinguiéndolos por un filtro por rol
(pestañas "Administradores" y "Operadores"). Cada listado muestra nombre
completo, documento, correo, tipo de afiliación, centro de formación asociado y
fecha de creación, ordenado por fecha de creación descendente.

#### Scenario: Listado de Administradores

- **WHEN** un Administrador abre la sección Cuentas con el filtro de rol en
  "Administradores"
- **THEN** el sistema muestra todos los usuarios con rol `ADMINISTRADOR`
  ordenados por fecha de creación descendente, con los mismos campos que el
  listado de Operadores

#### Scenario: Sin Administradores registrados

- **WHEN** no existen usuarios de Administrador además de la sesión activa
- **THEN** el sistema muestra el listado filtrado de Administradores con el
  estado vacío y la invitación a crear el primero

### Requirement: El Administrador puede crear un usuario con rol ADMINISTRADOR

El sistema SHALL permitir a un usuario con rol `ADMINISTRADOR` crear un nuevo
usuario con rol `ADMINISTRADOR` desde la sección Cuentas, indicando nombre
completo, documento, correo, contraseña, tipo de afiliación y centro de
formación. La contraseña es asignada por el Administrador que crea el usuario y
se almacena hasheada. El documento y el correo SHALL ser únicos en el sistema,
aplicando las mismas reglas de validación que en la creación de un Operador.

#### Scenario: Creación exitosa de un Administrador

- **WHEN** un Administrador envía un formulario válido de creación con rol
  `ADMINISTRADOR`
- **THEN** el sistema crea el usuario con rol `ADMINISTRADOR`, guarda la
  contraseña hasheada y regresa al listado mostrando el nuevo usuario

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

### Requirement: El Administrador puede eliminar un usuario con rol ADMINISTRADOR

El sistema SHALL permitir a un usuario con rol `ADMINISTRADOR` eliminar un
usuario con rol `ADMINISTRADOR` desde la sección Cuentas. La eliminación SHALL
liberar las relaciones del usuario con eventos (asignaciones M:N) y SHALL
conservar la evidencia de registros de control manuales existentes dejando sin
Operador/Administrador asociado al registro. El sistema SHALL impedir que un
Administrador elimine su propio usuario, y SHALL impedir eliminar el último
usuario con rol `ADMINISTRADOR` activo del sistema.

#### Scenario: Eliminación exitosa de un Administrador

- **WHEN** un Administrador confirma la eliminación de otro usuario de
  Administrador y existen más usuarios de Administrador activos
- **THEN** el sistema elimina el usuario y deja de mostrarlo en el listado

#### Scenario: No se puede auto-eliminar

- **WHEN** un Administrador intenta eliminar su propio usuario
- **THEN** el sistema rechaza la operación y muestra un mensaje de error sin
  eliminar el usuario

#### Scenario: No se puede eliminar al último Administrador

- **WHEN** un Administrador intenta eliminar un usuario de Administrador y ese
  sería el único usuario con rol `ADMINISTRADOR` restante
- **THEN** el sistema rechaza la operación y muestra un mensaje de error sin
  eliminar el usuario

## MODIFIED Requirements

### Requirement: Acceso solo para Administradores

El sistema SHALL permitir ver y modificar la gestión de usuarios de la
plataforma (Operadores y Administradores) únicamente a usuarios autenticados con
rol `ADMINISTRADOR`.

#### Scenario: Admin accede a la gestión de operadores

- **WHEN** un usuario con rol `ADMINISTRADOR` visita `/admin/cuentas`
- **THEN** el sistema le muestra el listado de usuarios (con filtro por rol) y
  el acceso para crear uno nuevo

#### Scenario: No-admin bloqueado

- **WHEN** un usuario con rol `OPERADOR` o sin sesión intenta acceder a
  `/admin/cuentas` o invocar una acción de gestión de usuarios
- **THEN** el sistema lo redirige a `/login` (sin sesión) o a su panel
  correspondiente (rol `OPERADOR`), y la acción no se ejecuta

### Requirement: El Administrador puede listar Operadores

El sistema SHALL mostrar el listado de usuarios de Operador con nombre completo,
documento, correo, tipo de afiliación, centro de formación asociado y fecha de
creación, dentro de la sección Cuentas con el filtro de rol en "Operadores".

#### Scenario: Listado de operadores

- **WHEN** un Administrador visita `/admin/cuentas` con el filtro de rol en
  "Operadores"
- **THEN** el sistema muestra todos los usuarios con rol `OPERADOR` ordenados por
  fecha de creación descendente

#### Scenario: Sin operadores registrados

- **WHEN** no existen usuarios de Operador
- **THEN** el sistema muestra un estado vacío con la invitación a crear el
  primero

### Requirement: El Administrador puede eliminar un Operador

El sistema SHALL permitir eliminar el usuario de un Operador. La eliminación
SHALL liberar las relaciones del usuario con eventos (asignaciones M:N) y SHALL
conservar la evidencia de registros de control manuales existentes dejando sin
Operador asociado al registro. La acción de eliminación SHALL validar que el id
recibido corresponde a un usuario con rol `OPERADOR`; si el id corresponde a otro
usuario (por ejemplo, uno con rol `ADMINISTRADOR`) o no existe, el sistema SHALL
rechazar la operación sin eliminar nada.

#### Scenario: Eliminación exitosa

- **WHEN** un Administrador confirma la eliminación de un usuario de Operador y
  el id corresponde a un usuario con rol `OPERADOR`
- **THEN** el sistema elimina el usuario y deja de mostrarlo en el listado

#### Scenario: Operador con registros manuales históricos

- **WHEN** el Operador a eliminar tiene registros de control manuales (campo
  `operadorId` poblado)
- **THEN** el sistema elimina el usuario pero preserva los registros, que quedan
  sin referencia al Operador

#### Scenario: id que no es de un Operador

- **WHEN** la acción de eliminación recibe el id de un usuario con rol
  `ADMINISTRADOR` o de un usuario inexistente desde el listado de Operadores
- **THEN** el sistema rechaza la operación sin eliminar ningún usuario

## REMOVED Requirements

### Requirement: No se crean cuentas de Administrador desde esta gestión

**Reason**: La gestión de usuarios se amplía para cubrir también el rol
`ADMINISTRADOR` (la sección pasa de "Operadores" a "Cuentas" con filtro por rol),
de modo que ya no tiene sentido impedir la creación de Administradores desde la
gestión.

**Migration**: La capacidad pasa a permitir crear usuarios con rol `OPERADOR` o
`ADMINISTRADOR` desde la sección Cuentas. Los usuarios de Administrador se crean
únicamente por un usuario con rol `ADMINISTRADOR`, bajo las reglas definidas en
los requisitos nuevos "El Administrador puede crear un usuario con rol
ADMINISTRADOR" y "El Administrador puede eliminar un usuario con rol
ADMINISTRADOR".