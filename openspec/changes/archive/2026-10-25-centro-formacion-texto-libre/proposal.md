# Proposal

## Why

El centro de formación se captura con un `<select>` alimentado por la tabla
`CentroFormacion`, un catálogo que **solo se llena desde `prisma/seed.ts`** (seis
filas) y que **no tiene pantalla, acción ni endpoint de alta o edición**. Quien
pertenece a un centro distinto de esos seis no puede declararlo: elige un centro
ajeno o deja el dato en blanco. Además, la creación de cuentas está bloqueada de
raíz cuando la tabla está vacía: `src/app/admin/cuentas/nuevo/page.tsx` hace
`notFound()` si no hay centros, así que un despliegue sin seed no puede crear
ninguna cuenta.

El uso real del dato es **descriptivo**: saber a qué centro pertenece una persona.
No hay agrupaciones ni conteos por centro en reportes, y `regional` solo se usa
para etiquetar el `<select>` y el listado de Cuentas. Con ese propósito no se
justifica mantener un catálogo canónico ni construir su CRUD (justo lo que se
quiere evitar): el nombre del centro es un texto que la persona conoce y el
sistema no tiene forma de mantener al día.

La obligatoriedad tampoco corresponde a la política vigente: el formulario de
Cuentas exige centro a **cualquier** rol, aunque los Administradores son siempre
personal del SENA (donde el centro sí es un dato de pertenencia) y los Operadores
pueden ser externos (donde no lo es). En la inscripción pública el centro del
titular es opcional —decisión vigente— y los acompañantes no lo declaran.

## What Changes

- El centro de formación pasa a **texto libre** en las dos superficies que lo
  capturan: inscripción pública del titular y creación de cuentas. Se retira el
  `<select>` y el prop `centros` que lo alimentaba.
- **BREAKING (esquema de datos)**: se retira el modelo `CentroFormacion` y su
  campo `regional`; `Usuario` y `Asistente` guardan el centro como texto
  (`centroFormacion String?`). Una migración hace backfill del nombre actual
  antes de eliminar la clave foránea y la tabla; las filas existentes conservan
  el nombre de su centro.
- **BREAKING (contrato interno del formulario)**: el campo enviado a
  `POST /api/inscripciones` y a la server action de Cuentas se llama
  `centroFormacion` (texto) en vez de `centroFormacionId` (id del catálogo). No
  hay consumidores externos conocidos; el único cliente es el formulario de la
  app.
- Regla de obligatoriedad por rol en Cuentas: **Administrador → obligatorio**,
  **Operador → opcional**. Se valida en el servidor (hoy ambas rutas comparten el
  mismo esquema con centro obligatorio).
- La inscripción pública no cambia de regla: el centro del titular sigue siendo
  **opcional** y los acompañantes siguen sin campo. Solo cambia el control (se
  escribe, no se elige) y se corrige la redacción de la spec, que hoy describe a
  los acompañantes "con el mismo esquema (centro de formación opcional)" cuando
  el formulario nunca les pidió centro.
- Se actualizan los consumidores que mostraban el nombre del catálogo (listado de
  Cuentas, reporte por asistente y exportación a Excel) para leer el texto. El
  listado de Cuentas deja de mostrar la regional, que desaparece con el catálogo,
  y muestra "—" cuando la cuenta no declaró centro (caso posible en Operadores).
- `prisma/seed.ts` deja de sembrar centros y asigna el nombre del centro a las
  cuentas de prueba; los seeds de e2e y las pruebas se ajustan al nuevo modelo.
- `CONTEXT.md` se actualiza: el catálogo desaparece del modelo de datos y del
  ejemplo de validación Zod.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `admin/operadores`: el requisito de creación de Administrador fija el centro de
  formación como **obligatorio** y escrito como texto libre; el de creación de
  Operador lo fija como **opcional** (puede ser externo) con un escenario nuevo
  para el alta sin centro. Los listados no cambian: siguen mostrando el centro
  asociado cuando existe.
- `inscripcion-publica`: el requisito del formulario deja explícito que el centro
  del titular es **opcional y escrito** (sin lista cerrada) y que los
  acompañantes no lo declaran; se agrega el escenario de titular sin centro.

## Impact

- **Datos**: `prisma/schema.prisma` (nuevo `centroFormacion String?` en `Usuario` y
  `Asistente`, retiro de `CentroFormacion` y `regional`) y una migración nueva en
  `prisma/migrations/` con backfill (`UPDATE ... FROM centros_formacion`) previo
  al `DROP` de la clave foránea, la columna `centroFormacionId` y la tabla.
- **Validación**: `src/lib/validations/inscripcion.ts` (`centroFormacion` texto
  opcional) y `src/lib/validations/admin.ts` (centro obligatorio solo cuando
  `rol = ADMINISTRADOR`).
- **Formularios**: `src/app/inscripcion/[eventoId]/form-inscripcion.tsx` y
  `src/app/admin/cuentas/form-usuario.tsx` (de `<select>` a `Input`), y las
  páginas que cargaban el catálogo (`inscripcion/[eventoId]/page.tsx`,
  `admin/cuentas/nuevo/page.tsx`).
- **Persistencia y lecturas**: `src/app/api/inscripciones/route.ts`,
  `src/lib/actions/admin/usuarios.ts`, `src/app/admin/cuentas/page.tsx`,
  `src/lib/reportes/cargar-reporte.ts`,
  `src/app/api/admin/eventos/[eventoId]/reporte/exportar/route.ts` y
  `src/app/admin/eventos/[id]/reporte/tabla-desglose.tsx`.
- **Pruebas**: `tests/integration/usuarios.test.ts` (alta de Operador sin centro,
  Administrador sin centro rechazado), `tests/e2e/seed.ts`,
  `tests/e2e/cuentas.spec.ts` y `tests/e2e/inscripcion.spec.ts` (escribir el
  centro en vez de seleccionarlo).
- **Documentación**: `CONTEXT.md` §3 (datos del titular), §5 (entidades) y §7
  (ejemplo de validación Zod).
- **Entorno y dependencias**: ninguno. No se toca `package.json`, Docker ni
  variables de entorno.
