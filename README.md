# Eventos SENA

Plataforma de inscripción y control de asistencia a eventos del programa Bienestar al
Aprendiz (SENA). Sustituye planillas y firmas en papel por inscripción web, firma
digital y checkpoints con QR; soporta hasta 1000 personas por evento (titulares y
acompañantes). Hay dos roles con cuenta: el **Administrador** crea eventos,
checkpoints y habitaciones, asigna operadores y exporta reportes; el **Operador**
supervisa la asistencia, activa checkpoints y hace registros manuales. Los
**asistentes no tienen cuenta**: se inscriben y se identifican por su documento.

## Requisitos y stack

- Para arrancar: Docker con Docker Compose. Para lint, pruebas y Prisma en local:
  Node 24 (`.nvmrc`).
- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Prisma 7 con
  PostgreSQL 18, Auth.js v5, S3/MinIO, Upstash Redis, Vitest y Playwright.
- No hacen falta servicios externos para arrancar: correo y rate limiting fallan
  abiertos si no están configurados.

## Inicio rápido

```bash
cp .env.example .env
docker compose --profile full up --build
```

El perfil `full` levanta PostgreSQL (`db`), MinIO y su bucket (`storage`,
`storage-init`), migraciones con datos iniciales (`migrate`) y la app (`app`).
`migrate` y `app` leen el `.env` de la raíz: cópialo antes del primer arranque.
Abre <http://localhost:3000>. El seed crea `admin@sena.gov.co` / `admin123` y
`operador@sena.gov.co` / `operador123` (solo en desarrollo). Para reiniciar sin
reconstruir: `docker compose --profile full up -d`. Para detener:
`docker compose --profile full down`.

## Estructura del repo

- `src/app/`: páginas, formularios y Route Handlers de inscripción, checkpoints, reportes y API.
- `src/components/`: componentes compartidos, UI base, PWA y selector de tema.
- `src/lib/`: reglas de negocio, Prisma, validaciones, email, reportes y PWA.
- `prisma/`: esquema, migraciones y seed. `tests/`: integración (Vitest) y E2E (Playwright).
- `openspec/`: especificaciones y cambios. `public/sw.js`: service worker de la PWA.

## Funcionalidades

- **Eventos y checkpoints** configurables, con cupo por personas y QR fijo por
  estación que el Operador activa/desactiva.
- **Inscripción pública** de titular y acompañantes: una sola firma del titular
  cubre a todo el grupo y cada persona cuenta contra el cupo.
- **Autoregistro por QR** con solo el documento, registro manual asistido y
  protección contra duplicados en cada checkpoint.
- **Panel del Operador** con indicadores en tiempo real, gráficos y búsqueda;
  **habitaciones** asignadas manualmente, con su propio QR.
- **Reportes** de asistencia por checkpoint, exportables a XLSX y PDF.
- **PWA instalable** con temas claro/oscuro/sistema: las páginas visitadas se
  consultan sin conexión, pero registrar requiere internet.

## Flujo resumido

1. El Administrador crea el evento (fechas, lugar, cupo, periodo de inscripción,
   transporte/hotel), configura checkpoints y asigna operadores.
2. El titular se inscribe con su grupo y una sola firma. Cada persona ocupa un
   cupo; no hay lista de espera.
3. El día del evento se activa el QR de cada estación y cada persona se
   autoregistra con su documento; el Operador puede hacerlo manualmente.
4. Al cerrar, se exporta el reporte de esperados vs. registrados. Cancelar un
   evento cambia su estado a `CANCELADO`, nunca lo borra: se conserva el historial.

## Comandos

| Comando | Uso |
| --- | --- |
| `docker compose --profile full up --build` | Construir y levantar todo, incluida la app |
| `docker compose --profile full up -d` / `down` | Arrancar en segundo plano / detener |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:e2e` | Integración (Postgres real) / Playwright |
| `npm run db:generate` / `db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Cliente y tareas de Prisma |

Los comandos `npm` requieren Node 24 y un `.env` con `DATABASE_URL`.

## Configuración

Todas las variables están documentadas en `.env.example`.

| Variable(s) | Uso | ¿Obligatoria? |
| --- | --- | --- |
| `POSTGRES_*`, `DATABASE_URL` | Base de datos de la app y de Docker | Sí |
| `TEST_DATABASE_URL` | Base aislada para pruebas | No; se deriva de `DATABASE_URL` |
| `S3_*` | Bucket privado de firmas (MinIO en desarrollo) | Sí |
| `AUTH_SECRET`, `AUTH_URL` | Sesiones de Auth.js | Sí |
| `NEXT_PUBLIC_URL` | Base pública de las URLs de los QR | Sí; no `localhost` en producción |
| `SEED_*` | Cuentas iniciales creadas por `migrate` | No; hay valores por defecto |
| `UPSTASH_REDIS_REST_*` | Límites por IP en superficies públicas | No; sin ellos no se aplican |
| `HABILITAR_CONFIRMACION_EVENTO` | Activa el correo de confirmación | No; desactivado por defecto |
| `SMTP_*`, `EMAIL_FROM` | Transporte SMTP prioritario | No |
| `RESEND_API_KEY`, `EMAIL_FROM` | Respaldo cuando no hay variables `SMTP_*` | No |

SMTP tiene prioridad: una configuración SMTP parcial no cae a Resend, se advierte
y no se envía correo.

## Pruebas, CI y despliegue

Cada PR ejecuta lint, typecheck, integración y E2E en GitHub Actions. Al hacer
merge a `main`, se aplica `prisma migrate deploy` antes de publicar en Vercel;
se requieren `DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.
La PWA necesita HTTPS (salvo `localhost`).

## Más información

- `CONTEXT.md`: reglas de negocio, decisiones de diseño y arquitectura.
- `openspec/specs/` y `openspec/changes/`: contratos y cambios del proyecto.
- `AGENTS.md`: instrucciones para asistentes que trabajen en este repositorio.
