#!/bin/sh
echo "[Worker] Starting..."

# Wait for Redis
echo "[Worker] Waiting for Redis..."
until nc -z redis 6379 2>/dev/null; do
  sleep 1
done
echo "[Worker] Redis ready"

exec npx tsx /app/apps/worker/src/index.ts
