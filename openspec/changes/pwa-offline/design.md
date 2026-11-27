# Design

## Context

Ver `proposal.md` — Why. El estado actual que condiciona el diseño:

- Next.js 16.3 con `output: "standalone"`; el `Dockerfile` copia `public/` al
  runtime y `tests/e2e/servidor.mjs` hace lo mismo para la suite, así que un
  `public/sw.js` está disponible en ambos entornos.
- `src/app/layout.tsx` es un Server Component estático que monta la franja y el
  proveedor de tema; no lee cookies ni base de datos. Es el único punto global
  donde colgar el registro del service worker y los avisos.
- La CSP se define estática en `next.config.ts` y permite `'unsafe-inline'` en
  scripts y estilos; no usa nonces. `worker-src` no está declarado y hoy
  heredaría de `script-src`.
- `src/proxy.ts` valida el JWT en Edge/Node y protege `/admin` y `/operador`.
  Las páginas protegidas son dinámicas; el service worker las sirve desde caché
  solo cuando la red falla.
- Los formularios usan dos mecanismos: Server Actions (`login`,
  `cambiar-clave`, casi todo el panel admin y el toggle del operador) y
  `fetch` con `try/catch` (inscripción, autoregistro, registro manual,
  cancelación, asignación de habitación). Los dos deben fallar de forma legible
  sin conexión.
- `CONTEXT.md` §4 y §11 prohíben IndexedDB, Background Sync y colas de
  reintento; el offline es solo cachear el shell y lo visitado.
- La suite E2E ya corre contra un build de producción en `:3100` y el navegador
  Chromium permite service workers; es el entorno natural para verificar el
  comportamiento offline.
- El change `rediseno-visual-temas` está en curso y toca el layout y las
  páginas. Este change agrega componentes nuevos y edita el layout lo mínimo
  (metadata y los componentes globales de PWA), usando los tokens existentes
  para no duplicar estilos.

## Goals / Non-Goals

**Goals:**

- Instalación real como PWA (manifest, iconos, modo `standalone`) sin
  dependencias nuevas.
- Abrir sin red la app y las páginas ya visitadas, incluido el panel
  autenticado, con aviso de contenido guardado.
- Actualización automática y silenciosa del service worker.
- Que ninguna escritura se pierda en silencio ni se encole: sin red se avisa y
  se requiere reintento manual.
- Acotar la retención de datos personales en caché (24 h, limpieza por sesión,
  nada de API).

**Non-Goals:**

- Offline-first, IndexedDB, Background Sync, colas de reintento o resolución de
  conflictos.
- Push notifications, notificaciones locales, sincronización en segundo plano.
- Cachear `/api/*`, firmas, reportes o respuestas de autenticación.
- Apps nativas, App Store/Play Store, o un flujo de instalación propio por rol;
  el acceso vive en la franja global.
- Un prompt propio de "nueva versión": la actualización es automática.
- Un precache manifiesto generado en el build con todos los chunks de Next.

## Decisions

### D1: Service worker propio en `public/sw.js`, sin dependencias

Se escribe un service worker plano (~250 líneas) en `public/sw.js`. No se usa
Serwist/next-pwa/Workbox porque agregan una dependencia, un paso de build y una
capa de configuración que hoy no existe, y su integración con Turbopack/Next 16
no está garantizada. Tampoco se usa `experimental.useOffline` de Next: la guía
instalada aclara que solo cubre navegaciones suaves y Server Actions, y que una
recarga completa sin red sigue necesitando un service worker
(`node_modules/next/dist/docs/01-app/02-guides/offline-support.md`, nota de la
línea 139). El service worker propio da control total sobre qué se cachea, que
es justamente la decisión sensible de privacidad.

**Alternativa descartada:** Workbox/Serwist con precache manifiesto. Resolvería
el versionado de chunks, pero introduce `package.json`, build hooks y una
superficie de configuración nueva; el runtime caching cubre el caso de uso.

### D2: Registro solo en producción, desde un componente cliente del layout

`RegistradorPwa` se monta en `src/app/layout.tsx` y en `useEffect` registra
`/sw.js` con `{ scope: "/", updateViaCache: "none" }` únicamente cuando
`process.env.NODE_ENV === "production"`. En desarrollo no se registra: el
service worker cachearía bundles de HMR y produciría recargas fantasma. La
verificación manual offline se hace con `npm run build` + `npm start` o con el
contenedor, nunca con `next dev`.

**Alternativa descartada:** registrar siempre y desregistrar en desarrollo.
Deja un service worker residual en el navegador de quien haya corrido dev y
complica el diagnóstico.

