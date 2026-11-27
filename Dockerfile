# syntax=docker/dockerfile:1

# Versión de Node fijada -- debe coincidir con .nvmrc para reproducibilidad
FROM node:24.15.0-alpine AS base

# ---- 1. Dependencias ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Genera el cliente de Prisma antes del build de Next.js
RUN npx prisma generate
RUN npm run build

# ---- 3. Migraciones (target del servicio "migrate") ----
# Reutiliza el stage "builder" (tiene el CLI de Prisma, el cliente generado y
# prisma7.config.ts). Aplica el esquema y los datos iniciales sobre una base
# limpia. No forma parte de la imagen final de la app.
FROM builder AS migrator
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

# ---- 4. Runtime ----
# Requiere output: 'standalone' en next.config.js
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated    
# El config de Prisma no se copia a la imagen final: las migraciones se aplican
# aparte con el servicio "migrate" (stage "migrator"), que sí tiene el CLI.

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
