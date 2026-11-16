# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/admin/package.json ./packages/admin/
RUN pnpm install --frozen-lockfile --filter rustikevi-web

FROM deps AS build
COPY vite.config.ts tsconfig.json server.mjs ./
COPY src ./src
COPY public ./public
RUN pnpm build

FROM node:22-alpine AS production
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/admin/package.json ./packages/admin/
RUN pnpm install --frozen-lockfile --prod --filter rustikevi-web && pnpm store prune
COPY --from=build /app/dist ./dist
COPY server.mjs ./

ENV NODE_ENV=production
EXPOSE 3000
USER node
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1
CMD ["node", "server.mjs"]
