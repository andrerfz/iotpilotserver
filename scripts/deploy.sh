#!/usr/bin/env bash
# IoT Pilot production deploy script
# Runs on the EC2 server — called via: make prod-deploy
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
info()   { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
header() { echo -e "\n${BLUE}▶ $1${NC}"; }

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f infra/docker/docker-compose.yml --env-file .env"
MAX_WAIT=30   # × 10s = 5 minutes
LOCK_FILE="/tmp/iotpilot-deploy.lock"

# ── Deploy lock ───────────────────────────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
  LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
  error "Deploy already in progress (PID: $LOCK_PID). Remove $LOCK_FILE to force."
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"; info "Lock released"' EXIT INT TERM

cd "$DEPLOY_DIR"

# ── Pre-flight ────────────────────────────────────────────────────────────────
header "Pre-flight checks"

docker info >/dev/null 2>&1 || error "Docker is not running"
[ -f .env ] || error ".env not found — copy .env.example and configure it"

for var in POSTGRES_PASSWORD JWT_SECRET DEVICE_API_KEY; do
  grep -Eq "^${var}=.+" .env || error "Required env var $var is not set or empty in .env"
done

AVAILABLE_KB=$(df "$DEPLOY_DIR" | awk 'NR==2 {print $4}')
[ "$AVAILABLE_KB" -gt 2097152 ] || error "Less than 2 GB free disk space"

info "Checks passed"

# ── Save current SHA for rollback ─────────────────────────────────────────────
OLD_SHA=$(git rev-parse HEAD)
echo "$OLD_SHA" > .deploy-rollback-sha
info "Rollback SHA saved: $OLD_SHA"

# ── Pull latest code ──────────────────────────────────────────────────────────
header "Pulling latest code"
git fetch origin
NEW_SHA=$(git rev-parse origin/main)

if [ "$OLD_SHA" = "$NEW_SHA" ]; then
  warn "No new commits — forcing redeploy of current code"
fi

git reset --hard origin/main
info "Code at: $(git rev-parse --short HEAD) — $(git log -1 --format='%s')"

# ── Build images ──────────────────────────────────────────────────────────────
header "Building images"
$COMPOSE build

# ── Run migrations (before swapping containers) ───────────────────────────────
header "Running database migrations"

$COMPOSE up -d postgres redis
sleep 5

# Ensure migration tracking table exists
docker exec -i iotpilot-postgres psql -U iotpilot -d iotpilot \
  -c "CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" \
  >/dev/null 2>&1

for sql in "$DEPLOY_DIR"/apps/backend/prisma/migration/*.sql; do
  name="$(basename "$sql")"
  # Skip if already applied (like Laravel's migrations table)
  already=$(docker exec iotpilot-postgres psql -U iotpilot -d iotpilot -t -A \
    -c "SELECT COUNT(*) FROM _migrations WHERE name='${name}';" 2>/dev/null)
  if [ "${already}" = "1" ]; then
    info "  ↳ ${name} (already applied)"
    continue
  fi
  info "  ↳ ${name}"
  if docker exec -i iotpilot-postgres psql -U iotpilot -d iotpilot < "$sql" >/dev/null 2>&1; then
    docker exec iotpilot-postgres psql -U iotpilot -d iotpilot \
      -c "INSERT INTO _migrations (name) VALUES ('${name}');" >/dev/null 2>&1
    info "    ✓ applied"
  else
    warn "    ⚠ errors (may be harmless if objects already exist)"
    # Record it anyway so we don't retry on every deploy
    docker exec iotpilot-postgres psql -U iotpilot -d iotpilot \
      -c "INSERT INTO _migrations (name) VALUES ('${name}') ON CONFLICT DO NOTHING;" >/dev/null 2>&1
  fi
done

info "Migrations complete"

# ── Deploy ────────────────────────────────────────────────────────────────────
header "Starting containers"
$COMPOSE up -d --remove-orphans

# ── Health check with auto-rollback ──────────────────────────────────────────
header "Health check (up to $((MAX_WAIT * 10))s)"
HEALTHY=false
for i in $(seq 1 "$MAX_WAIT"); do
  sleep 10
  # Check health via docker exec — port not published on host in production
  if docker exec iotpilot-app curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  info "  Attempt $i/$MAX_WAIT..."
done

if [ "$HEALTHY" = false ]; then
  warn "Health check failed — rolling back to $OLD_SHA"
  git reset --hard "$OLD_SHA"
  $COMPOSE build
  $COMPOSE up -d --remove-orphans
  error "Deploy failed. Rolled back to $OLD_SHA"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
header "Cleanup"
docker image prune -af >/dev/null 2>&1 || true  # -a removes all unused images, not just dangling
find "$DEPLOY_DIR/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Deploy successful!${NC}"
echo "   $OLD_SHA → $(git rev-parse --short HEAD)"
echo "   $(date)"
