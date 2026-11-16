# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/admin/package.json ./packages/admin/
RUN pnpm install --frozen-lockfile --filter @rustikevi/admin

FROM deps AS build
COPY packages/admin ./packages/admin
# API'ye aynı origin'den (/api → nginx proxy) erişilir; build'e adres gömülmez
RUN pnpm --filter @rustikevi/admin build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/packages/admin/dist /usr/share/nginx/html
COPY packages/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3002
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3002/healthz >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
