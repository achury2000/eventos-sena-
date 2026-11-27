## Why

Hay tres superficies públicas sin autenticación que reciben datos personales:
el login, la inscripción pública y el autoregistro en checkpoint. Ninguna tiene
límite de peticiones hoy, así que un atacante puede:

- probar credenciales del panel Admin/Operador sin freno (fuerza bruta);
- enumerar documentos inscritos en un evento enviando miles de documentos a un
  `/checkpoint/{codigoQr}` y leyendo la diferencia entre "no encontrado" y
  "ya registrado";
- saturar la firma en el bucket S3 y el `UPDATE` atómico de cupos con
  peticiones de inscripción.

Tampoco hay headers de seguridad. `CONTEXT.md` §6 los pide desde antes y ahora
que existe PWA/offline planned es el momento de fijarlos: sin
`Content-Security-Policy` un XSS en un formulario público compromete datos de
terceros, y sin `X-Frame-Options` la página de login se puede embeber para
clickjacking.

`CONTRIBUTING.md` §3 pone "rate limiting y headers de seguridad" como trabajo
de Persona B y como prioridad acordada sobre features.

## What Changes

- **Rate limiting con Upstash Redis** en los tres puntos de entrada públicos,
  con los límites de `CONTEXT.md` §7: login estricto (5/15 min por IP),
  autoregistro de checkpoint más permisivo (30/min por IP, porque el sitio del
  evento tiene una sola red wifi con cientos de personas detrás de la misma IP
  por NAT) e inscripción pública intermedia (10/min por IP).
- **Falla abierta cuando Upstash no está configurado.** Las variables
  `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` ya están en
  `.env.example` vacías; sin ellas la petición pasa. Así el desarrollo local y
  el CI siguen funcionando sin Redis, y se emite un aviso en log para que la
  ausencia en producción no pase inadvertida.
- **Headers de seguridad** en `next.config.ts`: `Content-Security-Policy`,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security` y `X-Powered-By` desactivado.
  La CSP es **estática, sin nonce**, porque los nonces obligan a render dinámico
  (Next 16, guía de CSP) y eso rompería el app shell estático que necesita el
  modo offline de `CONTEXT.md` §4.

## Capabilities

- Nueva: `plataforma/seguridad`.

## Impact

- `package.json` / `package-lock.json`: dos dependencias nuevas,
  `@upstash/ratelimit` y `@upstash/redis`. **Aviso de Persona B a Persona A**
  (regla de archivos compartidos, `CONTRIBUTING.md` §4): son archivos de
  Persona B, pero se avisa igual. No hay migración de base de datos.
- Archivos nuevos: `src/lib/rate-limit.ts`,
  `openspec/specs/plataforma/seguridad/spec.md` (al archivar),
  `tests/integration/rate-limit.test.ts`.
- Modificados: `src/lib/actions/auth.ts`,
  `src/app/api/checkpoints/[token]/registro/route.ts`,
  `src/app/api/inscripciones/route.ts`, `next.config.ts`.
- No se toca `prisma/schema.prisma` (es de Persona A) ni `src/app/admin/**`
  (dominio de Persona A).
- `src/proxy.ts` **no** se toca: ver design.md, decisión D2.
