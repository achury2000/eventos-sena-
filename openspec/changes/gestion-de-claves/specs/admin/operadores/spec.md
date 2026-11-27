# Spec Delta

## ADDED Requirements

### Requirement: El Administrador puede restablecer la contraseña de un usuario

El sistema SHALL permitir a un usuario con rol `ADMINISTRADOR` restablecer la
contraseña de cualquier usuario de la plataforma (Administrador u Operador)
desde la sección Cuentas. El restablecimiento SHALL generar una contraseña
temporal, mostrarla al Administrador **una sola vez** y quedar a cargo de su
entrega fuera del sistema (el sistema no envía correos ni notificaciones). La
cuenta restablecida SHALL quedar marcada para cambio obligatorio: su contraseña
anterior deja de servir para iniciar sesión y el usuario no accede a su panel
hasta definir una contraseña propia.

#### Scenario: Restablecimiento exitoso

- **WHEN** un Administrador restablece la contraseña de otro usuario de la
  plataforma
- **THEN** el sistema genera una contraseña temporal, la muestra una sola vez en
  pantalla, la contraseña anterior deja de servir y la cuenta queda marcada
  para cambio obligatorio

#### Scenario: La contraseña anterior deja de servir

- **WHEN** una cuenta con la contraseña restablecida intenta iniciar sesión con
  su contraseña anterior
- **THEN** el sistema rechaza el inicio de sesión con credenciales inválidas

#### Scenario: La temporal no se vuelve a mostrar

- **WHEN** el Administrador vuelve al listado de Cuentas después del
  restablecimiento
- **THEN** la contraseña temporal ya no está disponible en pantalla; solo la
  cuenta queda visible con su marca de cambio pendiente

#### Scenario: id inexistente

- **WHEN** la acción de restablecimiento recibe el id de un usuario que no
  existe
- **THEN** el sistema rechaza la operación sin modificar ninguna cuenta

#### Scenario: Restringido a Administradores

- **WHEN** un usuario con rol `OPERADOR` intenta invocar la acción de
  restablecimiento
- **THEN** el sistema rechaza la operación sin modificar ninguna cuenta
