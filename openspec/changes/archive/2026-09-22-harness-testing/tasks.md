## 1. Dependencias y scripts de npm

- [x] 1.1 Instalar devDependencies `vitest` y `@playwright/test` (avisado en proposal: `package.json` compartido) y añadir los scripts `test` (`vitest run tests/integration`) y `test:e2e` (`playwright test`); verificar que `npm run lint` y `npx tsc --noEmit` siguen pasando sin errores.
- [x] 1.2 Instalar el navegador de Playwright (`npx playwright install chromium`); verificar que `npx playwright --version` responde y que `npx playwright install --dry-run chromium` no reporta navegadores faltantes.

## 2. Base de datos de prueba aislada

- [x] 2.1 Crear `tests/helpers/db.ts` con el cliente Prisma (adapter `@prisma/adapter-pg`) que usa `TEST_DATABASE_URL` (misma instancia Docker, base `bienestar_sena_test`) y un `globalSetup` que recrea la base con `prisma migrate deploy` (`TEST_DATABASE_URL`); verificar que tras ejecutarlo el esquema existe en `bienestar_sena_test` y que `bienestar_sena` (desarrollo) queda intacta.

## 3. Suite de integración (Vitest)

- [x] 3.1 Crear `vitest.config.ts` (globalSetup, entorno node, path alias `@`) y ubicar los tests en `tests/integration/`; verificar que `npm test` corre y reporta la suite (aunque aún vacía).
- [x] 3.2 Test de cupo atómico concurrente: evento con cupo 5, lanzar con `Promise.all` varias inscripciones concurrentes (grupos de 1 y 3 personas) contra `POST /api/inscripciones` (importado directo); verificar que los exitosos suman exactamente 5 y el resto recibe `409`, y que `cuposOcupados <= cupoMaximo` siempre.
- [x] 3.3 Test de grupo que no cabe: dejar 2 cupos libres y lanzar una inscripción concurrente de 3; verificar `409` y que no queda ninguna persona a medias ni cupo modificado.
- [x] 3.4 Test de duplicados en checkpoint: checkpoint activo, dos peticiones concurrentes del mismo documento contra `POST /api/checkpoints/[token]/registro`; verificar que solo se persiste un `RegistroControl` (`COUNT` por `asistenteId+checkpointId` == 1).
- [x] 3.5 Test de cancelación: con `vi.mock("@/auth")` (sesión ADMINISTRADOR) cancelar vía `POST /api/inscripciones/[id]/cancelar` una inscripción de 3 personas; verificar que `cuposOcupados` baja exactamente 3, que el cupo vuelve a aceptar esas personas, y que una segunda cancelación responde `409` sin modificar `cuposOcupados`.

## 4. Suite end-to-end (Playwright)

- [x] 4.1 Crear `playwright.config.ts` (baseURL puerto 3100, `webServer` con build standalone sobre `TEST_DATABASE_URL`, una sola worker para no pisar el seed) y `tests/e2e/seed.ts` (admin, operador, evento con checkpoints y asistentes en la base de prueba); verificar que el `webServer` levanta el app y el seed se ejecuta. Se añadió `tests/e2e/servidor.mjs` (el standalone no sirve `public/` ni `_next/static/` sin copiarlos antes).
- [x] 4.2 Spec de login: admin entra a `/admin` y operador a `/operador`, y credenciales inválidas muestran error; verificar pasando en navegador headless.
- [x] 4.3 Spec de inscripción pública completa: titular + 1 acompañante, firma en canvas y consentimiento; verificar que al terminar la inscripción aparece y el Admin la ve en el evento.
- [x] 4.4 Spec de autoregistro: un asistente abre `/checkpoint/[token]` e ingresa solo su documento; verificar que el panel del Operador refleja el incremento del checkpoint.
- [x] 4.5 Spec de registro manual del Operador: desde el panel, registrar manualmente una persona; verificar que el dashboard del checkpoint incrementa y que un documento ya registrado se rechaza con mensaje claro.

## 5. Verificación integral

- [x] 5.1 Idempotencia: correr `npm test` dos veces seguidas; verificar que ambas pasan sin datos residuales entre corridas.
- [x] 5.2 Correr `npm run lint`, `npx tsc --noEmit`, `npm test` y `npm run test:e2e` sin errores.
- [x] 5.3 Validar el cambio con `openspec validate 2026-09-22-harness-testing --strict` y `openspec validate --specs` sin errores (cuando el CLI esté disponible; mientras tanto, revisión manual de consistencia con `CONTEXT.md` y los specs — el CLI no está instalado en el entorno).

## Nota para el equipo

Se agregaron `vitest` y `@playwright/test` como devDependencies (solo desarrollo, no afectan producción). Para correr los tests e2e en local es necesario ejecutar en cada máquina: `npx playwright install chromium` (el navegador no viaja en el repo).

**Hallazgos del harness (nada de lógica de negocio cambió salvo el punto 1):**

1. **Redirect post-login (bug real de producción).** En el build standalone, la navegación tras el login es "soft": el redirect de la Server Action a `/` no pasa por `src/proxy.ts` y el usuario se quedaba pegado en la home. Se arregló en `src/lib/actions/auth.ts`: tras login válido se resuelve el rol y se redirige directo a `/admin` o `/operador` (el proxy sigue protegiendo ambas zonas).
2. **Firma en canvas (solo la spec).** El `page.mouse` necesita el canvas dentro del viewport: se añadió `scrollIntoViewIfNeeded()` antes de dibujar.
3. **MinIO local.** El bucket `firmas-digitales` debe existir (lo crea `mc mb` en `docker-compose`); si MinIO se reinicia con volumen limpio, hay que crearlo o la inscripción e2e falla con "No se pudo guardar la firma".