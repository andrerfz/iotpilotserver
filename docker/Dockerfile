# Multi-stage build for optimal size
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    bash \
    openssh-client \
    postgresql-client \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S iotpilot -u 1001

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=iotpilot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=iotpilot:nodejs /app/package*.json ./
COPY --from=builder --chown=iotpilot:nodejs /app/.next ./.next
COPY --from=builder --chown=iotpilot:nodejs /app/public ./public
COPY --chown=iotpilot:nodejs . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs && \
    chown -R iotpilot:nodejs /app/data /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER iotpilot

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]