### D3: Estrategia de caché por tipo de petición

| Petición | Estrategia | Caché |
|---|---|---|
| Navegación (`mode === "navigate"`) | Red primero, timeout 3 s, respaldo en caché; si no hay, `/offline` | `pwa-docs-<versión>` |
| Navegación interna RSC (`RSC: 1`, sin `Next-Router-Prefetch`) | Red primero, timeout 3 s, respaldo en caché normalizada (se quita `_rsc`) | `pwa-docs-<versión>` |
| `/_next/static/*`, fuentes, iconos, logo | Caché primero; son URLs versionadas o assets estables | `pwa-assets-<versión>` |
| Manifest, `favicon.ico` | Stale-while-revalidate | `pwa-assets-<versión>` |
| Imágenes de `/_next/image` | Stale-while-revalidate | `pwa-assets-<versión>` |
| `/api/*`, cualquier método distinto de `GET`, `/api/auth/*` | Solo red; nunca se guarda | — |
| Cualquier otro GET del mismo origen | Stale-while-revalidate | `pwa-assets-<versión>` |

Reglas adicionales:

- Solo se consideran respuestas `200` (y `type === "basic"`). No se guardan
  respuestas de más de 2 MB, redirecciones ni respuestas con `Set-Cookie`: una
  redirección de `/` hacia `/admin` no puede quedar guardada bajo `/`, porque
  otra persona la abriría sin sesión.
- Si `fetch` sigue una redirección, la respuesta se guarda bajo
  `response.url` (la URL final), nunca bajo la URL original. Por eso una
  navegación sin red a `/` cae en `/offline` aunque existan copias de `/admin` o
  `/operador`.
- Los payloads de **prefetch** (`Next-Router-Prefetch: 1`) no se cachean: son
  parciales y no representan la página completa. La navegación real sí se
  cachea.
- La URL de caché de RSC normaliza `_rsc`; el resto de query params (por
  ejemplo `eventoId`) se conserva.
- En navegaciones, si la red responde después del timeout y se sirvió caché, la
  respuesta de red se guarda en segundo plano (`event.waitUntil`).
- El timeout de 3 s evita que una wifi de evento que "existe" pero no responde
  deje la pantalla congelada; si se sirvió caché, el aviso de conectividad
  explica que es una copia guardada.

**Alternativa descartada:** cache-first para HTML. Mostraría contenido viejo
incluso con red disponible y rompería la autoridad del proxy de autenticación.

**Alternativa descartada:** red sin timeout. En el sitio del evento una red
degradada puede colgar la navegación indefinidamente.

### D4: Cachés de documentos con vencimiento, límite y limpieza por sesión

- Nombres versionados: `pwa-docs-<VERSION>` y `pwa-assets-<VERSION>`.
- Al guardar un documento se le agrega el header `x-pwa-guardado-en` con el
  instante ISO. Al servirlo, si tiene más de 24 h se elimina y se trata como
  ausente. La constante de vencimiento vive en `src/lib/pwa/constantes.ts` y se
  prueba con una función pura.
- Máximo 40 entradas entre HTML y RSC; al superarlo se eliminan las más
  antiguas por orden de `cache.keys()`. El límite evita que un panel con muchas
  páginas consuma la cuota del dispositivo y reduce la exposición de datos.
- `limpiarCachesDocumentos()` borra solo `pwa-docs-*`; los assets se conservan
  porque no contienen datos personales. Se invoca al montar el login y antes de
  `signOut`. El montaje del login cubre también el aterrizaje tras cerrar
  sesión y el caso de sesión vencida que redirige al login.
- La página de login no queda disponible sin conexión: su propia copia la borra
  el montaje del login. Es deliberado —sin red no se puede autenticar— y es lo
  que permite que la caché quede vacía al cerrar sesión. El resto de páginas
  visitadas sí se conservan.

**Alternativa descartada:** sin TTL ni límite. Es más simple, pero deja
inscripciones, documentos y paneles en el dispositivo indefinidamente.

**Trade-off asumido:** una sesión que vence sin pasar por el login conserva
copias hasta 24 h. Es el precio de poder consultar el panel sin red; se acota
con el TTL, no se cachea la API y se avisa que el contenido es guardado.

### D5: `/offline` estática y precache de sus propios chunks

La página `src/app/offline/page.tsx` es un Server Component sin base de datos ni
sesión. Muestra el logo, "Sin conexión", una explicación breve, un enlace a
`/` y un botón "Reintentar" (client component mínimo que llama a
`location.reload()`). Usa los tokens de tema para verse bien en claro y oscuro.

