#!/usr/bin/env bash
# Aplica migraciones de Prisma. Acepta los mismos argumentos que "prisma migrate dev".
set -euo pipefail

echo "==> Levantando base de datos (si no está corriendo)..."
docker compose up -d db

echo "==> Aplicando migraciones de Prisma..."
npx prisma migrate dev "$@"
