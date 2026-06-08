#!/bin/bash
cd /app/apps/frontend
echo "🔧 Generating Prisma client..."
prisma generate --schema=/app/apps/backend/prisma/schema.prisma

echo "🚀 Starting Next.js dev server..."
exec npm run dev
