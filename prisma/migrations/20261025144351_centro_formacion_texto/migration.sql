-- El centro de formación deja de ser un catálogo y pasa a ser texto libre.
-- Orden importante: se agrega la columna nueva y se hace backfill desde
-- centros_formacion ANTES de eliminar la clave foránea, la columna vieja y la
-- tabla: son los únicos nombres existentes.

-- AddColumn
ALTER TABLE "asistentes" ADD COLUMN "centroFormacion" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "centroFormacion" TEXT;

-- Backfill (conserva el nombre del centro que tenía cada fila)
UPDATE "asistentes" AS a
SET "centroFormacion" = c."nombre"
FROM "centros_formacion" AS c
WHERE a."centroFormacionId" = c."id";

UPDATE "usuarios" AS u
SET "centroFormacion" = c."nombre"
FROM "centros_formacion" AS c
WHERE u."centroFormacionId" = c."id";

-- DropForeignKey
ALTER TABLE "asistentes" DROP CONSTRAINT "asistentes_centroFormacionId_fkey";
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_centroFormacionId_fkey";

-- DropColumn
ALTER TABLE "asistentes" DROP COLUMN "centroFormacionId";
ALTER TABLE "usuarios" DROP COLUMN "centroFormacionId";

-- DropTable
DROP TABLE "centros_formacion";
