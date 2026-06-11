# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies — install all workspace packages via pnpm
# /app = monorepo workspace root
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++ && corepack enable

# Copy workspace manifests only (no source code)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json     apps/frontend/
COPY apps/frontend-ng/package.json  apps/frontend-ng/
COPY apps/backend/package.json      apps/backend/
COPY apps/worker/package.json       apps/worker/
COPY packages/core/package.json     packages/core/

RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Builder — compile Next.js frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

ENV PATH="/app/node_modules/.bin:$PATH"

# NEXT_PUBLIC_ vars must be declared as ARGs and set as ENVs
# so Next.js bakes them into the client bundle at build time
ARG NEXT_PUBLIC_DOMAIN_TUNEL
ARG NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL
ARG NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DOMAIN_TUNEL=$NEXT_PUBLIC_DOMAIN_TUNEL
ENV NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL=$NEXT_PUBLIC_GRAFANA_CLOUDFLARE_URL
ENV NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL=$NEXT_PUBLIC_INFLUXDB_CLOUDFLARE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /app/apps/frontend/node_modules      ./apps/frontend/node_modules
COPY --from=deps /app/apps/backend/node_modules       ./apps/backend/node_modules
COPY --from=deps /app/apps/worker/node_modules        ./apps/worker/node_modules
COPY --from=deps /app/packages/core/node_modules      ./packages/core/node_modules

# Copy source
COPY tsconfig.base.json ./
COPY packages/           ./packages/
COPY apps/frontend/      ./apps/frontend/
COPY apps/backend/prisma/ ./apps/backend/prisma/

# Generate Prisma client, then build Next.js
RUN cd /app/apps/backend && prisma generate --schema=./prisma/schema.prisma
RUN cd apps/frontend && NODE_OPTIONS="--max_old_space_size=1536" npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Development — hot-reload mode (source mounted as volumes)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS development

RUN apk add --no-cache curl bash postgresql-client netcat-openbsd \
    && apk upgrade --no-cache

WORKDIR /app

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/app/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

# Copy workspace node_modules from deps stage
COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /app/apps/frontend/node_modules      ./apps/frontend/node_modules
COPY --from=deps /app/apps/backend/node_modules       ./apps/backend/node_modules
COPY --from=deps /app/apps/worker/node_modules        ./apps/worker/node_modules
COPY --from=deps /app/packages/core/node_modules      ./packages/core/node_modules

# Copy static workspace config (source code is volume-mounted at runtime)
COPY tsconfig.base.json    ./
COPY pnpm-workspace.yaml   ./
COPY packages/core/tsconfig.json   ./packages/core/
COPY packages/core/package.json    ./packages/core/

COPY apps/frontend/package.json          ./apps/frontend/
COPY apps/frontend/next.config.cjs       ./apps/frontend/next.config.cjs
COPY apps/frontend/tsconfig.json         ./apps/frontend/tsconfig.json
COPY apps/frontend/vitest.config.ts      ./apps/frontend/vitest.config.ts
COPY apps/frontend/tailwind.config.cjs   ./apps/frontend/tailwind.config.cjs
COPY apps/frontend/postcss.config.cjs    ./apps/frontend/postcss.config.cjs
COPY apps/frontend/.eslintrc.json        ./apps/frontend/.eslintrc.json
COPY apps/frontend/start.sh              ./apps/frontend/start.sh
COPY apps/frontend/start-dev.sh          ./apps/frontend/start-dev.sh

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

RUN chmod +x apps/frontend/start.sh apps/frontend/start-dev.sh \
             apps/backend/start.sh apps/worker/start.sh

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["sh", "/app/apps/frontend/start-dev.sh"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3b: Development (frontend-ng) — Ionic/Angular dev server with HMR
# Runs alongside the legacy Next.js frontend on a separate port. Source is
# volume-mounted at runtime; node_modules stay in the image (pnpm symlinks).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS development-ng

RUN apk add --no-cache curl bash && apk upgrade --no-cache

WORKDIR /app

ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:/app/apps/frontend-ng/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

# Workspace node_modules from deps stage (root + frontend-ng pnpm symlinks)
COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /app/apps/frontend-ng/node_modules   ./apps/frontend-ng/node_modules

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
# Stage 3c: builder-ng — Angular production build (outputs to www/)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder-ng

WORKDIR /app

ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:/app/apps/frontend-ng/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /app/apps/frontend-ng/node_modules   ./apps/frontend-ng/node_modules

COPY pnpm-workspace.yaml   ./
COPY apps/frontend-ng/     ./apps/frontend-ng/

WORKDIR /app/apps/frontend-ng

RUN ng build --configuration production

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3d: production-ng — nginx static server with SPA routing
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS production-ng

COPY infra/nginx/frontend-ng.conf /etc/nginx/conf.d/default.conf
COPY --from=builder-ng /app/apps/frontend-ng/www /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/index.html || exit 1

EXPOSE 80

# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: Runner — production runtime (minimal image)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache curl bash && apk upgrade --no-cache

RUN addgroup -g 1001 -S nodejs && adduser -S iotpilot -u 1001 -G nodejs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/app/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

COPY --from=builder --chown=iotpilot:nodejs /app/node_modules                ./node_modules
COPY --from=builder --chown=iotpilot:nodejs /app/apps/frontend/node_modules  ./apps/frontend/node_modules
COPY --from=builder --chown=iotpilot:nodejs /app/apps/frontend/.next         ./apps/frontend/.next
COPY --from=builder --chown=iotpilot:nodejs /app/apps/frontend/public        ./apps/frontend/public
COPY --from=builder --chown=iotpilot:nodejs /app/apps/frontend/package.json  ./apps/frontend/package.json
COPY --from=builder --chown=iotpilot:nodejs /app/apps/frontend/next.config.cjs ./apps/frontend/next.config.cjs
COPY --from=builder --chown=iotpilot:nodejs /app/apps/frontend/start.sh      ./apps/frontend/start.sh

RUN chmod +x apps/frontend/start.sh && chown -R iotpilot:nodejs /app

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

USER iotpilot
EXPOSE 3000
CMD ["sh", "/app/apps/frontend/start.sh"]
