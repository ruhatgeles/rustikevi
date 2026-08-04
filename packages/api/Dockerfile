FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/admin/package.json ./packages/admin/
RUN pnpm install --frozen-lockfile

# Build API
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY packages/api ./packages/api
WORKDIR /app/packages/api
RUN npx tsup src/index.ts --format esm --clean

# Production
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/api/migrations ./packages/api/migrations
COPY --from=build /app/packages/api/src/db ./packages/api/src/db
COPY --from=build /app/packages/api/src/lib/password.ts ./packages/api/src/lib/password.ts
COPY packages/api/drizzle.config.ts ./packages/api/
COPY packages/api/tsconfig.json ./packages/api/
RUN pnpm install --frozen-lockfile --prod --filter @rustikevi/api
WORKDIR /app/packages/api

ENV NODE_ENV=production
EXPOSE 3001

# Create uploads directory
RUN mkdir -p /app/packages/api/uploads/products

CMD ["node", "dist/index.js"]
