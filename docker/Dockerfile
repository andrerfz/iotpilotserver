# Stage 1: Dependencies - Install all node_modules
FROM node:20-alpine AS deps

WORKDIR /app

# Install system dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY app/package*.json app/.npmrc ./

# Install ALL dependencies (including devDependencies)
# Using npm install instead of npm ci due to lock file sync issues
RUN npm install --legacy-peer-deps

# Stage 2: Builder - Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY app/ ./

# Generate Prisma client
RUN if [ -f prisma/schema.prisma ]; then npm run db:generate; fi

# Build Next.js app
RUN npm run build

# Stage 3: Development - Hot reload mode
FROM node:20-alpine AS development

# Install runtime system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    postgresql-client \
    && apk upgrade --no-cache

WORKDIR /app

# Set environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/app/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy only necessary files (source code will be mounted as volume)
COPY app/package*.json ./
COPY app/next.config.cjs ./next.config.cjs
COPY app/tsconfig.json ./tsconfig.json
COPY app/start.sh ./start.sh
COPY app/start-dev.sh ./start-dev.sh
COPY app/prisma ./prisma

# Generate Prisma client for development
RUN npm run db:generate

# Make start scripts executable
RUN chmod +x start.sh start-dev.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# NOTE: Running as root in development for file write permissions
# This is safe for local development only

# Start with dev mode (npm run dev)
CMD ["npm", "run", "dev"]

# Stage 4: Runner - Production runtime
FROM node:20-alpine AS runner

# Install runtime system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    postgresql-client \
    && apk upgrade --no-cache

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S iotpilot -u 1001 -G nodejs

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/app/node_modules/.bin:$PATH"
ENV NODE_PATH="/app/node_modules"

# Copy necessary files from builder
COPY --from=builder --chown=iotpilot:nodejs /app/package*.json ./
COPY --from=builder --chown=iotpilot:nodejs /app/.next ./.next
COPY --from=builder --chown=iotpilot:nodejs /app/public ./public
COPY --from=builder --chown=iotpilot:nodejs /app/server.cjs ./server.cjs
COPY --from=builder --chown=iotpilot:nodejs /app/prisma ./prisma
COPY --from=builder --chown=iotpilot:nodejs /app/start.sh ./start.sh
COPY --from=builder --chown=iotpilot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=iotpilot:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=iotpilot:nodejs /app/next.config.cjs ./next.config.cjs

# Make start script executable
RUN chmod +x start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to app user
USER iotpilot

# Expose port
EXPOSE 3000

# Start the application
CMD ["./start.sh"]
