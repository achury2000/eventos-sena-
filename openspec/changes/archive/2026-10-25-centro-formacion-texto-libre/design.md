# Design

## Context

Ver `proposal.md` — Why. Estado actual relevante para la implementación:

- `CentroFormacion` (`id`, `nombre`, `regional`) se relaciona con `Usuario` y
  `Asistente` por `centroFormacionId` (ambos nullable). Las únicas filas que
  existen son las seis de `prisma/seed.ts`; no hay CRUD.
- El nombre del centro se lee en tres lugares: listado de Cuentas
  (`u.centroFormacion.nombre (regional)`), reporte por asistente
  (`a.centroFormacion?.nombre`) y exportación a Excel (`a.centroFormacion`).
  `regional` no se usa en ninguna otra parte.
- Dos validaciones distintas capturan el id: `validations/inscripcion.ts`
  (`centroOpcional`, texto libre de 1–200, opcional) y `validations/admin.ts`
  (`z.string().min(1)`, obligatorio para ambos roles).
- `prisma/migrations/` tiene cinco migraciones con fecha; el flujo del repo es
  `prisma migrate dev` (el proyecto usa Prisma 7 con driver adapter).

## Goals / Non-Goals

**Goals:**

- Que cualquier persona pueda declarar el centro al que pertenece, sin catálogo
  ni mantenimiento, conservando el dato histórico de las filas existentes.
- Que la obligatoriedad coincida con la política: Administrador (SENA) →
  obligatorio; Operador (SENA o externo) → opcional; titular de inscripción →
  opcional; acompañante → sin campo.
- Mantener el nombre del centro visible donde ya se mostraba, sin agregaciones
  nuevas ni cambios en los reportes.

**Non-Goals:**

- Construir el CRUD o la importación de la lista oficial de centros del SENA.
- Sugerencias/autocompletado contra el catálogo (`datalist`): sin catálogo
  mantenido, sugeriría nombres desactualizados o inexistentes.
- Validar que el texto corresponda a un centro real o normalizar variantes
  (mayúsculas, tildes, siglas).
- Agrupar, contar o filtrar por centro o regional en reportes.
- Hacer obligatorio el centro del titular (decisión vigente: opcional).

## Decisions

### D1. Texto libre en lugar de catálogo

El centro se captura en un `Input` de texto. Alternativas consideradas:

- **CRUD de centros**: es exactamente el mantenimiento que se quiere evitar y
  exige asignar un responsable de cargar y depurar la lista.
- **Catálogo cargado una vez + `<select>`**: sigue sin poder declarar un centro
  nuevo o renombrado y reintroduce el bloqueo de cuenta cuando la tabla está
  vacía.
- **`<select>` con `datalist`**: mezcla lo peor de ambos: el valor guardado
  depende de que la persona elija la sugerencia, y las sugerencias envejecen.

El dato es descriptivo y no se agrega, así que un texto es el modelo correcto.

### D2. Se retira `CentroFormacion`; el centro vive como texto en la persona

Se agrega `centroFormacion String?` a `Usuario` y `Asistente`, se hace backfill
con el nombre actual y se eliminan las claves foráneas, las columnas
`centroFormacionId` y la tabla `centros_formacion`.

Alternativa considerada (**conservar la tabla y auto-crear filas** cuando el
texto no existe): evita la migración y deja intactos los consumidores, pero
mantiene viva una tabla que nadie administra y que crece con escrituras del
formulario público; produce filas sin `regional` (el listado mostraría
"Centro X (—)"), ids derivados de texto arbitrario y variantes duplicadas. Ese
híbrido simula un catálogo que ya no existe; el texto plano es más honesto y el
alcance de lectura es acotado (tres sitios).

La migración se escribe como una sola migración con orden explícito: agregar
columnas → backfill desde `centros_formacion` → quitar FK y columnas → `DROP
TABLE`. El backfill va antes del `DROP` porque es la única copia de los nombres
existentes.

### D3. Obligatoriedad por rol, validada en el servidor

`usuarioSchema` deja de recibir el id y recibe `centroFormacion` como texto
opcional; un `superRefine` agrega el error en `path: ["centroFormacion"]` cuando
`rol === "ADMINISTRADOR"` y el texto está vacío. Se mantiene el mismo objeto (en
vez de una `discriminatedUnion` por rol) para no duplicar los seis campos
compartidos y para que `fieldErrors` siga leyendo un único `safeParse`.

Se keyea por **rol** (no por `tipoAfiliacion`): es la regla enunciada —los
Administradores son personal del SENA, los Operadores pueden ser externos— y no
depende de que alguien recuerde marcar `tipoAfiliacion = SENA` al crear un
Administrador. La consecuencia es que un Administrador marcado como `EXTERNO`
seguiría obligado a declarar centro; esa combinación no existe por política y
queda fuera de alcance.

