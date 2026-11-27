## Why

Hoy nada se verifica solo cuando se abre un pull request. `npm run lint`,
`npx tsc --noEmit`, `npm test` y `npm run test:e2e` se corrieron a mano, una vez,
por la misma persona que escribió el código. El harness ya existe (Vitest +
Playwright, 19 pruebas) y sí detecta regresiones — pero solo si alguien se acuerda
de correrlo. Los dos changes que se están entregando ahora mismo (harness de
testing y rate limiting) tuvieron que verificarse a mano justamente porque no hay
una red que verifique por ellos.

`CONTEXT.md` §9 además exige que las migraciones se apliquen **antes** de que el
código nuevo reciba tráfico. Hoy eso tampoco está automatizado: depende de que
alguien recuerde correr `prisma migrate deploy` contra el entorno correcto, con el
riesgo de que se olvide (código nuevo contra esquema viejo) o de que se ejecute
contra la base equivocada.

## What Changes

- **`.github/workflows/ci.yml`** — en cada `pull_request` y en cada push a `main`:
  - job `verificacion`: `npm run lint` y `npx tsc --noEmit`, sin servicios.
  - job `integracion`: Postgres efímero del runner + `npm test` (13 pruebas de
    integración: cupo atómico, duplicados en checkpoint, cancelación, rate limit).
  - job `e2e`: Postgres + MinIO efímeros, `npx playwright install --with-deps
    chromium` y `npm run test:e2e` (6 pruebas end-to-end de los flujos críticos).
- **`.github/workflows/deploy.yml`** — en cada push a `main`, en dos pasos
  ordenados: (1) `prisma migrate deploy` contra la base de producción y (2)
  despliegue a Vercel con `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`
  dentro del environment `production`. Si la migración falla, no se despliega.
- Node fijado desde `.nvmrc` (24.15.0) y caché de npm, para que la versión que
  construye el CI sea la que corre en producción y no cambie entre corridas.
- Los jobs de pull request **no reciben ninguna credencial de producción**: los
  tests corren contra los servicios efímeros del runner. El rate limiting falla
  abierto a propósito (spec `plataforma/seguridad`), así que el CI corre sin
  Upstash.

## Capabilities

Se añade la capability `plataforma/ci-cd` (verificación y despliegue
automatizados). No se modifica ninguna capability de negocio: inscripción,
autoregistro, panel del Operador y panel del Admin se comportan igual.

## Impact

- `.github/workflows/ci.yml` y `.github/workflows/deploy.yml` nuevos.
  `.github/**` es de Persona B (`CONTRIBUTING.md` §3).
- Sin cambios en `package.json`, `prisma/schema.prisma` ni `src/**`. Los
  workflows consumen los scripts que ya existen (`test`, `test:e2e`) y las
  variables que ya acepta el harness.
- **Requiere que quien administre el repositorio cree 4 secretos**:
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` y `DATABASE_URL`
  (producción). Son credenciales: no pueden escribirse desde el código ni quedar
  en el repo. Hasta que existan, el job de migraciones falla rápido diciendo qué
  secreto falta (design.md D5), en vez de fallar a mitad de un despliegue.
- El job e2e necesita MinIO porque el flujo de inscripción sube la firma real al
  bucket de objetos; no se puede falsear el almacenamiento sin dejar de probar
  esa parte (design.md D3).