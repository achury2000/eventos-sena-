# Spec Delta

## Purpose

Define cómo una persona cambia la contraseña de su propia cuenta desde el
inicio de sesión (sin necesidad de sesión abierta) y cómo una cuenta con
contraseña temporal asignada por el Administrador debe definir la suya antes de
acceder a su panel, sin depender de un sistema de correo.

## ADDED Requirements

### Requirement: Cambio de contraseña propio desde el acceso

El sistema SHALL permitir cambiar la contraseña de la propia cuenta desde la
página de cambio de contraseña, enlazada en el inicio de sesión y accesible
**sin sesión**. El formulario SHALL exigir el correo de la cuenta, la contraseña
actual, la nueva contraseña y su confirmación. La contraseña actual SHALL
verificarse contra el hash almacenado; si el correo no corresponde a ninguna
cuenta o la contraseña actual es incorrecta, el sistema SHALL rechazar el cambio
con **el mismo mensaje genérico** en ambos casos, sin revelar cuál de los dos
datos falló. La nueva contraseña SHALL tener al menos 8 caracteres y SHALL
coincidir con su confirmación; se almacena hasheada. La operación SHALL afectar
únicamente a la cuenta identificada por ese correo. El sistema SHALL limitar los
intentos por IP de origen (ver `plataforma/seguridad`) y NO SHALL depender de
ningún servicio de correo. Cuando quien envía el formulario tenga sesión activa
y su cuenta no tenga la marca de cambio forzado, la cuenta a modificar SHALL ser
la de la sesión y SHALL exigirse igualmente la contraseña actual.

#### Scenario: Cambio exitoso desde el acceso

- **WHEN** una persona sin sesión envía el correo de su cuenta, su contraseña
  actual correcta y una nueva contraseña de 8 o más caracteres con confirmación
  coincidente
- **THEN** el sistema reemplaza la contraseña hasheada y la nueva sirve para
  iniciar sesión, sin abrir sesión por sí solo

#### Scenario: Credenciales genéricas

- **WHEN** el correo no corresponde a ninguna cuenta o la contraseña actual no
  coincide con la almacenada
- **THEN** el sistema rechaza el cambio con el mismo mensaje en ambos casos y la
  contraseña almacenada permanece sin cambios

#### Scenario: Contraseña nueva inválida

- **WHEN** la nueva contraseña tiene menos de 8 caracteres o no coincide con su
  confirmación
- **THEN** el sistema rechaza el cambio con un mensaje de validación y no
  modifica la contraseña almacenada

#### Scenario: No afecta a otras cuentas

- **WHEN** se envía el formulario de cambio de contraseña desde el acceso
- **THEN** únicamente cambia la contraseña de la cuenta identificada por el
  correo enviado; ninguna otra cuenta se ve afectada

#### Scenario: Con sesión activa

- **WHEN** una persona con sesión activa (sin marca de cambio forzado) envía el
  formulario de cambio de contraseña
- **THEN** el cambio se aplica a la cuenta de su sesión, previa verificación de
  la contraseña actual, sin importar el correo que envíe el formulario

### Requirement: Cambio obligatorio de la contraseña temporal

Cuando una cuenta tenga la marca de restablecimiento activa (contraseña
temporal asignada por el Administrador), el sistema SHALL condicionar el acceso:
la cuenta podrá iniciar sesión con la contraseña temporal, pero SHALL ser
redirigida a la página de cambio de contraseña y ninguna vista del panel SHALL
mostrarse hasta que la contraseña nueva quede definida. La página de cambio
forzado SHALL pedir la nueva contraseña y su confirmación, sin exigir repetir
la contraseña temporal (que se acaba de usar para iniciar sesión). Al definirla,
la marca SHALL retirarse y el acceso al panel SHALL restaurarse.

#### Scenario: Sesión con contraseña temporal

- **WHEN** un usuario con la marca activa inicia sesión con su contraseña
  temporal
- **THEN** el sistema lo redirige a la página de cambio de contraseña en lugar
  de su panel

#### Scenario: Panel inaccesible mientras la marca esté activa

- **WHEN** con la marca activa se intenta acceder directamente a cualquier
  vista del panel (navegación o recarga)
- **THEN** el sistema redirige a la página de cambio de contraseña sin mostrar
  el contenido del panel

#### Scenario: Contraseña nueva definida

- **WHEN** el usuario envía una nueva contraseña válida con su confirmación
  desde la página de cambio forzado
- **THEN** la marca se retira, la contraseña anterior (la temporal) deja de
  servir y el sistema lo lleva a su panel con la sesión abierta

#### Scenario: Cuenta sin marca no se ve afectada

- **WHEN** inicia sesión una cuenta sin la marca de restablecimiento
- **THEN** el sistema lo dirige directamente a su panel, sin pasar por la
  página de cambio de contraseña
