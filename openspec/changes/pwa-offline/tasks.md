# Tasks

## 1. Manifest, iconos y metadata

- [x] 1.1 Generar desde `public/logo-sena.png` los iconos `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` y `apple-touch-icon.png` (180×180) sobre fondo `#25A200`, con el logo al ~70 % en el maskable; verificar dimensiones, formato y que el maskable deje la zona segura libre.
- [x] 1.2 Crear `src/lib/pwa/constantes.ts` con nombre, colores, nombres de caché, TTL de 24 h y límite de 40 documentos; verificar con `npx tsc --noEmit`. Las rutas y claves del aviso contextual se retiran en 10.3.
- [x] 1.3 Crear `src/app/manifest.ts` con `name`, `short_name`, `description`, `start_url`, `scope`, `id`, `display: standalone`, `lang: es`, `theme_color`/`background_color` institucionales e iconos 192/512/maskable; verificar que `/manifest.webmanifest` responde 200 con JSON válido y los iconos declarados existen.
- [x] 1.4 Actualizar `src/app/layout.tsx` con `metadata.manifest`, `metadata.icons`, `metadata.appleWebApp` y `viewport.themeColor`; verificar en el HTML que aparecen el `<link rel="manifest">`, el `theme-color` y el `apple-touch-icon`.

## 2. Service worker y cachés

- [x] 2.1 Crear `public/sw.js` con `VERSION`, `install` que precachee `/offline`, manifest, iconos, logo y los chunks `/_next/static/` referenciados por `/offline`, y `activate` que borre cachés `pwa-*` de otras versiones y llame a `clients.claim()`; verificar en DevTools que las cachés esperadas existen y no quedan las viejas.
- [x] 2.2 Implementar en `public/sw.js` las estrategias de D3: red-primero con timeout de 3 s para navegaciones HTML y RSC (normalizando `_rsc`), caché-primero para assets versionados, stale-while-revalidate para manifest/imágenes y solo-red para `/api/*`, no-GET y autenticación; verificar con la pestaña Network en modo offline y online.
- [x] 2.3 Implementar en `public/sw.js` el guardado de solo respuestas 200 menores a 2 MB, el header `x-pwa-guardado-en`, el descarte de copias de más de 24 h, el límite de 40 entradas y el `postMessage` de copia servida; verificar con pruebas manuales de expiración simulada y con `caches.keys()`/`cache.keys()`.
- [x] 2.4 Excluir los prefetch (`Next-Router-Prefetch: 1`) del caché y verificar que una navegación real sí queda guardada y una prefetch no.

## 3. Headers, CSP y proxy

- [x] 3.1 Agregar `worker-src 'self'` a la CSP y una entrada de headers para `/sw.js` con `Cache-Control: no-cache, no-store, must-revalidate` en `next.config.ts`; verificar con `curl -I` sobre el build de producción.
- [x] 3.2 Excluir `sw.js`, `manifest.webmanifest`, `icons/` y `favicon.ico` del matcher de `src/proxy.ts`; verificar que las rutas públicas siguen respondiendo y que `/admin` y `/operador` conservan su redirección.

## 4. Página offline y avisos de conectividad

- [x] 4.1 Crear `src/app/offline/page.tsx` con título "Sin conexión", explicación de modo lectura, enlace al inicio y botón "Reintentar" (client component mínimo); verificar que abre sin sesión, sin base de datos y con los tokens de ambos temas.
- [x] 4.2 Crear `src/components/pwa/aviso-conectividad.tsx` con `useSyncExternalStore` sobre `online`/`offline` y el mensaje de copia guardada al recibir `pwa-cache-hit`; montarlo en `src/app/layout.tsx` y verificar que aparece y desaparece al alternar la red.
- [x] 4.3 Crear `src/components/pwa/guarda-escrituras.tsx`, montarlo en el layout y verificar que sin conexión intercepta el `submit` en captura, no ejecuta el handler del formulario y muestra el mensaje de que se necesita conexión.
- [x] 4.4 Crear `src/app/error.tsx` con mensaje de conexión y "Reintentar" cuando `navigator.onLine` es falso; verificar forzando un fallo de red en una Server Action.
- [x] 4.5 Ajustar los mensajes de error de `form-inscripcion.tsx`, `form-autoregistro.tsx`, `form-registro-manual.tsx`, `boton-cancelar-inscripcion.tsx` y `form-asignar-habitacion.tsx` para distinguir la falta de conexión; verificar cada flujo sin red y que no se persiste nada.

