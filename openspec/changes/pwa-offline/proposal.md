# Proposal

## Why

La plataforma se usa en el sitio del evento, desde celulares con señal
intermitente, y hoy no es instalable ni abre sin red: si la conexión se cae, el
navegador muestra su página de error y se pierde incluso la posibilidad de
consultar información ya vista. `CONTEXT.md` §4 ya define el comportamiento
esperado ("se puede ver la app sin conexión, registrar requiere internet") y
`CONTRIBUTING.md` lo deja como pendiente de Persona B; este change lo convierte
en un contrato verificable sin agregar sincronización offline.

## What Changes

- Agregar un **manifest** y un juego de iconos para que la app sea instalable
  como PWA (pantalla de inicio, modo `standalone`, color institucional).
- Registrar un **service worker propio**, sin dependencias nuevas, que cachee el
  shell y las páginas ya visitadas (HTML y payloads RSC) y los assets estáticos.
- Servir una **página `/offline`** cuando no haya copia de la ruta pedida, y un
  **aviso global de conectividad** que explique que la app está en modo lectura.
- Mantener **todas las escrituras solo por red**: sin IndexedDB, sin colas ni
  reintentos diferidos; los formularios muestran un mensaje claro al intentar
  guardar sin conexión.
- Ofrecer un **botón permanente de instalación en la barra institucional**, con
  un diálogo que usa el prompt nativo en Android/Chrome, muestra instrucciones
  manuales cuando no hay prompt y explica el flujo de Compartir en iOS.
- Aplicar **actualizaciones automáticas** del service worker, con limpieza de
  cachés de versiones anteriores y sin recargar la pestaña en curso.
- **Protección de datos en caché:** no se cachean endpoints `/api/*`, las
  cachés de documentos vencen a las 24 horas y se limpian al iniciar y cerrar
  sesión; el contenido servido sin red se identifica como guardado.
- Ajustar **headers y CSP** para el service worker (`worker-src 'self'` y
  `/sw.js` sin caché HTTP) y declarar el `theme-color` institucional.
- Documentar el **procedimiento de rollback** (service worker de baja) y
  actualizar `CONTEXT.md` y `CONTRIBUTING.md`.

## Capabilities

### New Capabilities

- `plataforma/pwa`: instalación, manifest e iconos, registro y ciclo de vida del
  service worker, visualización sin conexión de páginas visitadas, página
  offline, acceso a la instalación desde la barra, actualización automática y
  límites de caché.

### Modified Capabilities

- `plataforma/seguridad`: se agrega `worker-src 'self'` a la CSP, se sirve
  `/sw.js` con `Cache-Control: no-cache` y se exige que el service worker no
  cachee respuestas de API ni datos de firma.
- `plataforma/testing`: se agregan pruebas end-to-end del manifest, del registro
  del service worker, de la navegación sin conexión y de la limpieza de cachés
  al cerrar sesión.

## Impact

- **Código nuevo:** `src/app/manifest.ts`, `src/app/offline/page.tsx`,
  `src/app/error.tsx`, `public/sw.js`, iconos en `public/icons/`, componentes
  de registro, conectividad e instalación en `src/components/pwa/` y utilidades
  en `src/lib/pwa/`.
- **Código modificado:** `src/app/layout.tsx` (metadata, avisos globales y registro),
  `src/app/login/login-form.tsx` y `src/components/admin/boton-cerrar-sesion.tsx`
  (limpieza de cachés), mensajes de error de los formularios públicos,
  `next.config.ts` (headers y CSP) y `tests/e2e/` (nueva suite).
- **Sin cambios** en `prisma/schema.prisma`, migraciones, reglas de cupo,
  checkpoints, roles ni en el contrato de los Route Handlers existentes.
- **Sin dependencias nuevas.** No se usa Serwist/next-pwa, IndexedDB,
  Background Sync ni la bandera experimental `useOffline` de Next.
- **Despliegue:** el `public/sw.js` ya viaja en la imagen standalone (el
  Dockerfile copia `public/`); en Vercel se sirve como asset estático. El
  service worker requiere HTTPS, con la excepción de `localhost`.
- **Riesgo asumido:** las páginas autenticadas visitadas quedan en la caché del
  dispositivo hasta 24 horas o hasta cerrar sesión. Es el trade-off elegido para
  poder consultarlas sin red; se mitiga no cacheando API, limpiando cachés en
  los cambios de sesión y avisando que el contenido es guardado.
