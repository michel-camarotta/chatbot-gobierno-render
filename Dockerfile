# Asistente Ciudadano — imagen de producción.
# Multi-stage para instalar solo dependencias de producción y correr sin root.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY backend ./backend
COPY data ./data
COPY frontend ./frontend

# Ejecutar como usuario sin privilegios (SEG: superficie mínima).
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3001}/api/v1/health || exit 1

CMD ["node", "backend/server.js"]