## 5. Instalación (implementación inicial)

> 5.1, 5.2 y 5.4 describen el aviso contextual que se retiró en la revisión de
> UX. La sección 10 define el botón permanente de la franja y elimina esa
> implementación; 5.3 (registrador del service worker) sigue vigente.

- [x] 5.1 Crear `src/components/pwa/aviso-instalacion.tsx` con la lógica de D7 (rutas públicas, `beforeinstallprompt`, instrucciones iOS y manuales en Chromium, standalone, descarte de 30 días, oculto sin mecanismo); montarlo en el layout y verificar que no aparece en `/admin` ni `/operador`.
- [x] 5.2 Verificar el aviso en Chromium con el prompt simulado, en una emulación de iOS y en modo `standalone`; confirmar que el botón dispara el prompt y que el descarte persiste tras recargar.
  - Verificado el 2026-11-02 sobre el build de producción en `:3200`: con `beforeinstallprompt` simulado el aviso aparece y "Instalar app" llama a `prompt()`; con UA de iPhone 13 se muestran las instrucciones de Compartir y no hay botón inerte; tras "Ahora no" el aviso no reaparece al recargar; con `display-mode: standalone` simulado no se muestra. 6/6 comprobaciones manuales en verde.
- [x] 5.3 Crear `src/components/pwa/registrador-pwa.tsx` y montarlo en el layout para registrar `/sw.js` solo en producción con `scope: "/"` y `updateViaCache: "none"`; verificar que en `next dev` no se registra y en el build de producción sí.
- [x] 5.4 Corregir la dependencia exclusiva de `beforeinstallprompt`: en Chrome/Edge sin prompt nativo mostrar instrucciones manuales, ocultar el aviso tras un intento de instalación y mantenerlo oculto en navegadores sin mecanismo; verificar con pruebas unitarias y e2e.

## 6. Privacidad y sesión

- [x] 6.1 Crear `src/lib/pwa/caches.ts` con `limpiarCachesDocumentos()` (solo `pwa-docs-*`); verificar que conserva `pwa-assets-*`.
- [x] 6.2 Invocar la limpieza al montar `src/app/login/login-form.tsx` y antes de `signOut` en `src/components/admin/boton-cerrar-sesion.tsx`; verificar con `caches.keys()` que tras cerrar sesión no queda contenido autenticado.

## 7. Pruebas

- [x] 7.1 Crear `tests/integration/pwa.test.ts` para las funciones puras de vencimiento de 24 h, normalización de URL RSC, nombres de caché y decisión de visibilidad del botón de instalación; verificar con `npm test`.
- [x] 7.2 Crear `tests/e2e/pwa.spec.ts` con manifest/iconos, registro del service worker, recarga offline de una página visitada, ruta nunca visitada, escritura bloqueada sin persistencia y limpieza de cachés al cerrar sesión; verificar con `npm run test:e2e`.
  - Resultado: suite E2E completa **25/25 en verde**, incluidos los 7 escenarios de `pwa.spec.ts`.
- [x] 7.3 Verificar manualmente en un build de producción (Docker o `npm run build && npm start`) la recarga offline de admin y operador, la página `/offline`, la instalación en Chrome y las instrucciones de iOS; documentar el resultado real.
  - Verificado el 2026-11-02 con el build de producción servido en `:3200` sobre `bienestar_sena_test`: `/admin` y `/operador` recargan sin conexión y muestran el aviso de copia guardada; `/offline` se sirve desde caché; el prompt de Chrome y las instrucciones de iOS se validaron con el aviso simulado (la instalación real desde la UI del navegador no es automatizable). La verificación del botón de la franja se hace en 10.5. 6/6 comprobaciones manuales en verde.

## 8. Documentación

