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
COPY postcss.config.cjs ./
COPY tailwind.config.js ./
COPY next.config.cjs ./
COPY tsconfig.json ./
COPY vitest.config.ts ./

# Install dependencies (handle both npm and yarn)
RUN if [ -f package-lock.json ]; then \
        npm install --include=dev && npm cache clean --force; \
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

# CRITICAL: Compile TypeScript to JavaScript
ENV NODE_ENV=production
RUN npm run build

# NEW: Compile all TypeScript files to JavaScript
RUN npx tsc --project tsconfig.json

# Verify build output
RUN ls -la .next/static/css/ || echo "No CSS files found"
RUN ls -la dist/ || echo "No compiled JS files found"

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

# Install production dependencies only
RUN if [ -f package-lock.json ]; then \
        npm install --omit=dev && npm cache clean --force; \
    elif [ -f yarn.lock ]; then \
        yarn install --frozen-lockfile --production && yarn cache clean; \
    else \
        npm install --omit=dev && npm cache clean --force; \
    fi

# Copy built Next.js application
COPY --from=base --chown=iotpilot:nodejs /app/.next ./.next

# Copy compiled JavaScript files
COPY --from=base --chown=iotpilot:nodejs /app/dist ./dist

# Copy static assets
COPY --from=base --chown=iotpilot:nodejs /app/public ./public

# Copy server file
COPY --from=base --chown=iotpilot:nodejs /app/server.cjs ./

# Copy configuration files
COPY --from=base --chown=iotpilot:nodejs /app/next.config.cjs ./
COPY --from=base --chown=iotpilot:nodejs /app/tailwind.config.js ./
COPY --from=base --chown=iotpilot:nodejs /app/postcss.config.cjs ./
COPY --from=base --chown=iotpilot:nodejs /app/tsconfig.json ./
COPY --from=base --chown=iotpilot:nodejs /app/next-env.d.ts ./
COPY --from=base --chown=iotpilot:nodejs /app/vitest.config.ts ./

# Copy Prisma files
COPY --from=base --chown=iotpilot:nodejs /app/prisma ./prisma

# Generate Prisma client in production
RUN npx prisma generate

# Copy start script
COPY --from=base --chown=iotpilot:nodejs /app/scripts/start-production.sh ./
RUN chmod +x start-production.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER iotpilot

# Expose port
EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application using compiled JavaScript
CMD ["./start-production.sh"]