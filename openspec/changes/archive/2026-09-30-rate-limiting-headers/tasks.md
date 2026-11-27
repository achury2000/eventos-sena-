## 1. Dependencias

- [x] 1.1 Instalar `@upstash/ratelimit` y `@upstash/redis` (aviso en proposal: `package.json` es archivo compartido, CONTRIBUTING §4); verificar que `npm run lint` y `npx tsc --noEmit` siguen pasando.

## 2. Módulo de rate limiting

- [x] 2.1 Crear `src/lib/rate-limit.ts` con los tres límites de `CONTEXT.md` §7 (login 5/15 min, inscripción 10/min, checkpoint 30/min) y la lectura de IP desde la cadena `x-forwarded-for` con respaldo a `x-real-ip` y a una identidad compartida; verificar que `ipDeOrigen` toma el primer valor de la cadena.
- [x] 2.2 Implementar la falla abierta (design.md D2): sin `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, o si el servicio no responde, la petición pasa y se emite un aviso **una sola vez** por proceso; verificar leyendo el log del web server en la corrida e2e, que muestra un único aviso.

## 3. Aplicación en los puntos de entrada

- [x] 3.1 Login (`src/lib/actions/auth.ts`): comprobar el límite antes de leer el formulario y antes de `signIn`; verificar con el test e2e de credenciales inválidas, que sigue mostrando el error de credenciales y no un 429.
- [x] 3.2 Inscripción pública (`src/app/api/inscripciones/route.ts`): comprobar el límite **antes** de `subirFirma` y del `UPDATE` atómico; verificar que un 429 no deja objetos en el bucket ni modifica `cuposOcupados`.
- [x] 3.3 Autoregistro en checkpoint (`src/app/api/checkpoints/[token]/registro/route.ts`): comprobar el límite antes de buscar el checkpoint y de insertar el `RegistroControl`; verificar que un 429 no crea ninguna fila de asistencia.
- [x] 3.4 Cada respuesta de exceso incluye `Retry-After` y un mensaje que no revela si el documento o el correo existen.

## 4. Headers de seguridad

- [x] 4.1 `next.config.ts`: añadir `Content-Security-Policy` (estática, sin nonce — design.md D4), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`; desactivar `poweredByHeader`.
- [x] 4.2 `Strict-Transport-Security` y `upgrade-insecure-requests` solo en producción (en `http://localhost` romperían la app).
- [x] 4.3 Verificar contra el servidor real: en producción la respuesta de `/login` trae los seis headers y **no** trae `X-Powered-By`; en `npm run dev` la respuesta trae la CSP sin `upgrade-insecure-requests` y sin HSTS.

## 5. Verificación integral

- [x] 5.1 `tests/integration/rate-limit.test.ts`: cubrir la extracción de IP, la falla abierta y la rama de `429` de los tres endpoints con el limitador sustituido por un doble.
- [x] 5.2 `npm test` verde (13/13) y confirmando que la suite de cupo y la de checkpoint siguen pasando sin configurar Upstash — esa es la prueba de que la falla abierta no rompió el desarrollo local ni el CI.
- [x] 5.3 `npm run build` verde y `npm run test:e2e` verde (6/6). El build es la prueba de que la CSP no forzó render dinámico: `/` y `/login` siguen apareciendo como `○ (Static)`, y la respuesta de `/login` viene con `x-nextjs-cache: HIT`.
- [x] 5.4 `npm run lint` y `npx tsc --noEmit` sin errores.

## Nota para el equipo

**Lo que este change NO hace, a propósito:**

- **Sin Upstash, no hay límite.** Es la falla abierta de design.md D2, necesaria
  para que el CI y el desarrollo local funcionen, pero significa que en
  producción hay que crear la base en Upstash y cargar las dos variables antes
  de publicar. Hasta entonces, el log con el aviso es la única señal.
- **Un límite por IP no es antifraude.** Un cliente que controle su propio
  `x-forwarded-for` lo evade (design.md D3). Para enumerar documentos tiene que
  mover volumen alto, lo que le cuesta más de lo que ahorra, pero el límite no
  lo detiene.
- **La CSP lleva `'unsafe-inline'`.** Es una protección parcial, no una CSP
  estricta, porque los nonces obligan a render dinámico y romperían el app
  shell estático del modo offline (design.md D4). Se puede endurecer a
  `script-src 'self'` cuando exista el change de PWA y el JS se sirva con
  hashes SRI. **Es deuda conocida, no un olvido.**
- **Los endpoints privados no se limitan** y la exportación de reportes (XLSX)
  tampoco: ya exigen sesión y rol, y limitarlos es un módulo aparte que toca
  `src/app/admin/**`, que es de Persona A (design.md D5).

**Deuda que este change deja anotada:** `src/proxy.ts` sigue siendo el lugar
natural para un rate limit *de superficie* que cubra rutas nuevas por defecto,
en vez de depender de que cada endpoint público recuerde llamar a
`comprobarLimite`. Se difiere porque obligaría a reescribir el conteo del login
para no contaminarlo con navegación normal (design.md D1).
