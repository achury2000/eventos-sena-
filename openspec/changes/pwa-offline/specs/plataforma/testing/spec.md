# Spec Delta

## ADDED Requirements

### Requirement: Pruebas end-to-end de PWA y navegación sin conexión

El harness SHALL probar con Playwright, contra un build de producción, el
manifest y los iconos, el registro del service worker, la navegación sin
conexión de páginas visitadas, la página `/offline`, el bloqueo de escrituras y
la limpieza de cachés al cerrar sesión.

#### Scenario: Manifest e iconos

- **WHEN** la suite solicita el manifest y cada icono declarado
- **THEN** el manifest responde con los campos de instalación requeridos y cada
  icono responde con el tamaño y tipo declarados

#### Scenario: Service worker registrado

- **WHEN** la suite carga la aplicación en el navegador de pruebas
- **THEN** el service worker queda registrado y controla la página después de la
  activación

#### Scenario: Recarga sin conexión de una página visitada

- **WHEN** la suite visita una página, corta la red y la recarga
- **THEN** la página se renderiza desde la caché con el aviso de modo sin
  conexión, sin la página de error del navegador

#### Scenario: Ruta sin copia sin conexión

- **WHEN** la suite abre sin conexión una ruta que no había visitado
- **THEN** se muestra la página `/offline` con el mensaje de que se necesita
  conexión

#### Scenario: Escritura bloqueada sin conexión

- **WHEN** la suite intenta enviar un formulario de escritura sin conexión
- **THEN** se muestra el mensaje de falta de conexión y la base de datos no
  registra la operación

#### Scenario: Cierre de sesión limpia la caché

- **WHEN** la suite inicia sesión, visita el panel y cierra sesión
- **THEN** las cachés de páginas y payloads de navegación quedan vacías y el
  contenido autenticado no reaparece al volver a abrir la ruta sin conexión
