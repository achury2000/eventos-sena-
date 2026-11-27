-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR', 'OPERADOR');

-- CreateEnum
CREATE TYPE "TipoAfiliacion" AS ENUM ('SENA', 'EXTERNO');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('PLANEADO', 'INSCRIPCIONES_ABIERTAS', 'CERRADO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoCheckpoint" AS ENUM ('COMIDA', 'TRANSPORTE', 'ALOJAMIENTO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('INSCRITO', 'CONFIRMADO', 'NO_ASISTIO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MetodoRegistro" AS ENUM ('AUTOREGISTRO', 'MANUAL');

-- CreateTable
CREATE TABLE "centros_formacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "regional" TEXT NOT NULL,

    CONSTRAINT "centros_formacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "tipoAfiliacion" "TipoAfiliacion" NOT NULL DEFAULT 'SENA',
    "centroFormacionId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "lugar" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "inscripcionApertura" TIMESTAMP(3) NOT NULL,
    "inscripcionCierre" TIMESTAMP(3) NOT NULL,
    "cupoMaximo" INTEGER NOT NULL,
    "cuposOcupados" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'PLANEADO',
    "incluyeHotel" BOOLEAN NOT NULL DEFAULT false,
    "incluyeBus" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_operadores" (
    "eventoId" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,

    CONSTRAINT "evento_operadores_pkey" PRIMARY KEY ("eventoId","operadorId")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCheckpoint" NOT NULL,
    "codigoQr" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "activadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "correo" TEXT,
    "firmaUrl" TEXT NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'INSCRITO',
    "aceptoTratamientoDatos" BOOLEAN NOT NULL,
    "fechaAceptacionTratamiento" TIMESTAMP(3) NOT NULL,
    "fechaInscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistentes" (
    "id" TEXT NOT NULL,
    "inscripcionId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "centroFormacionId" TEXT,
    "esTitular" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_control" (
    "id" TEXT NOT NULL,
    "asistenteId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "operadorId" TEXT,
    "metodo" "MetodoRegistro" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habitaciones" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,

    CONSTRAINT "habitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistente_habitaciones" (
    "asistenteId" TEXT NOT NULL,
    "habitacionId" TEXT NOT NULL,

    CONSTRAINT "asistente_habitaciones_pkey" PRIMARY KEY ("asistenteId","habitacionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_documento_key" ON "usuarios"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "checkpoints_codigoQr_key" ON "checkpoints"("codigoQr");

-- CreateIndex
CREATE UNIQUE INDEX "asistentes_eventoId_documento_key" ON "asistentes"("eventoId", "documento");

-- CreateIndex
CREATE INDEX "registros_control_checkpointId_idx" ON "registros_control"("checkpointId");

-- CreateIndex
CREATE UNIQUE INDEX "registros_control_asistenteId_checkpointId_key" ON "registros_control"("asistenteId", "checkpointId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_centroFormacionId_fkey" FOREIGN KEY ("centroFormacionId") REFERENCES "centros_formacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operadores" ADD CONSTRAINT "evento_operadores_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_operadores" ADD CONSTRAINT "evento_operadores_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_activadoPorId_fkey" FOREIGN KEY ("activadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistentes" ADD CONSTRAINT "asistentes_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistentes" ADD CONSTRAINT "asistentes_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistentes" ADD CONSTRAINT "asistentes_centroFormacionId_fkey" FOREIGN KEY ("centroFormacionId") REFERENCES "centros_formacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_control" ADD CONSTRAINT "registros_control_asistenteId_fkey" FOREIGN KEY ("asistenteId") REFERENCES "asistentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_control" ADD CONSTRAINT "registros_control_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_control" ADD CONSTRAINT "registros_control_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habitaciones" ADD CONSTRAINT "habitaciones_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistente_habitaciones" ADD CONSTRAINT "asistente_habitaciones_asistenteId_fkey" FOREIGN KEY ("asistenteId") REFERENCES "asistentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistente_habitaciones" ADD CONSTRAINT "asistente_habitaciones_habitacionId_fkey" FOREIGN KEY ("habitacionId") REFERENCES "habitaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
