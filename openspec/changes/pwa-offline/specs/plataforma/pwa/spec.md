# Spec Delta

## Purpose

Permite instalar la plataforma como aplicación y consultar sin conexión las
páginas ya visitadas, manteniendo todas las escrituras dependientes de la red y
sin dejar datos sensibles en la caché del dispositivo.

## ADDED Requirements

### Requirement: Instalación como aplicación

El sistema SHALL publicar un manifest de aplicación con nombre y nombre corto
"Eventos SENA", descripción, `start_url`, alcance, `display: standalone`, idioma
`es`, `theme_color` institucional (`#25A200`) e iconos de 192×192 y 512×512,
incluido uno `maskable`. El documento SHALL declarar el manifest, el
`theme-color` y los metadatos equivalentes para iOS. Los iconos SHALL servirse
con el tamaño que declaran y el icono `maskable` SHALL mantener el logo dentro
de la zona segura sobre el fondo institucional. La instalación SHALL funcionar
sobre HTTPS y en `localhost`.

#### Scenario: Manifest e iconos disponibles

- **WHEN** un navegador solicita el manifest de la aplicación
- **THEN** recibe un documento válido con `display: standalone`, los iconos
  192×192 y 512×512 (uno `maskable`) y el `theme_color` institucional, y cada
  icono responde con el tamaño declarado

#### Scenario: Instalación en Android o escritorio

- **WHEN** una persona abre la aplicación en un navegador compatible sobre HTTPS
- **THEN** el navegador la reconoce como instalable y permite agregarla a la
  pantalla de inicio con el nombre corto "Eventos SENA" y el icono de la
  plataforma

#### Scenario: Instalación en iOS

- **WHEN** una persona abre la aplicación en Safari de iOS
- **THEN** el documento incluye el icono `apple-touch-icon`, el título de la app
  y la declaración de modo `standalone` para "Agregar a inicio"

### Requirement: Acceso a la instalación desde la barra institucional

El sistema SHALL mostrar un botón de instalación en la barra institucional
global, junto al selector de tema, en todas las rutas —incluidas `/admin` y
`/operador`— mientras la aplicación no se esté ejecutando en modo instalado y
el navegador ofrezca algún mecanismo de instalación. El botón SHALL tener un
nombre accesible, funcionar con teclado y abrir un diálogo accesible. El diálogo
SHALL ofrecer la acción "Instalar app" cuando exista un prompt nativo capturado;
en iOS SHALL mostrar instrucciones "Compartir → Agregar a inicio"; en
navegadores Chromium que permitan instalar pero no expongan el prompt en ese
momento SHALL mostrar instrucciones para hacerlo desde el menú del navegador,
sin un botón inerte. Cerrar el diálogo SHALL NOT ocultar ni deshabilitar el
botón. El sistema SHALL ocultar el botón cuando la aplicación ya esté instalada
o cuando el navegador no ofrezca instalación (por ejemplo, Firefox, Safari de
escritorio o un navegador embebido). El botón SHALL NOT depender de un descarte
temporal: la opción SHALL seguir disponible en visitas posteriores mientras la
app no esté instalada.

#### Scenario: Botón visible en rutas públicas y paneles

- **WHEN** una persona sin la app instalada abre `/login`, `/admin` o
  `/operador` en un navegador que permite instalar
- **THEN** ve el botón de instalación en la barra institucional y puede abrir su
  diálogo con teclado o puntero

#### Scenario: Instalación desde Android o Chrome

- **WHEN** una persona sin la app instalada abre una ruta en un navegador que
  expone el prompt de instalación, pulsa el botón y usa "Instalar app"
- **THEN** se abre el prompt nativo del navegador

#### Scenario: Instrucciones en iOS

- **WHEN** una persona sin la app instalada abre una ruta en Safari de iOS y
  pulsa el botón
- **THEN** el diálogo muestra instrucciones para instalarla desde el menú
  Compartir y no un botón que no puede funcionar

