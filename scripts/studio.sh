#!/usr/bin/env bash
# Abre Prisma Studio localmente contra la base de datos del contenedor db.
# Solo para uso en desarrollo -- nunca exponer en producción.
set -euo pipefail

docker compose up -d db
npx prisma studio
