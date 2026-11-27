# Design — CI/CD

## D1. Dos workflows, no uno

`ci.yml` corre en `pull_request` y en `push` a `main`; `deploy.yml` corre solo en
`push` a `main`. Podrían ser un solo archivo con dos disparadores, pero separarlos
deja claro un hecho importante: **cualquiera que abra un PR puede leer y ejecutar
el workflow de verificación, y nadie más ejecuta migraciones.** Mezclarlos
obligaría a darle permisos de escritura sobre `main` al workflow que corre código
de terceros.

Los permisos del `GITHUB_TOKEN` se declaran explícitos por workflow
(`contents: read` en CI, `contents: read` en deploy) en vez de heredar el token
por omisión, que depende de cómo esté configurado el repositorio.

## D2. Postgres del runner, y por qué el usuario debe ser superusuario

Los setups del harness (`tests/integration/setup.ts`, `tests/e2e/setup.ts`) hacen
`DROP DATABASE IF EXISTS bienestar_sena_test WITH (FORCE)` y lo vuelven a crear,
conectándose a la base `postgres` del mismo servidor. Eso exige un usuario con
privilegios de superusuario en el Postgres del runner.

Consecuencia: el CI no puede apuntar a un Postgres gestionado (Neon, Supabase)
como base de pruebas, aunque ese sea el proveedor que se elija para producción
(`CONTEXT.md` §10). No es un límite de este change: es una propiedad del harness,
que necesita recrear la base en cada corrida para que las pruebas sean
independientes del orden. Si algún día el harness se rediseña para no dropear la
base, el CI podría reutilizar una instancia compartida; queda anotado, no
resuelto.

Por seguridad se usa un usuario propio del runner con contraseña de prueba, no
`trust` ni credenciales reales del proyecto.

## D3. MinIO real, no un doble del cliente S3

La prueba e2e de inscripción pública firma en un canvas y verifica que la firma
queda referenciada en la inscripción. Se podría cambiar `src/lib/storage.ts` por
un doble en las pruebas y no levantar MinIO, pero eso deja de probar justo lo que
se quiere probar: que el bucket acepta la escritura, que la clave se devuelve
igual y que el flujo completo funciona con almacenamiento real. El costo es bajo
—una imagen de MinIO y un paso para crear el bucket—, así que se levanta el
servicio real, replicando el servicio `storage-init` de `docker-compose.yml`
(`mc alias set` + `mc mb --ignore-existing`).

Alternativa descartada: un S3 falso como MinIO en GitHub Codespaces o
LocalStack, porque agrega una dependencia externa para resolver un problema que
un contenedor del runner resuelve.

## D4. Las migraciones van en un job propio, antes del despliegue

`CONTEXT.md` §9 pide que las migraciones se apliquen antes de que el código nuevo
reciba tráfico. Hay tres formas de lograrlo en Vercel:

1. **Migración dentro del build de Vercel** (`buildCommand: prisma migrate deploy
   && next build`). Simple, pero el despliegue se mezcla con la verificación: si
   la migración falla, el build falla, y Vercel hace reintentos — y una migración
   que se aplicó a medias en el primer intento puede dejar el esquema en un estado
   que el segundo intento no sabe cómo interpretar.
2. **Migración como paso previo en el workflow, con su propio job y su propio
   secreto.** Es lo que se hace. El build de Vercel queda como build, y el paso
   que puede romper producción es visible y ejecutable por separado.
3. **Job de migración disparado manualmente** antes de hacer deploy. Es la más
   segura y la más fácil de olvidar, que es justo el problema que se viene a
   resolver.

Se elige la 2, y con una salvedad que hay que decir: **entre la migración y el
despliegue hay una ventana en la que el esquema es más nuevo que el código que
sirve tráfico.** Con las migraciones de Prisma esa ventana es inocua mientras las
migraciones sean aditivas (agregar una columna o una tabla no rompe la versión
anterior del código), y se vuelve peligrosa con una migración destructiva
(borrar o renombrar una columna que la versión anterior sigue leyendo). Por eso
las migraciones destructivas, cuando las haya, deben desplegarse en dos pasos:
primero la versión de código que ya no usa la columna, después la que la borra.

Además, las migraciones nunca se editan después de aplicadas: Prisma registra su
checksum y falla si cambia. Eso convierte "arreglar la migración en el servidor"
en una opción que no existe, y por lo tanto obliga a que la revisión del PR
incluya la revisión de `prisma/migrations/**`.

## D5. Los secretos fallan rápido, y hay que pedirlos

El despliegue necesita cuatro secretos: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID` y `DATABASE_URL` de producción. **No se pueden crear desde
este repositorio** (son credenciales, y crearlas requiere permisos de
administración del repositorio que la Persona B no tiene). Se documentan en
`CONTRIBUTING.md` §8 y en la nota del change para que se gestiona aparte.

Mientras no existan, el workflow no debe fallar a mitad: el primer paso comprueba
que las cuatro variables estén presentes y, si falta alguna, termina ahí
nombrándola. Un despliegue que falla después de migrar deja el esquema
adelantado sin código nuevo, que es la peor forma de fallar.

Los jobs de pull request no reciben ninguno de estos secretos. No los necesitan:
el rate limiting falla abierto cuando Upstash no está configurado
(spec `plataforma/seguridad`), y esa es justamente la rama que cubren
`tests/integration/rate-limit.test.ts`.

## D6. Concurrencia, caché y artefactos

- `concurrency` con clave por ref y `cancel-in-progress: true`: al subir una
  corrección se cancela la corrida anterior de esa rama.
- Node desde `.nvmrc` con `actions/setup-node` y `cache: npm`. Fijar la versión
  importa más que la velocidad: una versión distinta de Node puede compilar o
  tipar distinto a como lo hace producción.
- Caché de navegadores de Playwright: instalar el Chromium en cada corrida es la
  parte más lenta del job e2e.
- Cuando la corrida falla, se suben `playwright-report/` y `test-results/` como
  artefacto. `playwright.config.ts` ya deja trazas (`trace: "on-first-retry"`) y
  capturas (`screenshot: "only-on-failure"`), así que el artefacto contiene lo
  necesario para leer el fallo.

## D7. Lo que este CI NO hace

- **No protege la rama `main`.** Eso es *branch protection* en la configuración
  del repositorio, no un archivo del repo, y requiere permisos de administración.
  Sin ella, el CI informa pero no impide: alguien con permiso de escritura puede
  hacer push directo a `main`. Es la brecha más importante que queda, y no se
  cierra desde el código.
- **No escanea dependencias** (`npm audit`). Requiere decidir qué hacer con los
  hallazgos: hoy el proyecto tiene dependencias con avisos bloqueantes
  deliberadamente resueltos con `overrides`, y un `npm audit` en rojo perpetuo
  entrena a ignorar los avisos en rojo.
- **No prueba carga real.** `CONTEXT.md` §7 describe escenarios con hasta 1000
  personas; el harness los cubre con concurrencia real dentro de una prueba, no
  con 1000 clientes simultáneos. Eso es otro change.
- **No despliega a otro proveedor** ni hace previews por PR. Si Vercel no es el
  proveedor final (no está decidido, `CONTEXT.md` §9), lo que cambia es el job de
  despliegue; la verificación no se toca.
- **No corre los tests de integración y e2e en paralelo entre sí.** Comparten la
  misma base recreada por sus setups, así que correrlos a la vez los rompería.