#### Scenario: Instrucciones manuales en Chrome o Edge sin prompt

- **WHEN** una persona sin la app instalada abre una ruta en Chrome o Edge, el
  navegador no expone el prompt nativo en ese momento y pulsa el botón
- **THEN** el diálogo muestra instrucciones para instalar desde el menú del
  navegador y no un botón "Instalar app" que no pueda funcionar

#### Scenario: Cerrar el diálogo no oculta el botón

- **WHEN** una persona abre el diálogo y lo cierra sin instalar
- **THEN** el botón sigue disponible en la barra y puede volver a abrir el
  diálogo, sin un descarte de 30 días

#### Scenario: Botón oculto si ya está instalada

- **WHEN** la aplicación se ejecuta en modo `standalone` o equivalente de iOS
- **THEN** el botón de instalación no se renderiza en ninguna ruta

#### Scenario: Navegador sin instalación disponible

- **WHEN** el navegador no ofrece instalación (por ejemplo, Firefox, Safari de
  escritorio o un navegador embebido)
- **THEN** el botón no se muestra y no queda un botón inerte en pantalla

#### Scenario: Instalación completada

- **WHEN** el navegador completa la instalación de la aplicación
- **THEN** el botón y el diálogo de instalación desaparecen sin recargar la
  página

### Requirement: Service worker y actualización automática

El sistema SHALL registrar un service worker en producción desde la raíz del
origen, con comprobación de actualización sin caché HTTP, y SHALL NOT registrarlo
en el entorno de desarrollo. En la instalación SHALL precachear la página
`/offline`, el manifest, los iconos y el logo institucional. Una versión nueva
SHALL activarse automáticamente sin dejar al service worker anterior en espera,
sin recargar la pestaña en curso y eliminando las cachés de versiones anteriores.
Las cachés SHALL tener nombres versionados.

#### Scenario: Registro en producción

- **WHEN** una persona carga la aplicación desde un build de producción sobre
  HTTPS o `localhost`
- **THEN** el service worker queda registrado con alcance de raíz y controla las
  navegaciones posteriores

#### Scenario: Actualización sin recargar

- **WHEN** se publica una versión nueva del service worker mientras hay una
  pestaña abierta
- **THEN** la versión nueva se activa en el siguiente arranque o navegación sin
  recargar la pestaña ni interrumpir un formulario en curso

#### Scenario: Limpieza de cachés anteriores

- **WHEN** una versión nueva del service worker se activa
- **THEN** las cachés de versiones anteriores se eliminan y solo quedan las de
  la versión vigente

#### Scenario: Desarrollo sin service worker

- **WHEN** la aplicación corre con el servidor de desarrollo
- **THEN** no se registra el service worker y la recarga en caliente sigue
  funcionando con normalidad

### Requirement: Navegación sin conexión de páginas visitadas

El sistema SHALL guardar una copia del HTML y del payload de navegación de las
páginas que la persona haya visitado y SHALL servirlas cuando la red falle o no
responda en un tiempo acotado, tanto en una recarga completa como en una
navegación interna de la aplicación. Los assets estáticos versionados SHALL
servirse primero desde la caché. Cuando no exista una copia vigente de la ruta
solicitada, el sistema SHALL mostrar la página `/offline` con un mensaje que
explique que se necesita conexión. Una copia de página SHALL considerarse
vigente durante 24 horas; pasado ese plazo SHALL tratarse como inexistente. El
sistema SHALL NOT cachear respuestas de `/api/*`.

#### Scenario: Recarga de una página visitada

- **WHEN** una persona recarga sin conexión una página que ya había visitado
- **THEN** ve la copia guardada de esa página con el aviso de que está sin
  conexión y el contenido puede estar desactualizado

#### Scenario: Navegación interna sin conexión

- **WHEN** una persona navega dentro de la aplicación sin conexión hacia una
  página que ya había visitado
- **THEN** la navegación se resuelve con la copia guardada, sin mostrar la
  página de error del navegador

