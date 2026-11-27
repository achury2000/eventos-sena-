#!/usr/bin/env bash
# Preparación inicial del entorno -- pensado para un integrante nuevo del equipo.
set -euo pipefail

echo "==> Preparando el entorno del proyecto..."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Archivo .env creado a partir de .env.example. Revísalo antes de continuar."
fi

echo "==> Instalando dependencias (npm ci, respeta el lockfile)..."
npm ci

echo "==> Levantando base de datos y almacenamiento (Docker)..."
docker compose up -d db storage

echo "==> Esperando a que la base de datos esté lista..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-user}" > /dev/null 2>&1; do
  sleep 1
done

echo "==> Aplicando migraciones de Prisma..."
npx prisma migrate dev

echo ""
echo "==> Listo. Corre ./scripts/dev.sh para iniciar el servidor de desarrollo."
