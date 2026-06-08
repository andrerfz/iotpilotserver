#!/bin/sh
echo "[Backend] Starting..."

# Wait for PostgreSQL
echo "[Backend] Waiting for PostgreSQL..."
until pg_isready -h postgres -U "${POSTGRES_USER:-iotpilot}" -d "${POSTGRES_DB:-iotpilot}" 2>/dev/null; do
  sleep 1
done
echo "[Backend] PostgreSQL ready"

# Wait for Redis
echo "[Backend] Waiting for Redis..."
until nc -z redis 6379 2>/dev/null; do
  sleep 1
done
echo "[Backend] Redis ready"

# Run database migrations (schema in /app/apps/backend/prisma/)
echo "[Backend] Running Prisma migrations..."
SCHEMA=/app/apps/backend/prisma/schema.prisma
if [ -f /app/apps/backend/prisma/migration/001_initial_setup.sql ]; then
  HAS_TABLES=$(psql -h postgres -U "${POSTGRES_USER:-iotpilot}" -d "${POSTGRES_DB:-iotpilot}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)
  if [ "${HAS_TABLES:-0}" = "0" ]; then
    echo "[Backend] Empty database — applying initial SQL migration..."
    PGPASSWORD="${POSTGRES_PASSWORD:-iotpilot}" psql -h postgres -U "${POSTGRES_USER:-iotpilot}" \
      -d "${POSTGRES_DB:-iotpilot}" -f /app/apps/backend/prisma/migration/001_initial_setup.sql
  fi
fi
prisma migrate deploy --schema="$SCHEMA" 2>/dev/null || \
  echo "[Backend] migrate deploy warning (non-fatal)"

echo "[Backend] Generating Prisma client..."
prisma generate --schema="$SCHEMA"

exec npx tsx /app/apps/backend/src/server.ts
