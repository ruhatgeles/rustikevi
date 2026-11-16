# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# Bağımlılıklar (geliştirme dahil — build için)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/admin/package.json ./packages/admin/
RUN pnpm install --frozen-lockfile --filter @rustikevi/api

# Build: index + migrate + seed giriş noktaları
FROM deps AS build
COPY packages/api ./packages/api
RUN pnpm --filter @rustikevi/api build

# Production
FROM node:22-alpine AS production
RUN corepack enable && apk add --no-cache su-exec
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/admin/package.json ./packages/admin/
RUN pnpm install --frozen-lockfile --prod --filter @rustikevi/api && pnpm store prune
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY packages/api/migrations ./packages/api/migrations
COPY packages/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/packages/api/uploads/products \
  && chown -R node:node /app/packages/api/uploads
WORKDIR /app/packages/api

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3001/api/health >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