En el formulario, el atributo HTML `required` del centro se activa solo cuando el
rol seleccionado es `ADMINISTRADOR` (el `<select>` de rol pasa a ser controlado),
y un texto de ayuda lo hace explícito. La validación de cliente es solo UX: el
servidor rechaza igual.

### D4. Longitud y normalización del texto

`trim`, mínimo 3 caracteres cuando se declara y máximo 200 (el techo que ya usa
la inscripción). No se normaliza a mayúsculas ni se colapsan tildes/siglas: se
guarda lo que la persona escribió. Con un dato que no se agrega, "corregir" el
texto solo agrega una regla que el sistema no puede sostener (no conoce la lista
oficial) y que podría rechazar nombres legítimos.

### D5. El campo se llama `centroFormacion` en todo el flujo

Renombrar `centroFormacionId` → `centroFormacion` en el esquema de Zod, el
`FormData` de Cuentas y el JSON de `POST /api/inscripciones` evita un nombre que
miente sobre el contenido (deja de ser un id). Es un cambio incompatible del
contrato interno del formulario; no hay consumidores externos conocidos (el
único cliente es la app) y la ruta pública no está documentada como API estable.
Se actualizan formularios y pruebas en el mismo cambio.

### D6. Los consumidores leen el texto y pierden la regional

- Listado de Cuentas: `u.centroFormacion ?? "—"` y se retira el `include`. La
  columna "Centro" sigue existiendo; para un Operador sin centro se muestra "—".
- Reporte (`cargar-reporte.ts`): el `select` pasa a `centroFormacion: true` y el
  mapeo a `a.centroFormacion ?? null`; `AsistenteReporte.centroFormacion` sigue
  siendo `string | null`, así que la tabla y el Excel no cambian.
- `nuevo/page.tsx`: se elimina la consulta del catálogo y el `notFound()` que
  impedía crear cuentas sin filas sembradas.
- `seed.ts`: las cuentas de prueba reciben el nombre de un centro como texto; se
  elimina el bloque de siembra de centros.

### D7. Documentación

`CONTEXT.md` describe el catálogo como entidad y muestra un ejemplo de validación
con `centroFormacionId`; ambos se actualizan (sección 5 y sección 7). La sección 3
se ajusta para decir que el titular declara su centro como texto opcional.

## Risks / Trade-offs

- **Sin catálogo, no hay forma de agrupar por centro ni de garantizar nombres
  canónicos** → aceptado: hoy no se agrupa y la finalidad es descriptiva. Si en
  el futuro se necesita el agrupamiento, exigirá un catálogo y una normalización
  de datos, no solo un cambio de control.
- **El texto puede tener errores de tipeo o centros inexistentes** → aceptado:
  es un dato autodeclarado de pertenencia; ninguna regla del sistema depende de
  él.
- **La migración elimina la tabla y no tiene reversa automática** → el backfill
  conserva los nombres; antes de aplicarla en un entorno con datos se verifica
  el conteo de filas con centro no nulo contra las filas con `centroFormacion`
  poblado. En local, `prisma migrate reset` restaura desde cero.
- **Despliegue desacoplado de la migración**: si la app nueva arranca antes de la
  migración, las consultas a `centroFormacion` fallan. La migración va en el
  mismo despliegue (el repo ya aplica migraciones al levantar el contenedor).
- **Cambio de contrato del formulario**: un cliente viejo que envíe
  `centroFormacionId` no será rechazado por el esquema (el campo se ignora) y el
  centro se guardará vacío. No hay clientes externos; el formulario se despliega
  junto con el servidor.
- **Cuentas viejas con `centroFormacionId`**: el backfill las conserva; las que
  no tenían centro quedan en `NULL` y se muestran como "—", igual que hoy.

## Migration Plan

1. `prisma migrate dev --create-only --name centro_formacion_texto` y editar el
   SQL para que quede en este orden:
   `ALTER TABLE usuarios ADD COLUMN "centroFormacion" TEXT` y lo mismo en
   `asistentes`; `UPDATE ... SET "centroFormacion" = c.nombre FROM
   centros_formacion c WHERE ...`; `ALTER TABLE ... DROP CONSTRAINT` de las FK;
   `ALTER TABLE ... DROP COLUMN "centroFormacionId"`; `DROP TABLE
   centros_formacion`.
2. Aplicar (`prisma migrate dev` en local, `migrate deploy` en el contenedor) y
   regenerar el cliente de Prisma.
3. Desplegar la app junto con la migración; verificar en el listado de Cuentas y
   en el reporte de un evento que los nombres siguen apareciendo.
4. Rollback: no hay migración inversa. En un entorno con datos, restaurar el
   respaldo previo; en desarrollo, `prisma migrate reset` seguido del seed.