#### Scenario: Ruta nunca visitada

- **WHEN** una persona abre sin conexión una ruta para la que no hay copia
- **THEN** ve la página `/offline` con el mensaje de que se necesita conexión

#### Scenario: Redirección no se guarda bajo la ruta original

- **WHEN** una persona autenticada abre `/` y el servidor la redirige a
  `/admin`
- **THEN** la copia queda asociada a `/admin` y una apertura posterior sin
  conexión de `/` no muestra el panel, sino la página `/offline`

#### Scenario: Copia vencida

- **WHEN** la única copia disponible de una página tiene más de 24 horas
- **THEN** el sistema la descarta y muestra la página `/offline`

#### Scenario: Assets estáticos sin conexión

- **WHEN** una página guardada se abre sin conexión
- **THEN** sus estilos, tipografías y scripts versionados se cargan desde la
  caché y la página se renderiza con la apariencia institucional

### Requirement: Aviso de conectividad y escrituras sin red

El sistema SHALL mostrar un aviso global, anunciado a tecnologías de asistencia,
cuando el navegador informe que no hay conexión, indicando que la app está en
modo lectura y que guardar requiere internet, y SHALL ocultarlo al recuperar la
conexión. Un intento de escritura sin conexión SHALL impedirse con un mensaje
claro y SHALL NOT persistir datos ni encolarse para más tarde. Los formularios
públicos de inscripción y autoregistro SHALL distinguir el fallo de conexión de
un error de validación o de negocio.

#### Scenario: Aviso al perder la conexión

- **WHEN** el navegador pasa a estado sin conexión
- **THEN** aparece un aviso global que explica que solo se puede consultar y que
  registrar o guardar requiere internet

#### Scenario: Aviso al recuperar la conexión

- **WHEN** el navegador recupera la conexión
- **THEN** el aviso global desaparece sin recargar la página

#### Scenario: Intento de guardar sin conexión

- **WHEN** una persona intenta enviar un formulario de escritura sin conexión
- **THEN** el sistema no envía la petición, muestra un mensaje de que necesita
  conexión y no guarda ni deja pendiente ningún dato para reintentar después

#### Scenario: Inscripción o autoregistro sin conexión

- **WHEN** una persona envía la inscripción pública o el autoregistro de un
  checkpoint sin conexión
- **THEN** el formulario muestra un mensaje específico de falta de conexión y no
  se crea ninguna inscripción ni registro de asistencia

### Requirement: Protección de datos en la caché

El sistema SHALL NOT cachear respuestas de `/api/*` —incluida la ruta que sirve
la firma—, peticiones que no sean `GET` ni respuestas del flujo de
autenticación. Las cachés de páginas y payloads de navegación SHALL limpiarse al
iniciar sesión y al cerrarla, de modo que una persona no vea contenido de otra
sesión; las cachés de assets estáticos pueden conservarse. El contenido servido
sin conexión SHALL identificarse como guardado y potencialmente desactualizado.

#### Scenario: Firma y API fuera de la caché

- **WHEN** el Administrador abre el visor de firma o cualquier endpoint de la API
- **THEN** la respuesta no se guarda en la caché del service worker y no queda
  disponible sin conexión

#### Scenario: Cierre de sesión limpia el contenido

- **WHEN** una persona cierra sesión
- **THEN** las cachés de páginas y payloads de navegación se eliminan antes de
  volver al login, y el contenido autenticado ya no puede abrirse sin conexión

#### Scenario: Inicio de sesión limpia el contenido anterior

- **WHEN** una persona inicia sesión en un dispositivo que tenía páginas
  guardadas de una sesión anterior
- **THEN** las cachés de páginas y payloads anteriores se eliminan antes de
  entrar al panel

#### Scenario: Contenido guardado identificado

- **WHEN** se muestra una página servida desde la caché sin conexión
- **THEN** la persona ve un aviso de que el contenido es una copia guardada y
  puede estar desactualizado
