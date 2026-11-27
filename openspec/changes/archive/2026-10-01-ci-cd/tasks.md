## 0. Corrección que el CI puso a la vista

- [x] 0.1 `tests/integration/cupo.test.ts`: la aserción `exitosas.length === 3`
  fijaba un orden de llegada de las transacciones que no está garantizado. Con
  cupo 5 y grupos de 1, 1, 3 y 4 personas hay dos combinaciones que llenan el
  cupo exacto (`{1, 1, 3}` y `{1, 4}`); se verifica la invariante real —el cupo
  queda lleno, nunca excedido, y el grupo rechazado no entra ni en parte— en vez
  del número de `201`. Verificado con 10 corridas completas de la suite: 0 fallos
  (antes fallaba 1 de cada 4). No era un defecto del código de negocio: el
  `UPDATE` atómico se comportó bien en todas las corridas.

## 1. Workflow de verificación (`ci.yml`)

- [x] 1.1 `.github/workflows/ci.yml` con disparadores `pull_request` y `push` a
  `main`, `permissions: contents: read` explícito, `concurrency` por ref con
  cancelación, y Node desde `.nvmrc` con `cache: npm`. Verificado: el YAML parsea
  con el parser del proyecto y expone los tres jobs esperados.
- [x] 1.2 Job `verificacion`: `npm ci`, `npm run lint` y `npx tsc --noEmit`, sin
  servicios. Verificado en local: ambos comandos pasan sin ninguna variable de
  entorno del proyecto.

## 2. Job de pruebas de integración

- [x] 2.1 Servicio Postgres del runner (imagen `postgres:18.4` igual que en
  `docker-compose.yml`, usuario y contraseña propios del runner, healthcheck con
  `pg_isready`). Verificado en local con un contenedor equivalente.
- [x] 2.2 Variables del job apuntando al host del servicio, más el guard que se
  niega a correr si la base no es la del runner (design.md D2). Verificado en las
  dos direcciones: con `localhost` pasa; con un host de producción
  (`db-produccion.neon.tech`) se detiene con `exit=1` **antes** de correr pruebas.
- [x] 2.3 `npm test` (13 pruebas). Verificado: 10 de 10 corridas completas en
  verde contra el Postgres efímero.

## 3. Job de pruebas end-to-end

- [x] 3.1 Servicios Postgres del runner, con healthcheck. MinIO se levanta con
  `docker run` en un paso, porque el comando `server /data` no se puede declarar
  en un service container; el arranque es idéntico al de `docker-compose.yml` y la
  espera es por el endpoint de salud. Verificado en local: `MINIO_OK`.
- [x] 3.2 Creación del bucket de firmas con el mismo `@aws-sdk/client-s3` que usa
  la aplicación, sin imágenes ni descargas extra. Verificado en local: el bucket
  `firmas-digitales` se crea en la réplica de MinIO.
- [x] 3.3 `npx playwright install --with-deps chromium` y `npm run test:e2e` con
  `AUTH_SECRET` de prueba. Verificado en local: 6 de 6 e2e en verde contra el
  Postgres y el MinIO efímeros, incluida la inscripción con firma real.
- [x] 3.4 `playwright-report/` y `test-results/` subidos como artefacto cuando la
  corrida falla. La configuración ya deja trazas y capturas; falta ejercitar el
  `if: failure()` en GitHub con una corrida roja real.

## 4. Despliegue a producción (`deploy.yml`)

- [x] 4.1 `.github/workflows/deploy.yml` con disparador `push` a `main`,
  `environment: production` y `concurrency` sin cancelación (dos merges seguidos
  no compiten por el mismo despliegue). Verificado: el YAML parsea.
- [x] 4.2 Job `migraciones`: paso inicial que verifica que `DATABASE_URL`,
  `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` estén configurados y
  termina nombrando el que falta (design.md D5); después `npm ci` y
  `prisma migrate deploy`. Verificado el paso de secretos en local en las dos
  direcciones: con las cuatro variables pasa, y sin una termina con `exit=1`
  nombrándola.
- [x] 4.3 Job `despliegue` con `needs: migraciones`, de modo que una migración
  fallida impida el despliegue; despliegue a Vercel con `vercel pull` +
  `vercel build` + `vercel deploy --prebuilt --prod`.
- [x] 4.4 Verificado por construcción: el workflow solo dispara con
  `push` a `main`, así que un push a una rama de trabajo no ejecuta ni
  migraciones ni despliegue.

## 5. Verificación integral

- [x] 5.1 Los dos workflows son YAML válido y no referencian archivos inexistentes.
- [x] 5.2 Todo lo que ejecutan los jobs pasa en local: `npm run lint`,
  `npx tsc --noEmit`, `npm test` (13) y `npm run test:e2e` (6) contra servicios
  efímeros equivalentes a los del runner.
- [x] 5.3 `openspec validate 2026-10-01-ci-cd --strict` y `openspec validate
  --specs`: ambos pasan. El CLI global `openspec` está disponible; los specs del
  change se movieron a headers delta (`## ADDED Requirements`) para cumplir con
  la versión actual del CLI (igual que rate-limiting-headers).

## 6. Documentación

- [x] 6.1 `CONTRIBUTING.md`: §7 con los comandos de verificación y nota de que el
  CI corre los mismos; §8 con el estado actualizado; §9 nuevo con la tabla de los
  4 secretos que hay que crear y para qué usa cada uno el workflow.
- [x] 6.2 Nota de coordinación: el CI **informa pero no bloquea** hasta que se
  active branch protection en `main` (design.md D7).

## Nota para el equipo

**Lo que este change deja pendiente y depende de otros:**

- **Los 4 secretos los crea quien administra el repositorio**, no este código.
  Hasta entonces el workflow de despliegue falla en el primer paso diciendo qué
  falta (tarea 4.2), y el CI de pull requests funciona completo sin ellos.
- **El job de despliegue no se pudo probar de punta a punta** porque requiere el
  proyecto de Vercel y su token. Lo verificado es el YAML, el orden de jobs y el
  fallo rápido de secretos. La primera vez que haya token, hay que correr un
  push a `main` a propósito y mirar que migró y desplegó.
- **Branch protection en `main`:** hasta que exista, nada impide un push directo a
  `main` y el CI solo informa. Es la brecha de seguridad más relevante que deja
  este change (design.md D7).
- **La corrección de `tests/integration/cupo.test.ts` (tarea 0.1) es del change
  del harness** (`2026-09-22-harness-testing`), que aún no está mergeado. Se
  incluye aquí porque este change va apilado sobre aquel; al mergear este PR, el
  fix llega con él.