- [x] 8.1 Actualizar `CONTEXT.md` §4, §6 y §11 con el alcance real (páginas visitadas, TTL 24 h, limpieza por sesión, nada de API, sin IndexedDB) y `CONTRIBUTING.md` §8 para retirar PWA/offline de pendientes; verificar que no contradicen `openspec/specs/plataforma/pwa/spec.md`.
- [x] 8.2 Dejar documentado en `public/sw.js` o en `CONTEXT.md` el procedimiento de baja del service worker (desregistrar + borrar cachés) para el rollback; verificar que el script de baja es copiable y no depende de la app.

## 9. Verificación final

- [x] 9.1 Ejecutar `npm run lint` y `npx tsc --noEmit`; confirmar que terminan sin errores.
  - Resultado: ambos comandos terminan sin errores ni advertencias.
- [x] 9.2 Ejecutar `npm test` y `npm run test:e2e`; confirmar los resultados reales y que las pruebas existentes siguen en verde.
  - Resultado: `npm test` 13 archivos / 83 pruebas en verde; `npm run test:e2e` 25/25 en verde.
- [x] 9.3 Ejecutar `npm run build`; confirmar que el build de producción termina y que `.next/standalone` incluye `public/sw.js`, el manifest y los iconos.
  - Resultado: build de producción correcto; `/manifest.webmanifest` y `/offline` quedan estáticos y el servidor standalone sirve `sw.js`, el manifest y los iconos.
- [x] 9.4 Revisar el diff completo contra los specs: sin cambios en `prisma/schema.prisma`, migraciones, cupos, checkpoints, roles ni en las respuestas de los Route Handlers; verificar que no se agregaron dependencias a `package.json`.
  - Resultado: `git diff -- package.json prisma/schema.prisma` vacío; el cambio se limita a PWA, avisos, guardia de escrituras y documentación.

## 10. Acceso permanente desde la barra institucional

- [x] 10.1 Crear `src/components/pwa/boton-instalacion.tsx` y montarlo en `FranjaInstitucional`: botón con icono `Download`, nombre accesible, visible en todas las rutas mientras la app no esté instalada y el navegador permita instalar; oculto en `standalone`, Firefox, Safari de escritorio y navegadores embebidos.
- [x] 10.2 Construir el diálogo de instalación con Base UI: título, texto, "Instalar app" cuando haya prompt, instrucciones manuales en Chromium sin prompt e instrucciones de Compartir en iOS; cerrar no oculta el botón.
- [x] 10.3 Retirar `AvisoInstalacion` del layout y eliminar el aviso contextual, las rutas de aviso, el descarte de 30 días y `instalacionSolicitada` de `src/lib/pwa/instalacion.ts`, `src/components/pwa/use-estado-instalacion.ts` y `src/lib/pwa/constantes.ts`.
- [x] 10.4 Actualizar `tests/integration/pwa.test.ts` y `tests/e2e/pwa.spec.ts`: visibilidad en rutas públicas, `/admin` y `/operador`, apertura del diálogo, prompt/instrucciones, cierre sin ocultar, oculto en `standalone` y sin soporte; verificar con `npm test` y `npm run test:e2e`.
  - Resultado: `npm test` 13 archivos / 83 pruebas en verde; `npm run test:e2e` **32/32** en verde con build limpio (`CI=1`), incluidos los escenarios nuevos del botón y el diálogo.
- [x] 10.5 Ejecutar `npm run lint`, `npx tsc --noEmit`, `openspec validate pwa-offline --strict` y una prueba manual en Chrome real; confirmar que el icono se ve en la franja y que el prompt/instrucciones funcionan.
  - Resultado: lint, `tsc` y `openspec validate` sin errores. En Chrome 156 real (headless) sobre el build de producción en `:3100` el botón aparece en la franja y el diálogo muestra las instrucciones manuales cuando no hay prompt; captura en `C:\Users\jhona\AppData\Local\Temp\opencode\boton-instalacion.png`. El prompt nativo se cubre con el evento simulado en E2E.
- [x] 10.6 Actualizar `CONTEXT.md` para reemplazar el aviso contextual por el botón permanente de la franja y verificar que no queden referencias al descarte de 30 días.
  - Resultado: `CONTEXT.md` describe el botón permanente; no quedan referencias al aviso contextual ni al descarte en ese archivo.
