# plataforma/seguridad Specification

## Purpose
Define el comportamiento de protección de las superficies públicas del sistema
(autenticación, inscripción pública y autoregistro en checkpoint) frente a
abuso automatizado, y los headers de seguridad que se envían en toda
respuesta del servidor.

## Requirements

### Requirement: Límite de peticiones en el login

El sistema SHALL limitar las peticiones de autenticación por IP de origen a un
máximo de 5 intentos cada 15 minutos. Superado ese límite, el sistema SHALL
responder `429` con un mensaje que indique que hay que esperar, sin revelar si
el correo existe ni comparar credenciales. El límite SHALL contar los intentos
fallidos y los exitosos por igual, porque un login exitoso solo es distinguible
de uno fallido después de haber comparado la contraseña.

#### Scenario: Fuerza bruta bloqueada

- **WHEN** una misma IP envía más de 5 intentos de autenticación en 15 minutos
- **THEN** el sistema responde `429` y no ejecuta la comparación de contraseña

#### Scenario: Mensaje de espera

- **WHEN** el límite de login está agotado
- **THEN** el mensaje dice cuántos intentos quedan o cuándo reintentar, sin
  indicar si el correo proporcionado corresponde a una cuenta real

### Requirement: Límite de peticiones en el autoregistro de checkpoint

El sistema SHALL limitar el autoregistro por checkpoint a un máximo de 30
peticiones por minuto y por IP de origen. El límite SHALL ser deliberadamente
más alto que el del login porque el sitio del evento puede tener una sola red
wifi con cientos de personas compartiendo la misma dirección IP pública por
NAT. Superado el límite, el sistema SHALL responder `429`.

#### Scenario: Evento con muchos asistentes en la misma red

- **WHEN** cientos de asistentes tras un mismo NAT se registran en el mismo
  checkpoint durante un minuto
- **THEN** el sistema no rechaza a ninguno de ellos por el límite de 30/min

#### Scenario: Enumeración de documentos frenada

- **WHEN** una misma IP supera las 30 peticiones por minuto de registro
- **THEN** el sistema responde `429` antes de consultar si el documento está
  inscrito, de modo que la respuesta no revela ni siquiera si el documento existe

### Requirement: Límite de peticiones en la inscripción pública

El sistema SHALL limitar las inscripciones por IP de origen a un máximo de 10
peticiones por minuto. Superado el límite, el sistema SHALL responder `429`
**antes** de escribir la firma en el almacenamiento de objetos y antes de
intentar la transacción de cupo, para que una inscripción rechazada por límite
no deje archivos huérfanos ni ocupe cupos.

#### Scenario: Inscripción rechazada sin efectos colaterales

- **WHEN** una IP supera 10 inscripciones por minuto
- **THEN** el sistema responde `429` y no se escribe ningún objeto en el bucket
  de firmas ni se modificó `cuposOcupados` de ningún evento

### Requirement: Falla abierta cuando el servicio de límite no está configurado

El sistema SHALL aplicar los límites anteriores únicamente cuando el servicio
de conteo esté configurado. Si no lo está, el sistema SHALL permitir la
petición y emitir un aviso en el log una sola vez por proceso. Esta falla
abierta es deliberada: el desarrollo local y las pruebas automatizadas no
cuentan con el servicio externo, y una caída del mismo no debe impedir
inscribir personas el día de un evento.

#### Scenario: Desarrollo local sin configurar

- **WHEN** se ejecuta la aplicación sin credenciales del servicio de conteo y
  un usuario envía varias peticiones seguidas a la inscripción pública
- **THEN** todas son atendidas con normalidad y se emitió un aviso en el log

#### Scenario: Aviso único

- **WHEN** se acumulan varias peticiones sin el servicio de conteo configurado
- **THEN** el aviso aparece en el log una sola vez, no en cada petición

### Requirement: Identificación de la IP de origen

El sistema SHALL identificar al cliente por la dirección de origen declarada
en la cadena de encabezados de reenvío, tomando el primer valor. Cuando no haya
ninguna disponible, el sistema SHALL aplicar el límite contra una identidad
común en lugar de omitir el límite.

#### Scenario: Sin IP disponible

- **WHEN** una petición llega sin ningún encabezado de IP identificable
- **THEN** el sistema la cuenta dentro de un mismo límite compartido, en vez de
  dejar la petición sin límite

### Requirement: Headers de seguridad en toda respuesta

El sistema SHALL enviar en toda respuesta del servidor los encabezados
`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy` y `Permissions-Policy`, y SHALL omitir el encabezado
`X-Powered-By` que revela la tecnología del servidor.

#### Scenario: CSP restrictiva en producción

- **WHEN** se sirve cualquier página en un entorno de producción
- **THEN** la respuesta incluye una `Content-Security-Policy` que restringe
  `default-src` a `'self'`, prohíbe `object-src`, prohíbe `frame-ancestors` y
  prohíbe que la base URI y el destino de formularios salgan del origen

#### Scenario: Clickjacking bloqueado

- **WHEN** un tercero intenta incrustar el login en un `<iframe>`
- **THEN** el navegador lo rechaza por `X-Frame-Options` y por
  `frame-ancestors 'none'` en la CSP

#### Scenario: Sin fuga de tecnología

- **WHEN** se sirve cualquier página
- **THEN** la respuesta no incluye el encabezado `X-Powered-By`

### Requirement: TLS obligatorio en producción

El sistema SHALL enviar `Strict-Transport-Security` y la directiva
`upgrade-insecure-requests` solo cuando la aplicación se ejecuta en producción,
y SHALL omitirlos en desarrollo, donde el tráfico es `http` sobre `localhost` y
ambas directivas impedirían que la aplicación cargara.

#### Scenario: Desarrollo local no rompe

- **WHEN** la aplicación corre con `NODE_ENV=development` en `http://localhost`
- **THEN** la respuesta no incluye `Strict-Transport-Security` ni
  `upgrade-insecure-requests`, y la aplicación carga con normalidad

#### Scenario: Producción exige HTTPS

- **WHEN** la aplicación corre con `NODE_ENV=production`
- **THEN** la respuesta incluye `Strict-Transport-Security` con una vigencia
  de al menos un año e `includeSubDomains`
