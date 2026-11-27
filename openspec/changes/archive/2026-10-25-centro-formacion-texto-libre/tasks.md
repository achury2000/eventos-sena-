# Tasks

## 1. Esquema y migración

- [x] 1.1 En `prisma/schema.prisma`, agregar `centroFormacion String?` a `Usuario`
  y a `Asistente`, quitar las relaciones y `centroFormacionId` de ambos, y
  eliminar el modelo `CentroFormacion`; verificar con `npx prisma validate` que
  el esquema es válido.
- [x] 1.2 Crear la migración con `npx prisma migrate dev --create-only --name
  centro_formacion_texto` y editar el SQL en el orden: `ADD COLUMN
  "centroFormacion"` en `usuarios` y `asistentes`, `UPDATE ... FROM
  centros_formacion` para el backfill, `DROP CONSTRAINT` de las FK, `DROP COLUMN
  "centroFormacionId"` y `DROP TABLE centros_formacion`; verificar que el
  backfill aparece antes del `DROP` y que `npx prisma migrate dev` la aplica sin
  error.
- [x] 1.3 Verificar el backfill comparando, antes y después de migrar, el conteo
  de `usuarios`/`asistentes` con centro no nulo contra las filas con
  `centroFormacion` poblado en la base de desarrollo; ambos conteos deben
  coincidir.
- [x] 1.4 Regenerar el cliente con `npx prisma generate` y comprobar que el tipo
  `CentroFormacion` ya no existe en `src/generated/prisma`.

## 2. Validación

- [x] 2.1 En `src/lib/validations/inscripcion.ts`, reemplazar `centroOpcional`
  por `centroFormacion` (texto con `trim`, mínimo 3 y máximo 200 cuando se
  declara, cadena vacía u omisión → `undefined`) y quitar el comentario que
  justifica el id de texto; verificar que `esquemaAsistente` expone
  `centroFormacion`.
- [x] 2.2 En `src/lib/validations/admin.ts`, cambiar `centroFormacionId` por
  `centroFormacion` opcional y agregar un `superRefine` que rechace el vacío con
  `path: ["centroFormacion"]` solo cuando `rol === "ADMINISTRADOR"`; verificar
  con un `safeParse` manual (o el caso de integración de 6.2) que el Operador sin
  centro pasa y el Administrador sin centro falla con ese campo.

## 3. Formularios y páginas

- [x] 3.1 En `src/app/inscripcion/[eventoId]/form-inscripcion.tsx`, quitar el
  tipo `Centro`, el prop `centros` y el `<select>`; reemplazarlo por un `Input`
  de texto (`maxLength={200}`) con etiqueta "Centro de formación", y enviar
  `centroFormacion` en el cuerpo del POST para titular y acompañantes.
- [x] 3.2 En `src/app/inscripcion/[eventoId]/page.tsx`, eliminar la consulta a
  `centroFormacion` y el prop `centros`; verificar que la página compila sin
  consultas al catálogo.
- [x] 3.3 En `src/app/admin/cuentas/form-usuario.tsx`, quitar el prop `centros` y
  el `<select>`; convertir el `<select>` de rol en controlado para que el
  `Input` de centro tenga `required` solo con `ADMINISTRADOR` y un texto de ayuda
  que lo indique ("obligatorio para Administradores, opcional para Operadores").
- [x] 3.4 En `src/app/admin/cuentas/nuevo/page.tsx`, eliminar la consulta de
  centros, el `notFound()` y el prop `centros`; verificar que la página abre
  aunque no exista ningún centro sembrado.

## 4. Persistencia y lecturas

- [x] 4.1 En `src/app/api/inscripciones/route.ts`, guardar `centroFormacion` del
  titular y de cada acompañante (`?? null`) en `tx.asistente.create`; verificar
  que el cuerpo del POST ya no usa `centroFormacionId`.
- [x] 4.2 En `src/lib/actions/admin/usuarios.ts`, leer `centroFormacion` del
  `FormData` y persistirlo como texto en `prisma.usuario.create`; verificar que
  el alta no referencia `centroFormacionId`.
