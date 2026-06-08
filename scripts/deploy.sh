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
HEALTH_URL="http://localhost:3000/api/health"
MAX_WAIT=60   # × 10s = 10 minutes (t3.small needs more time)

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

for sql in "$DEPLOY_DIR"/apps/backend/prisma/migration/*.sql; do
  info "  ↳ $(basename "$sql")"
  docker exec -i iotpilot-postgres psql -U iotpilot -d iotpilot < "$sql" 2>&1 | grep -v "^$" | grep -Ev "^(ALTER|CREATE|INSERT|COMMENT|SET|SELECT)" || true
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
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
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
docker image prune -f >/dev/null 2>&1 || true
find "$DEPLOY_DIR/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Deploy successful!${NC}"
echo "   $OLD_SHA → $(git rev-parse --short HEAD)"
echo "   $(date)"
