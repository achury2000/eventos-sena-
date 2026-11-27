# plataforma/email Specification

## Purpose
Envía correos transaccionales del sistema (hoy, la confirmación de inscripción)
mediante un proveedor configurable, sin bloquear ni condicionar la operación que
los origina y fallando abierto cuando no hay credenciales.

## Requirements

### Requirement: Envío mediante un proveedor de correo configurable

El sistema SHALL enviar correos transaccionales a través de un transporte
configurable por variables de entorno. Cuando exista configuración SMTP, el
sistema SHALL usar SMTP; cuando no exista ninguna variable SMTP y estén
configuradas las credenciales de Resend, SHALL usar Resend como respaldo. El
remitente SHALL provenir de `EMAIL_FROM`. El sistema SHALL usar credenciales y
remitente provistos por variables de entorno y SHALL NOT incluirlos en el código
ni en los artefactos versionados.

#### Scenario: Envío con credenciales configuradas

- **WHEN** se solicita enviar un correo y el entorno tiene las credenciales del
  transporte elegido y el remitente configurados
- **THEN** el sistema realiza la petición de envío con el destinatario, el
  remitente configurado, el asunto y el contenido del mensaje

#### Scenario: Envío por SMTP con configuración completa

- **WHEN** se solicita enviar un correo y el entorno tiene `SMTP_HOST`,
  `SMTP_USER`, `SMTP_PASSWORD` y `EMAIL_FROM` configurados
- **THEN** el sistema realiza el envío por SMTP con el destinatario, el remitente
  configurado, el asunto y el contenido del mensaje

#### Scenario: Respaldo Resend sin configuración SMTP

- **WHEN** se solicita enviar un correo, no hay ninguna variable SMTP configurada
  y el entorno tiene `RESEND_API_KEY` y `EMAIL_FROM`
- **THEN** el sistema realiza el envío con Resend usando el remitente configurado

#### Scenario: Remitente o credenciales incompletos

- **WHEN** la configuración del transporte elegido está incompleta (falta la
  credencial o el remitente)
- **THEN** el sistema NO intenta el envío y lo trata como no configurado

#### Scenario: Configuración SMTP incompleta

- **WHEN** existe al menos una variable SMTP configurada pero la configuración
  SMTP no está completa
- **THEN** el sistema NO intenta enviar por SMTP ni usa Resend como respaldo, y
  lo trata como un transporte no configurado

### Requirement: Falla abierta cuando el sistema de correo no está configurado

El sistema SHALL NOT intentar enviar correos y SHALL registrar una única
advertencia cuando el transporte elegido no esté configurado, de modo que el
desarrollo local y la integración continua funcionen sin secretos. La operación
que originó el envío SHALL continuar con su curso normal.

#### Scenario: Entorno sin credenciales

- **WHEN** se solicita enviar un correo y el entorno no tiene credenciales de
  ningún transporte
- **THEN** el sistema no contacta a ningún proveedor, registra una advertencia
  indicando que los correos NO se están enviando, y la operación que lo invocó
  termina con éxito

#### Scenario: Entorno sin transporte configurado

- **WHEN** se solicita enviar un correo y no hay configuración SMTP ni
  credenciales de Resend completas
- **THEN** el sistema no contacta a ningún proveedor, registra una advertencia
  indicando que los correos NO se están enviando, y la operación que lo invocó
  termina con éxito

#### Scenario: Configuración SMTP incompleta

- **WHEN** se solicita enviar un correo, hay variables SMTP parciales y no hay
  credenciales de Resend completas
- **THEN** el sistema no contacta a ningún proveedor, registra una advertencia y
  la operación que lo invocó termina con éxito

### Requirement: El fallo del envío no se propaga a la operación que lo origina

El sistema SHALL capturar cualquier fallo del proveedor de correo (error de red o
respuesta de error) y SHALL NOT propagarlo a quien solicitó el envío. Un fallo de
correo SHALL registrarse sin alterar el resultado de la operación de negocio.

#### Scenario: El proveedor responde con error

- **WHEN** la petición de envío al proveedor falla (error de red o respuesta de
  error del proveedor)
- **THEN** el sistema registra el fallo y NO lanza el error a la operación que
  solicitó el envío, que conserva su resultado exitoso

### Requirement: El envío de correos transaccionales puede habilitarse/deshabilitarse por configuración

El sistema SHALL permitir activar o desactivar el envío de correos transaccionales
mediante la variable de entorno `HABILITAR_CONFIRMACION_EVENTO`. Cuando esté
**deshabilitado** (valor no verdadero: `false`, ausente, o no reconocido), el
sistema SHALL NOT programar ni intentar enviar correos transaccionales, y SHALL
NOT registrar un warning por falta de credenciales a causa de esta activación.
Cuando esté **habilitado** (valor verdadero: `true`, `1`, `yes`, `on`), el
sistema SHALL aplicar las reglas existentes de credenciales y falla abierta.

#### Scenario: Confirmación deshabilitada por configuración

- **WHEN** `HABILITAR_CONFIRMACION_EVENTO` no es verdadero
- **THEN** el sistema NO programa ni intenta enviar correos transaccionales

#### Scenario: Confirmación habilitada por configuración

- **WHEN** `HABILITAR_CONFIRMACION_EVENTO` es verdadero
- **THEN** el sistema aplica las reglas de credenciales y falla abierta para el
  envío de correos transaccionales