- [x] 4.3 En `src/app/admin/cuentas/page.tsx`, quitar `include: {
  centroFormacion: true }` y mostrar `u.centroFormacion ?? "—"`; verificar que un
  Operador sin centro se ve como "—" y que ya no se muestra la regional.
- [x] 4.4 En `src/lib/reportes/cargar-reporte.ts`, cambiar el `select` anidado por
  `centroFormacion: true` y el mapeo a `a.centroFormacion ?? null`; verificar con
  `npx tsc --noEmit` que la tabla de desglose y la exportación a Excel compilan
  sin cambios y siguen recibiendo `string | null`.

## 5. Seed, fixtures y documentación

- [x] 5.1 En `prisma/seed.ts`, quitar `centrosDeFormacion`, su `upsert` y el
  `findFirstOrThrow`; asignar `centroFormacion` como texto literal a las cuentas
  de Administrador y Operador de prueba; verificar que `npx prisma db seed`
  termina sin error y las cuentas quedan con su centro.
- [x] 5.2 En `tests/e2e/seed.ts`, eliminar la creación de `CentroFormacion` y
  asignar `centroFormacion` en texto a las cuentas sembradas si el escenario lo
  necesita; verificar que el global setup del e2e completa.
- [x] 5.3 En `tests/helpers/factories.ts`, permitir `centroFormacion` opcional en
  `cuerpoInscripcion`; verificar que los tests existentes siguen compilando sin
  pasar el campo (queda `null`).
- [x] 5.4 Actualizar `CONTEXT.md`: quitar `CENTRO_FORMACION` de la tabla de
  entidades (§5), ajustar el paso 4 de la sección 3 ("centro de formación
  opcional, escrito por el titular") y reemplazar el ejemplo Zod de la sección 7
  (`centroFormacion` texto en vez de `centroFormacionId`).

## 6. Pruebas

- [x] 6.1 En `tests/integration/usuarios.test.ts`, quitar `centros_formacion` del
  `TRUNCATE` y la creación del centro; usar `centroFormacion` en texto para las
  altas válidas y agregar dos casos: Operador sin centro se crea, Administrador
  sin centro se rechaza con el error en `centroFormacion`.
- [x] 6.2 Agregar en `tests/integration/cupo.test.ts` (o en el test de
  inscripción que ya postea) un caso que envíe `centroFormacion` en el titular y
  verifique que se guarda como texto, y que un acompañante sin centro queda en
  `null`.
- [x] 6.3 En `tests/e2e/cuentas.spec.ts`, crear el Operador temporal con
  `centroFormacion` en texto en vez de `centroFormacionId`; verificar que el test
  de eliminación sigue pasando.
- [x] 6.4 En `tests/e2e/inscripcion.spec.ts`, reemplazar el `selectOption` del
  centro por `fill` sobre "Centro de formación"; verificar que la inscripción
  completa sigue creando titular y acompañante.
- [x] 6.5 Ejecutar `npm test` y verificar que toda la suite de integración pasa en
  la base de pruebas.

## 7. Verificación final

- [x] 7.1 Ejecutar `npx tsc --noEmit` y el lint del proyecto; verificar que no
  quedan referencias a `centroFormacionId`, `CentroFormacion` ni `regional` en
  `src/`, `prisma/` ni `tests/` (un `rg` sin resultados fuera de migraciones
  históricas).
- [x] 7.2 Ejecutar el e2e de Playwright contra el build de pruebas y verificar
  que inscripción, cuentas y gestión de claves pasan.
- [x] 7.3 Ejecutar `npx openspec validate centro-formacion-texto-libre --strict`
  y `npx openspec validate --specs --strict`; verificar que ambos quedan en verde.
- [x] 7.4 Verificación manual en el entorno de desarrollo: inscribir un titular
  escribiendo y omitiendo el centro, crear un Operador sin centro y un
  Administrador sin centro (debe rechazar), y comprobar que el reporte del evento
  y el listado de Cuentas muestran el texto guardado.
