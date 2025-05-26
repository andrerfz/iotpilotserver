# Multi-stage build for optimal size and security
FROM node:20-alpine AS base

# Install build dependencies and security updates
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    openssl \
    ca-certificates \
    && apk upgrade --no-cache

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY app/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --include=dev && npm cache clean --force

# Copy source code
COPY app/ .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    curl \
    bash \
    openssh-client \
    postgresql-client \
    dumb-init \
    tini \
    tzdata \
    && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S iotpilot -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=base --chown=iotpilot:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=iotpilot:nodejs /app/package*.json ./
COPY --from=base --chown=iotpilot:nodejs /app/.next ./.next
COPY --from=base --chown=iotpilot:nodejs /app/public ./public
COPY --from=base --chown=iotpilot:nodejs /app/prisma ./prisma
COPY --from=base --chown=iotpilot:nodejs /app/server.js ./
COPY --from=base --chown=iotpilot:nodejs /app/next.config.js ./

# Copy additional configuration files
COPY --chown=iotpilot:nodejs app/tailwind.config.js ./
COPY --chown=iotpilot:nodejs app/tsconfig.json ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs /app/tmp && \
    chown -R iotpilot:nodejs /app/data /app/logs /app/tmp && \
    chmod 755 /app/data /app/logs /app/tmp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER iotpilot

# Use tini as PID 1 to handle signals properly
ENTRYPOINT ["tini", "--"]

# Start the application
CMD ["node", "server.js"]

# Build info labels
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="iotpilot" \
      org.label-schema.description="IoT Device Management Platform" \
      org.label-schema.url="https://github.com/andrerfz/iotpilot" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/andrerfz/iotpilot" \
      org.label-schema.vendor="IoTPilot" \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0"