En `install`, el service worker:

1. Abre `pwa-assets-<VERSION>` y guarda `/offline`, `/manifest.webmanifest`,
   `/logo-sena.png`, `favicon.ico` y los iconos.
2. Descarga el HTML de `/offline`, extrae las URLs `/_next/static/...` de sus
   `<script>` y `<link>` y las guarda también. Así la página se ve con estilos
   incluso si la persona nunca navegó antes de quedar sin red. Si la extracción
   falla, la instalación no falla: el HTML queda guardado y los assets se
   completan en visitas posteriores.

**Alternativa descartada:** confiar en que los chunks del layout ya estén en la
caché. En una instalación nueva seguida de pérdida de red, la página saldría sin
estilos.

### D6: Aviso de conectividad y bloqueo de escrituras

- `AvisoConectividad` (cliente, en el layout) usa `useSyncExternalStore` sobre
  los eventos `online`/`offline`, con `navigator.onLine` como snapshot inicial y
  un fallback estable para el servidor (mismo patrón que `ProveedorTema`).
  Renderiza un `div` con `role="status"` y `aria-live="polite"` solo cuando está
  sin conexión: "Sin conexión. Puedes consultar páginas ya visitadas; para
  inscribir o registrar necesitas internet."
- El service worker hace `postMessage({ tipo: "pwa-cache-hit" })` a las
  pestañas cuando sirve un documento desde caché; el aviso agrega "Estás viendo
  una copia guardada y puede estar desactualizada."
- `GuardaEscriturasSinConexion` (cliente, en el layout) escucha `submit` en fase
  de captura. Si `navigator.onLine === false`, hace `preventDefault()`, no deja
  correr el handler del formulario y muestra en el aviso el mensaje "No se
  guardó: necesitas conexión para enviar." No deshabilita botones por
  `navigator.onLine` (da falsos negativos) y no bloquea la navegación.
- Para el caso "hay red pero el servidor no responde", se agrega
  `src/app/error.tsx` (cliente) que distingue el estado sin conexión y ofrece
  "Reintentar"; los `fetch` existentes de inscripción, autoregistro, registro
  manual, cancelación y habitaciones cambian su mensaje genérico por uno de
  conexión cuando corresponde.
- No hay cola: si la persona recupera la red, debe volver a enviar.

**Alternativa descartada:** envolver cada Server Action en un try/catch
individual. Son más de veinte formularios y el patrón se repetiría; el guardia
global cubre el caso "sin red" y el boundary cubre el fallo de red inesperado.

### D7: Acceso permanente a la instalación desde la franja institucional

`BotonInstalacion` se monta dentro de `FranjaInstitucional`, que es global, y
reemplaza el aviso contextual anterior. El botón usa el icono `Download` de
Lucide y se ubica junto al selector de tema, con `aria-label="Instalar la
aplicación"` y `title`; se muestra solo el icono para no competir con la marca.

- Se muestra en todas las rutas —incluidas `/admin` y `/operador`— mientras la
  app no esté instalada y el navegador ofrezca algún mecanismo de instalación.
- Se oculta si `matchMedia("(display-mode: standalone)").matches`, si
  `navigator.standalone === true`, si el navegador no permite instalar
  (Firefox, Safari de escritorio, Electron/WebView) o si `appinstalled` ya se
  disparó.
- Al pulsarlo abre un diálogo accesible con Base UI. El diálogo explica qué se
  instala y ofrece:
  - Android/Chrome/Edge con `beforeinstallprompt` capturado: botón "Instalar
    app" que llama a `prompt()` dentro del gesto de la persona.
  - Chromium sin prompt nativo en ese momento: instrucciones para instalar
    desde el menú del navegador o la barra de direcciones, sin un botón
    "Instalar app" inerte.
  - iOS/iPadOS: instrucciones "Compartir → Agregar a inicio", sin botón de
    instalación inerte.
- El evento se captura en un script inline del `<head>` y se guarda en
  `window.__pwaInstallPrompt`: Chrome puede dispararlo antes de que React
  hidrate y un listener montado en el cliente llegaría tarde. El hook lee esa
  copia al inicializar y también escucha el evento para las visitas nuevas.
- Cerrar el diálogo no oculta ni deshabilita el botón. No hay descarte de 30
  días ni estado `instalacionSolicitada`: el botón es la vía permanente y se
  reevalúa en cada carga. Si la app se instala con el diálogo abierto, el
  diálogo se cierra y el botón desaparece.
