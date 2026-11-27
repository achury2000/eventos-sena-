# Design — Rate limiting y headers de seguridad

## D1. El límite vive en el punto de entrada, no en el proxy

`CONTEXT.md` §6 dice "en `middleware.ts` (Edge, global): validar sesión de
Auth.js (JWT y rol), y rate limiting con Upstash Redis". Tomado al pie de la
letra, el rate limiting iría en `src/proxy.ts`.

No se hizo así, por una razón concreta: **el login no pasa por el proxy como
ruta identificable.** El login es una Server Action (`src/lib/actions/auth.ts`
llama a `signIn`), y las Server Actions se invocan con `POST` sobre la página
que las monta, no sobre una URL propia. En el proxy, un `POST /login` es
indistinguible de cualquier otra cosa que llegue a `/login`, y el contador se
contaminaría entre intentos de login y navegación normal.

Las otras dos sí son Route Handlers con URL propia
(`/api/inscripciones`, `/api/checkpoints/[token]/registro`) y podrían
rate-limitarse en el proxy. Se dejaron igual en el handler por las dos
siguientes razones:

1. **Coherencia.** Si el login se limita en su Server Action y los otros dos en
   el proxy, hay dos mecanismos con dos formas distintas de leer la IP y de
   responder el exceso (una devuelve estado de Server Action, la otra una
   respuesta HTTP). Un solo punto de entrada para los tres hace que el manejo
   del `429` sea un solo código.
2. **Testeabilidad.** El harness de testing (Persona B, ya mergeado) prueba los
   Route Handlers importándolos directamente. Un límite en el proxy no se puede
   ejercitar con `tests/integration/**` sin levantar el servidor completo; en el
   handler sí.

El proxy sí queda como el lugar natural para el rate limiting *de superficie*,
que se hará en otro change (P2P: los endpoints privados ya están detrás de
sesión y rol, y no son el problema).

## D2. Falla abierta, no falla cerrada

Si `UPSTASH_REDIS_REST_URL` o `UPSTASH_REDIS_REST_TOKEN` no están definidas, el
límite **no se aplica** y la petición continúa.

La alternativa — fallar cerrado y rechazar todo el tráfico público cuando Redis
está caído o sin configurar — es peor por dos razones concretas del proyecto:

- El desarrollo local y el CI no tienen Upstash. Con falla cerrada, `npm test`
  y `npm run test:e2e` no podrían ejercitar ni el login ni la inscripción
  pública, que son justo los flujos que los tests cubren.
- Un evento del SENA se hace en un lugar con señal incierta
  (`CONTEXT.md` §10). Que una caída de Redis deje de poder inscribir personas
  es un peor resultado operativo que permitir un pico de peticiones.

El riesgo de la falla abierta — que en producción nadie configure Redis y el
límite nunca se aplique sin que nadie lo note — se mitiga con un aviso en `log`
una sola vez por proceso. No es a prueba de desatentos, es a prueba de
ignorancia.

Note que la falla abierta es *total* por simplicidad: no hay un modo
intermedio "sin Redis pero con límite local en memoria", porque un contador en
memoria del proceso no es un límite compartido entre instancias y daría una
falsa sensación de protección.

## D3. La IP se toma de `x-forwarded-for`, con cadena de respaldo

`NextRequest.ip` se eliminó en Next 15 (nota de cambios en
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md`),
así que la IP se lee del header `x-forwarded-for`, que es lo que 설정an Vercel y
los reverse proxies. Se toma el primer valor de la cadena (el cliente original,
no los proxies intermedios), con `x-real-ip` y un literal `"desconocida"` como
respaldo.

Un atacante que controle su propio `x-forwarded-for` evade un límite por IP.
Eso es aceptable aquí y se deja dicho explícitamente: para el objetivo real
—freno a fuerza bruta y a enumeración masiva desde una red— el atacante
también tiene que conseguir un volumen alto de peticiones, y el nivel de
esfuerzo sube de "un script en un minuto" a "infraestructura distribuida". El
límite por IP no pretende ser antifraude.

## D4. La CSP es estática, sin nonce

La guía de CSP de Next 16 (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`)
presenta dos caminos:

- **Con nonce en el proxy:** CSP estricta, pero obliga a que *todas* las páginas
  se rendericen dinámicamente, y desactiva la optimización estática, ISR y el
  CDN. El propio documento advierte que **PPR es incompatible** con nonce.
- **Sin nonce, header estático en `next.config.ts`:** permite
  `'unsafe-inline'` en `script-src`, pero conserva el render estático.

`CONTEXT.md` §4 exige que el modo offline sea cachear el app shell. Un app shell
precisamente estático, con scripts servidos desde el service worker, es
incompatible con nonces. Se elige la CSP estática.

Consecuencia asumida: `'unsafe-inline'` en `script-src` y `style-src` deja pasar
XSS inyectado en HTML. Es una protección parcial, no unaCSP estricta. Cuando el
proyecto de PWA/offline esté definido, esta es la decisión a revisar: si el
service worker termina sirviendo todo el JS con hashes SRI, se puede subir a
`script-src 'self'` sin nonce. Queda anotado como deuda, no como olvido.

`upgrade-insecure-requests` y `Strict-Transport-Security` solo se emiten en
producción: en desarrollo local sobre `http://localhost` los dos directives
romperían la app.

## D5. Lo que NO se limita

- **Los endpoints privados** (`/api/admin/**`, `/api/operador/**`): ya exigen
  sesión con rol, y un Operador que martillee su propio dashboard no es el
  problema que justifica este change.
- **El download de reportes (XLSX)**: genera un archivo en memoria por
  petición. Un Admin pidiendo reportes en bucle es un caso real de abuso de
  recursos, pero limitarlos es un módulo propio y de Persona A (es
  `src/app/admin/**`).

## D6. Verificación sin Upstash

Los tests de integración no pueden depender de un servicio externo. Se prueban
las dos ramas que importan sin red:

1. **Sin configurar** (el caso por defecto en CI): las peticiones pasan y la
   suite de cupo/checkpoint sigue verde. Es la prueba de que la falla abierta no
   rompió nada.
2. **Con un limitador inyectado falso** que siempre rechaza: se verifica que
   cada uno de los tres endpoints responde `429` con el mensaje esperado, y que
   **no** se consultó la base de datos ni se escribió la firma en el bucket
   cuando el límite ya está agotado.

La segunda es la que importa: un límite que se comprueba *después* de subir la
firma al bucket deja el ataque exactamente donde se quería cerrar.

## D7. Por qué 5/15 min en login y no 5/min

`CONTEXT.md` §7 da "5 intentos/15 min". Se respeta el número del documento en
lugar de ajustarlo. Con bcrypt (~100 ms por comparación), 5 intentos cada 15
min deja el throughput de fuerza bruta en ~0.3 intentos/segundo, muy por debajo
de lo que un ataque fruitful necesita, sin que un Admin que se equivoca tres
veces se quede encerrado fuera durante un cuarto de hora.
