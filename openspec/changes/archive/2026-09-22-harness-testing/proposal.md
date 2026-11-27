## Why

No existe ningún test en el proyecto (ni unitario, ni de integración, ni end-to-end). Los escenarios de concurrencia documentados en CONTEXT.md §7 — cupo atómico al inscribir grupos y duplicados en checkpoints — fallan solo bajo carga real de hasta 1000 personas, no en pruebas manuales de una sola persona. Sin un harness de testing, cada change nuevo (incluidos los de Persona B: rate limiting, headers, CI/CD) se entrega sin verificación automatizada y sin forma de detectar regresiones silenciosas.

## What Changes

- **Harness de testing de integración contra Postgres real** con Vitest, apuntando a la base `db` de Docker: cubre los escenarios de CONTEXT.md §7 — (1) conflicto de cupo con inscripciones de varias personas simultáneas (el `UPDATE` atómico no debe sobrepasar `cupoMaximo`), (2) duplicados en checkpoint (`@@unique([asistenteId, checkpointId])` capturando `P2002`), (3) cancelar una inscripción libera cupos de forma atómica.
- **Pruebas end-to-end (Playwright)** de los flujos críticos completos: login (admin/operador), inscripción pública con firma y cancelación, autoregistro en checkpoint, panel del Operador (dashboard y registro manual).
- **Scripts de npm** para ejecutar la suite: `test` (integración), `test:e2e` (Playwright), con configuración que usa la base de datos real de desarrollo.
- Configuración al estilo del proyecto: archivos de config de Vitest y Playwright, helpers de test y seed de datos de prueba, sin modificar lógica de negocio ni el esquema.

## Capabilities

No se añade ni modifica ninguna capability de negocio (inscripción, autoregistro, admin, operador). Este cambio es de infraestructura de verificación de Persona B y no altera el comportamiento definido en `openspec/specs/**`.

## Impact

- `package.json` / `package-lock.json`: nuevas devDependencies (`vitest`, `@playwright/test` y dependencias de apoyo). **Aviso de Persona B:** se instalan dependencias nuevas (regla de archivos compartidos, CONTRIBUTING §4).
- Nuevos archivos: `vitest.config.ts`, `playwright.config.ts`, `tests/integration/**`, `tests/e2e/**`, helpers y seed de prueba.
- No se toca `prisma/schema.prisma` (es de Persona A) ni `src/app/admin/**`.
- La lógica de los Route Handlers (`inscripciones`, `checkpoints/[token]/registro`) queda igual — solo se prueban contra una base real.