- No se puede abrir el prompt nativo si Chrome no lo emitió; en ese caso el
  diálogo muestra instrucciones verificables. Nunca queda un botón que no haga
  nada.

Se reemplaza el aviso contextual por un botón permanente en la franja para que
la opción no desaparezca tras un descarte y para reducir el ruido visual de un
banner. La franja ya es global, así que el acceso también cubre el panel admin y
el del operador; el costo es un icono más en la barra, no un bloque de
contenido.

**Alternativa descartada:** conservar el aviso contextual y agregar el botón.
Duplica la entrada, compite con la marca y deja dos estados de descarte que
pueden contradecirse.

**Alternativa descartada:** disparar `prompt()` directamente al pulsar el
icono. Ahorra un clic cuando el prompt existe, pero no permite explicar qué es
la app ni mostrar instrucciones cuando no hay prompt; además abre un diálogo
nativo sin contexto.

**Alternativa descartada:** mostrar el botón siempre aunque no haya mecanismo.
Sería un botón inerte o una instrucción imposible; es preferible ocultarlo.

### D8: Manifest, iconos y metadata

- `src/app/manifest.ts` con `MetadataRoute.Manifest`: `name` y `short_name`
  ("Eventos SENA"), `description`, `start_url: "/"`, `scope: "/"`,
  `id: "/"`, `display: "standalone"`, `lang: "es"`, `theme_color: "#25A200"`,
  `background_color: "#25A200"`, `categories` y los iconos.
- Iconos estáticos en `public/icons/`: `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` y `apple-touch-icon.png` (180×180). Se generan una vez
  desde `public/logo-sena.png` con `sharp` (ya presente en `node_modules` como
  dependencia opcional de Next) sobre fondo `#25A200`; el maskable deja el logo al ~70 %
  del lienzo para respetar la zona segura. Se commitean los PNG: no se agrega
  `sharp` ni un script de build al `package.json`.
- En `layout.tsx`: `metadata.manifest`, `metadata.icons`, `metadata.appleWebApp`
  y `export const viewport = { themeColor: "#25A200" }`. Se conserva el
  `favicon.ico` existente.
- `background_color` verde institucional: el splash y el icono comparten el
  mismo fondo y el logo no queda sobre un color ajeno a la marca.

**Alternativa descartada:** generar los iconos con `next/og`/`icon.tsx`. Es
dinámico, no permite declarar varios tamaños y el maskable requiere composición
propia; para cuatro assets estables, commitearlos es más simple.

### D9: Headers y CSP

- `next.config.ts` agrega `worker-src 'self'` a la CSP. No se agrega
  `manifest-src` porque `default-src 'self'` ya lo cubre.
- Se agrega una entrada de `headers()` para `/sw.js` con
  `Cache-Control: no-cache, no-store, must-revalidate`. Next sirve el archivo
  como JavaScript; no se necesita `Service-Worker-Allowed` porque el script está
  en la raíz y su alcance por defecto ya es `/`.
- `src/proxy.ts` excluye `sw.js`, `manifest.webmanifest`, `icons/` y
  `favicon.ico` del matcher: son assets públicos y no necesitan pasar por
  Auth.js.
- No se toca el resto de la CSP ni se introduce nonce.

### D10: Actualización automática y versionado

`public/sw.js` empieza con `const VERSION = "pwa-2"`. En `install` se precarga
lo de D5 y se llama a `self.skipWaiting()` para que la versión nueva no quede
esperando a que se cierren todas las pestañas; en `activate` se eliminan las
cachés `pwa-*` cuyo nombre no sea el de la versión actual y se llama a
`clients.claim()`. `skipWaiting` no recarga nada: la pestaña en curso conserva
su controlador anterior y la versión nueva atiende el siguiente arranque o
navegación, sin interrumpir un formulario ni un canvas de firma. El navegador
detecta el cambio de bytes del script en la siguiente comprobación (el header
`no-cache` lo garantiza).

La versión se incrementa cuando cambia la lógica de caché, el contrato de
nombres o un recurso precacheado que debe refrescarse de inmediato (por
ejemplo, el manifest con el nombre de la app). Un deploy puramente visual no
necesita incrementarla: el HTML es red-primero y los chunks llevan hash.

**Alternativa descartada:** aviso "nueva versión disponible" con recarga. Más
UI, más pruebas y un riesgo mayor de interrumpir un formulario.

### D11: Pruebas y documentación

- `tests/e2e/pwa.spec.ts` cubre manifest/iconos, registro del service worker,
  recarga offline de una página visitada, ruta nunca visitada, escritura
  bloqueada y limpieza de cachés al cerrar sesión. Usa `context.setOffline(true)`
  y `page.evaluate` sobre `caches`/`navigator.serviceWorker`.
