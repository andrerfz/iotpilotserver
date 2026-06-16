# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies — install all workspace packages via pnpm
# /app = monorepo workspace root
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++ && corepack enable

# Copy workspace manifests only (no source code)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend-ng/package.json  apps/frontend-ng/
COPY apps/backend/package.json      apps/backend/
COPY apps/worker/package.json       apps/worker/
COPY packages/core/package.json     packages/core/

RUN pnpm install --frozen-lockfile

# Tar frontend-ng/node_modules preserving pnpm symlinks.
# Docker COPY --from dereferences symlinks, which breaks pnpm's virtual store:
# echarts becomes a real dir and webpack can no longer find zrender (a pnpm
# store sibling, not a direct dep). Tar preserves the symlinks; target stages
# extract with tar instead of COPY so the links survive.
RUN tar -czf /tmp/frontend-ng-nm.tar.gz -C /app/apps/frontend-ng node_modules

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Development — hot-reload mode for backend + worker
# Source code is volume-mounted at runtime; node_modules stay in the image.
# docker-compose overrides CMD per service (backend vs worker).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS development

RUN apk add --no-cache curl bash postgresql-client netcat-openbsd \
    && apk upgrade --no-cache

WORKDIR /app

ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

# Copy workspace node_modules from deps stage
COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /app/apps/backend/node_modules       ./apps/backend/node_modules
COPY --from=deps /app/apps/worker/node_modules        ./apps/worker/node_modules
COPY --from=deps /app/packages/core/node_modules      ./packages/core/node_modules

# Copy static workspace config (source code is volume-mounted at runtime)
COPY tsconfig.base.json    ./
COPY pnpm-workspace.yaml   ./
COPY packages/core/tsconfig.json   ./packages/core/
COPY packages/core/package.json    ./packages/core/

COPY apps/backend/package.json   ./apps/backend/
COPY apps/backend/tsconfig.json  ./apps/backend/
COPY apps/backend/start.sh       ./apps/backend/start.sh

COPY apps/worker/package.json    ./apps/worker/
COPY apps/worker/tsconfig.json   ./apps/worker/
COPY apps/worker/start.sh        ./apps/worker/start.sh

# Prisma schema available before volume mount for initial prisma generate
COPY apps/backend/prisma/ ./apps/backend/prisma/
# Run from apps/backend so Prisma infers project root correctly and finds @prisma/client
RUN cd /app/apps/backend && prisma generate --schema=./prisma/schema.prisma

RUN chmod +x apps/backend/start.sh apps/worker/start.sh

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3100/api/health || exit 1

EXPOSE 3100

CMD ["sh", "/app/apps/backend/start.sh"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Development (frontend-ng) — Ionic/Angular dev server with HMR
# Source is volume-mounted at runtime; node_modules stay in the image (pnpm symlinks).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS development-ng

RUN apk add --no-cache curl bash && apk upgrade --no-cache

WORKDIR /app

ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:/app/apps/frontend-ng/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

# Workspace node_modules from deps stage (root + frontend-ng pnpm symlinks).
# Root node_modules: COPY --from is fine here (symlinks in .pnpm are internal).
# frontend-ng/node_modules: extract from tar to preserve pnpm symlinks that
# COPY --from would dereference, breaking webpack resolution of transitive deps.
COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /tmp/frontend-ng-nm.tar.gz           /tmp/frontend-ng-nm.tar.gz
RUN tar -xzf /tmp/frontend-ng-nm.tar.gz -C /app/apps/frontend-ng \
    && rm /tmp/frontend-ng-nm.tar.gz

# Static workspace + app config (source is volume-mounted at runtime)
COPY pnpm-workspace.yaml   ./
COPY apps/frontend-ng/package.json       ./apps/frontend-ng/
COPY apps/frontend-ng/angular.json       ./apps/frontend-ng/
COPY apps/frontend-ng/tsconfig.json      ./apps/frontend-ng/
COPY apps/frontend-ng/tsconfig.app.json  ./apps/frontend-ng/
COPY apps/frontend-ng/tsconfig.spec.json ./apps/frontend-ng/
COPY apps/frontend-ng/tailwind.config.ts ./apps/frontend-ng/
COPY apps/frontend-ng/vitest.config.ts   ./apps/frontend-ng/
COPY apps/frontend-ng/eslint.config.js   ./apps/frontend-ng/
COPY apps/frontend-ng/proxy.conf.js      ./apps/frontend-ng/

WORKDIR /app/apps/frontend-ng

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4200 || exit 1

EXPOSE 4200

# --poll: inotify is unreliable on bind mounts (esp. macOS) — poll for HMR.
# --disable-host-check: allow access via the mapped host port / Traefik.
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000", "--disable-host-check"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: builder-ng — Angular production build (outputs to www/)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder-ng

WORKDIR /app

ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:/app/apps/frontend-ng/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /tmp/frontend-ng-nm.tar.gz           /tmp/frontend-ng-nm.tar.gz
RUN tar -xzf /tmp/frontend-ng-nm.tar.gz -C /app/apps/frontend-ng \
    && rm /tmp/frontend-ng-nm.tar.gz

COPY pnpm-workspace.yaml   ./
COPY apps/frontend-ng/     ./apps/frontend-ng/

WORKDIR /app/apps/frontend-ng

RUN ng build --configuration production

# ─────────────────────────────────────────────────────────────────────────────
# Stage 5: production-ng — nginx static server with SPA routing
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS production-ng

COPY infra/nginx/frontend-ng.conf /etc/nginx/conf.d/default.conf
COPY --from=builder-ng /app/apps/frontend-ng/www /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/index.html || exit 1

EXPOSE 80
