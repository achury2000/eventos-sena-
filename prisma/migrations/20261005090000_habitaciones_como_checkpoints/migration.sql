-- AlterTable: token de estación del cuarto (se rellena para filas existentes)
ALTER TABLE "habitaciones" ADD COLUMN "codigoQr" TEXT;

-- Backfill: un codigoQr único por habitación existente
UPDATE "habitaciones"
SET "codigoQr" = gen_random_uuid()::text
WHERE "codigoQr" IS NULL;

-- AlterTable
ALTER TABLE "habitaciones" ALTER COLUMN "codigoQr" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "habitaciones_codigoQr_key" ON "habitaciones"("codigoQr");

-- AlterTable: vínculo 1:1 de la habitación con su checkpoint
ALTER TABLE "checkpoints" ADD COLUMN "habitacionId" TEXT;

-- Backfill: crear el checkpoint de cada habitación existente (ALOJAMIENTO, activo)
INSERT INTO "checkpoints" ("id", "eventoId", "nombre", "tipo", "codigoQr", "activo", "habitacionId", "creadoEn", "actualizadoEn")
SELECT gen_random_uuid()::text,
       h."eventoId",
       'Habitación ' || h."identificador",
       'ALOJAMIENTO',
       gen_random_uuid()::text,
       true,
       h."id",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "habitaciones" h;

-- CreateIndex
CREATE UNIQUE INDEX "checkpoints_habitacionId_key" ON "checkpoints"("habitacionId");

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "habitaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;