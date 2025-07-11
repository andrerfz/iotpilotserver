# Simple single-stage build for development
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    python3 \
    make \
    g++ \
    git \
    postgresql-client \
    && apk upgrade --no-cache

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S iotpilot -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY app/package*.json ./

# Install ALL dependencies
RUN npm install

# Explicitly install Express if missing (debug step)
RUN npm list express || npm install express --save

# Verify Express installation
RUN ls -la node_modules/express/

# Copy entire app directory
COPY app/ ./

# Generate Prisma client
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# Build Next.js app
RUN npm run build

# Set proper ownership
RUN chown -R iotpilot:nodejs /app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to app user
USER iotpilot

# Expose port
EXPOSE 3000

# Make start script executable
RUN chmod +x start.sh

# Start the application using the startup script
CMD ["./start.sh"]