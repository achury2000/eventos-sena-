## Context

El proyecto no tiene ningún test (verificación obligatoria de CONTRIBUTING §7 pendiente). Los Route Handlers de inscripción y autoregistro se implementaron a propósito como handlers, no Server Actions, para poder probarlos aislados contra condiciones de carrera (CONTEXT.md §6). La lógica que protege el cupo y los duplicados vive en Postgres (`$executeRaw` atómico y `@@unique`), por lo que un harness que no use una base real no probaría nada. Existe un `db` de desarrollo en Docker (Postgres 18) y un seed de datos iniciales (`npm run db:seed`).

Ver proposal.md — Why para la motivación; los requisitos de comportamiento están en `specs/plataforma/testing/spec.md`.

## Goals / Non-Goals

**Goals:**
- Suite de integración (Vitest) contra Postgres real que cubra cupo atómico, duplicados en checkpoint y cancelación que libera cupos.
- Suite end-to-end (Playwright) de los flujos críticos completos.
- Aislamiento total de datos: el harness usa una base dedicada y nunca toca datos de desarrollo.
- Ejecutable por scripts de npm (`test`, `test:e2e`) y listo para correr en CI.

**Non-Goals:**
- CI/CD (GitHub Actions) — es un change aparte de Persona B, se apoya en estos scripts.
- Tests unitarios de cada componente/acción por separado (el foco es integración y E2E, alineado con CONTEXT.md §9).
- Cubrir habitaciones de hotel, reportes, visor de firma ni rate limiting (aún no implementados).
- Cambiar el esquema de Prisma ni la lógica de negocio.

## Decisions

### 1. Base de datos dedicada para pruebas (`bienestar_sena_test`)

El harness NO usa la base de desarrollo. En la misma instancia Docker se crea una base `bienestar_sena_test` (variable de entorno dedicada, ej. `TEST_DATABASE_URL`), recreada al inicio de la suite con `prisma migrate deploy` (misma migración que desarrollo). No se depende de `prisma db push` ni se borran datos de desarrollo. Esto evita chocar con la regla "cancelar un evento nunca es un DELETE" y con `onDelete: Restrict`: al ser una base efímera de prueba, la limpieza es recrear/esquematizar la base, no borrar filas.

### 2. Llamar a los Route Handlers exportados directamente (sin servidor HTTP)

Vitest importa `{ POST }` de `src/app/api/inscripciones/route.ts` y `src/app/api/checkpoints/[token]/registro/route.ts` y los invoca con `new NextRequest(...)` en el proceso de pruebas. Para los handlers públicos no se necesita sesión. Para `POST /api/inscripciones/[id]/cancelar` (solo ADMINISTRADOR) se mockea `@/auth` con `vi.mock` devolviendo una sesión de Admin — el resto de la lógica (transacción, cupo) se prueba real contra la base. Lanzar N llamadas concurrentes con `Promise.all` reproduce las condiciones de carrera de la sección 7 de CONTEXT.md sin levantar servidores ni ocupar puertos.

### 3. Playwright e2e con servidor propio y seed de prueba

`playwright.config.ts` usa `webServer` para levantar `next dev` con `TEST_DATABASE_URL` y las variables de Auth (port distinto, ej. 3100), y un script `tests/e2e/seed.ts` crea los datos del recorrido (evento, checkpoints, asistentes, admin, operador) en la base de prueba. Cada prueba end-to-end es independiente (datos únicos por test o limpieza en `beforeEach`).

### 4. Un único Prisma client reutilizable en helpers

Los helpers de test (`tests/helpers/db.ts` y `tests/e2e/utils.ts`) crean el cliente Prisma con el adapter `@prisma/adapter-pg` apuntando a `TEST_DATABASE_URL` (mismo estilo que `src/lib/prisma.ts`, sin singleton __prod__). Un helper `crearEventoPrueba`/`crearEquipoPrueba` centraliza la siembra mínima (evento, checkpoint, asistentes) con documentos y nombres únicos por test.

### 5. Nombres de scripts y fallo no-ambiguo

`npm test` = `vitest run tests/integration`. `npm run test:e2e` = `playwright test`. Ambos salen con código != 0 ante fallo (comportamiento por defecto de los runners), condición exigida por CI.

## Risks / Trade-offs

- **Base de prueba efímera vs. coste de recrearla** → Recrear con `migrate deploy` por suite pesa poco (migraciones pequeñas) y garantiza un estado conocido e idempotente; `migrate deploy` es el mismo comando del plan de despliegue (CONTEXT.md §9).
- **Mockeos en `cancelar`** → Solo se mockea la sesión de Auth; la transacción, el decremento de cupo y la cancelación duplicada se prueban contra Postgres real. Riesgo bajo: la sesión no es la lógica bajo prueba.
- **E2E depende del seed e2e** → El seed es específico del harness y vive en `tests/e2e/`, nunca toca `prisma/seed.ts` (de Persona A).
- **Puerto distinto para e2e** → Evita colisionar con `npm run dev` del desarrollador (3000 en uso).

## Migration Plan

1. Instalar devDependencies (`vitest`, `@playwright/test`) y añadir scripts de npm. (Regla: avisar por ser `package.json` compartido — ya anunciado en el proposal.)
2. Implementar helpers y base de prueba (sección 1 de tasks).
3. Implementar suite de integración y config de Vitest.
4. Implementar suite e2e y config de Playwright (con `npx playwright install chromium`).
5. Verificación: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:e2e`.
6. Rollback: quitar scripts y devDeps, borrar `tests/`, `vitest.config.ts` y `playwright.config.ts`. Ningún archivo de negocio se toca, así que el rollback es trivial.

## Open Questions

Ninguna. El alcance y las capas (integración sobre Postgres real + e2e Playwright) vienen fijados por CONTEXT.md §9 y CONTRIBUTING §3 (harness de testing como responsabilidad de Persona B, prioridad seguridad/pruebas).