- Un test de integración sin base de datos (`tests/integration/pwa.test.ts`)
  prueba las funciones puras: vencimiento de 24 h, normalización de URL RSC y
  decisión de visibilidad del botón de instalación.
- `CONTEXT.md` §4/§6/§11 y `CONTRIBUTING.md` §8 se actualizan para reflejar el
  alcance real (páginas visitadas, 24 h, limpieza por sesión, sin IndexedDB) y
  para retirar PWA/offline de pendientes.
- Verificación manual: build de producción en Docker, Chrome DevTools offline,
  instalación en Chrome de escritorio/Android e instrucciones en iOS.

## Risks / Trade-offs

- **HTML autenticado en caché tras vencer la sesión (30 días por defecto)** →
  TTL de 24 h, limpieza al montar login y al cerrar sesión, nada de API en caché
  y aviso de copia guardada. El riesgo residual queda documentado.
- **HTML guardado que referencia chunks de un deploy anterior** → los assets se
  cachean al visitarlos y los chunks con hash no se sobrescriben; si un chunk
  falta, la página puede renderizarse sin estilos. La página `/offline`
  precarga sus propios chunks para no depender de eso.
- **El service worker sirve una página protegida sin pasar por `proxy.ts`** →
  solo ocurre sin red o tras el timeout; con red gana la respuesta del servidor
  y el proxy sigue siendo la autoridad. La limpieza por sesión y el TTL acotan
  la ventana.
- **`navigator.onLine` reporta `false` con una red local disponible** → el
  guardia bloquea el envío y lo explica; no se pierde nada porque no hay cola y
  la persona puede reintentar al recuperar la conexión. No se deshabilitan
  botones de forma permanente.
- **Server Action que falla con red "presente" pero servidor inalcanzable** →
  `error.tsx` global con mensaje de conexión y "Reintentar"; los formularios
  `fetch` ya tienen su propio catch.
- **Un service worker viejo sigue activo si se elimina el archivo en un
  rollback** → el plan de rollback publica un `sw.js` de baja que se
  desregistra y borra las cachés, y se mantiene al menos un release.
- **Cuota de almacenamiento del dispositivo o expulsión de caché en iOS** → el
  límite de 40 documentos y 2 MB por respuesta reduce el consumo; si el
  navegador desaloja la caché, la app cae en `/offline`, nunca en un error.
- **Tests E2E con service worker y servidor reutilizado** → cada test parte de
  un contexto limpio y borra cachés; en CI el servidor y la base son nuevos. Los
  tests de offline corren contra el build de producción, no contra `next dev`.
- **El prompt de instalación no se dispara** (ya instalada, navegador sin
  soporte, criterios no cumplidos) → el botón se oculta si no hay mecanismo; si
  el navegador permite instalar pero no expone el prompt, el diálogo muestra
  instrucciones. Nunca queda un botón que no hace nada.
- **TTL de 24 h en eventos de varios días** → pasadas 24 h sin red, las páginas
  guardadas dejan de mostrarse y queda `/offline`; es el límite de privacidad
  elegido y no afecta a las escrituras, que igual requieren red.
- **Navegación interna sin RSC guardado** → si el router no cae por sí solo a
  una navegación completa sobre el HTML cacheado, el listener de `offline`
  convierte los clics de enlace en `location.assign`, que sí pasa por el
  service worker. La prueba E2E de navegación interna decide si ese refuerzo es
  necesario antes de dar la tarea por terminada.

## Migration Plan

- No hay migración de datos ni cambios de esquema.
- El despliegue es aditivo: manifest, iconos, `public/sw.js`, componentes y
  headers viajan en el mismo release. El `Dockerfile` ya copia `public/`; Vercel
  sirve los assets estáticos.
- Rollback: publicar un `public/sw.js` de baja que:
  1. borre todas las cachés `pwa-*`,
  2. se desregistre a sí mismo (`self.registration.unregister()`),
  3. recargue las pestañas controladas (`clients.matchAll` + `client.navigate`).
  Mantener ese archivo al menos un release antes de eliminarlo, porque un
  service worker ya instalado no desaparece solo porque el archivo deje de
  existir.
- Un rollback normal de la app (revertir el commit) no requiere tocar la base ni
  limpiar datos; el service worker de la versión anterior se actualiza solo.

## Open Questions

Ninguna que cambie el alcance, los specs o las tareas. La generación de iconos,
el TTL y el límite de caché quedan resueltos en este documento.
