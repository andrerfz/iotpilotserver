# Multi-stage build for optimal size and security
FROM node:20-alpine AS base

# Install build dependencies and security updates
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    openssl \
    openssl-dev \
    ca-certificates \
    && apk upgrade --no-cache

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY next.config.js ./
COPY tsconfig.json ./

# Install dependencies (handle both npm and yarn)
RUN if [ -f package-lock.json ]; then \
        npm ci --include=dev && npm cache clean --force; \
    elif [ -f yarn.lock ]; then \
        yarn install --frozen-lockfile && yarn cache clean; \
    else \
        npm install --include=dev && npm cache clean --force; \
    fi

# Copy source code
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Generate Prisma client if schema exists
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# CRITICAL: Build with proper environment for Tailwind
ENV NODE_ENV=production
RUN npm run build

# Verify CSS was built properly
RUN ls -la .next/static/css/ || echo "No CSS files found"

# Production stage
FROM node:20-alpine3.18 AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    bash \
    openssh-client \
    postgresql-client \
    dumb-init \
    tini \
    tzdata \
    jq \
    openssl \
    openssl-dev \
    libc6-compat \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S iotpilot -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files first
COPY --from=base --chown=iotpilot:nodejs /app/package*.json ./

# CRITICAL: Fresh install in production with clean slate
RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev && npm cache clean --force; \
    elif [ -f yarn.lock ]; then \
        yarn install --frozen-lockfile --production && yarn cache clean; \
    else \
        npm install --omit=dev && npm cache clean --force; \
    fi

# Copy built Next.js application
COPY --from=base --chown=iotpilot:nodejs /app/.next ./.next

# Copy static assets
COPY --from=base --chown=iotpilot:nodejs /app/public ./public

# Copy server file
COPY --from=base --chown=iotpilot:nodejs /app/server.js ./

# Copy configuration files
COPY --from=base --chown=iotpilot:nodejs /app/next.config.js ./
COPY --from=base --chown=iotpilot:nodejs /app/tailwind.config.js ./
COPY --from=base --chown=iotpilot:nodejs /app/postcss.config.js ./
COPY --from=base --chown=iotpilot:nodejs /app/tsconfig.json ./
COPY --from=base --chown=iotpilot:nodejs /app/next-env.d.ts ./

# Copy Prisma files and ensure Prisma is available
COPY --from=base --chown=iotpilot:nodejs /app/prisma ./prisma

# Generate Prisma client in production
RUN npx prisma generate

# Copy source directory (needed for API routes in Next.js 14 app directory)
COPY --from=base --chown=iotpilot:nodejs /app/src ./src

# Copy migration file if it exists
COPY --from=base --chown=iotpilot:nodejs /app/prisma/migration/001_initial_setup.sql ./migration.sql

# Copy startup script
COPY --from=base --chown=iotpilot:nodejs /app/start.sh ./start.sh

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs /app/tmp && \
    chown -R iotpilot:nodejs /app && \
    chmod -R 755 /app && \
    chmod +x ./start.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER iotpilot

# Use tini as PID 1 to handle signals properly
ENTRYPOINT ["tini", "--"]

# Start with migration script
CMD ["env", "./start.sh"]