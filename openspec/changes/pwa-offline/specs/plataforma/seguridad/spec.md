# Spec Delta

## MODIFIED Requirements

### Requirement: Headers de seguridad en toda respuesta

El sistema SHALL enviar en toda respuesta del servidor los encabezados
`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy` y `Permissions-Policy`, y SHALL omitir el encabezado
`X-Powered-By` que revela la tecnología del servidor. La CSP SHALL incluir
`worker-src 'self'`, de modo que solo se permita registrar un service worker
servido por el propio origen.

#### Scenario: CSP restrictiva en producción

- **WHEN** se sirve cualquier página en un entorno de producción
- **THEN** la respuesta incluye una `Content-Security-Policy` que restringe
  `default-src` a `'self'`, prohíbe `object-src`, prohíbe `frame-ancestors`,
  limita `worker-src` a `'self'` y prohíbe que la base URI y el destino de
  formularios salgan del origen

#### Scenario: Clickjacking bloqueado

- **WHEN** un tercero intenta incrustar el login en un `<iframe>`
- **THEN** el navegador lo rechaza por `X-Frame-Options` y por
  `frame-ancestors 'none'` en la CSP

#### Scenario: Sin fuga de tecnología

- **WHEN** se sirve cualquier página
- **THEN** la respuesta no incluye el encabezado `X-Powered-By`

#### Scenario: Service worker del propio origen

- **WHEN** el navegador registra el service worker de la aplicación
- **THEN** la CSP permite el script por `worker-src 'self'` y un service worker
  de otro origen queda bloqueado

## ADDED Requirements

### Requirement: Cache HTTP del service worker

El sistema SHALL servir el script del service worker con un tipo de contenido
JavaScript y con `Cache-Control: no-cache, no-store, must-revalidate`, para que
el navegador compruebe siempre si hay una versión nueva. El sistema SHALL NOT
servirlo con una vigencia de caché larga.

#### Scenario: Revalidación del service worker

- **WHEN** el navegador solicita el script del service worker
- **THEN** la respuesta se sirve como JavaScript y con `Cache-Control:
  no-cache, no-store, must-revalidate`, de modo que no se reutiliza una copia
  vieja sin consultar al servidor
