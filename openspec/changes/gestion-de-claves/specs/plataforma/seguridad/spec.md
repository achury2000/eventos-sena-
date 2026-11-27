# Spec Delta

## ADDED Requirements

### Requirement: Límite de peticiones en el cambio de contraseña

El sistema SHALL limitar los intentos de cambio de contraseña desde el acceso
(sin sesión) por IP de origen a un máximo de 3 cada 15 minutos. El límite SHALL
contar los intentos fallidos y los exitosos por igual, y el mensaje SHALL
indicar que hay que esperar, sin revelar si el correo corresponde a una cuenta
real. Esta superficie SHALL tener su propio contador, independiente del de
login: agotar uno no bloquea el otro.

#### Scenario: Adivinación de credenciales frenada

- **WHEN** una misma IP supera los 3 intentos de cambio de contraseña en 15
  minutos
- **THEN** el sistema responde con el mensaje de espera y no ejecuta la
  comparación de contraseña

#### Scenario: Contadores independientes

- **WHEN** una misma IP agota el límite del login pero no el del cambio de
  contraseña
- **THEN** el formulario de cambio de contraseña sigue atendiendo intentos hasta
  agotar su propio límite
