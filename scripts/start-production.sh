#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info "🚀 Starting IoT Pilot..."

# Wait for database
info "⏳ Waiting for database..."
until pg_isready -h postgres -p 5432; do
  sleep 1
done
info "✅ Database is ready!"

# Check database tables
info "🗄️ Checking database tables..."
if [ -f prisma/schema.prisma ]; then
    if npx prisma db push --accept-data-loss 2>/dev/null; then
        info "✅ Database schema is up to date"
    else
        warn "⚠️ Database schema update failed, continuing..."
    fi
fi

# Generate Prisma client
info "🔧 Generating Prisma client..."
if [ -f prisma/schema.prisma ]; then
    npx prisma generate || warn "⚠️ Prisma client generation failed"
    info "✅ Prisma client generated"
fi

# Verify database connection
info "🔍 Verifying database connection..."
if node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('Database connection successful');
    return prisma.\$disconnect();
  })
  .catch(e => {
    console.error('Database connection failed:', e);
    process.exit(1);
  });
" 2>/dev/null; then
    info "✅ Database verification passed"
else
    error "❌ Database verification failed"
fi

# Start the application
info "🎉 Starting the application..."

# Use the compiled JavaScript instead of TypeScript
if [ -f "server.cjs" ]; then
    exec node server.cjs
elif [ -f "dist/server.js" ]; then
    exec node dist/server.js
else
    # Fallback to Next.js start
    exec npm start
fi