#!/bin/bash

echo "🔥 Starting development mode..."

# Wait for database
echo "⏳ Waiting for database..."
until pg_isready -h postgres -p 5432 -U "$POSTGRES_USER" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Start Next.js dev server
echo "🚀 Starting Next.js dev server..."
exec npm run dev
