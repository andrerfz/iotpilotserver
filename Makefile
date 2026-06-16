# IotPilot Server Management Makefile

.PHONY: help install start stop restart logs status clean build deploy backup restore update
.PHONY: device-preregister device-flash device-toolchain-install
.PHONY: device-flash-esp32c3 device-toolchain-install-esp32c3
.PHONY: device-flash-heltec32v3 device-toolchain-install-heltec32v3
.PHONY: device-serial
.PHONY: local-install local-start local-stop local-restart local-restart-app local-recreate-app local-status local-clean
.PHONY: dev-start dev-stop dev-restart dev-logs dev-shell
.PHONY: local-logs-app local-logs-influxdb local-logs-loki local-logs-postgres local-logs-redis local-logs-traefik local-logs-tailscale
.PHONY: dev shell health migrate migrate-reset migrate-dev db-push db-setup db-status db-shell apply-migration
.PHONY: fresh-setup local-start-with-migration
.PHONY: test lint route-list openapi-check openapi-diff test-api test-ci test-db test-influxdb test-integration test-unit test-fresh test-file test-debug test-watch test-coverage test-env-check test-integration-full test-performance test-security test-clean test-db-with-data test-influxdb-connection test-services test-smoke test-all
.PHONY: create-superadmin list-superadmins reset-superadmin-password delete-superadmin
.PHONY: sync-node-modules clean-dev
.PHONY: queue-status queue-failed queue-retry queue-clean queue-drain queue-dashboard
.PHONY: ssh prod-logs prod-deploy prod-rollback prod-restart prod-status prod-migrate
.PHONY: ng-dev ng-lint ng-test ng-type-check ng-build ng-image ng-logs ng-api-generate ng-api-check ng-parity ng-cap-sync ng-cap-build-ios ng-cap-build-android _ng-running

# Variables - Using .env for both production and local
COMPOSE_FILE = infra/docker/docker-compose.yml --env-file .env
LOCAL_COMPOSE_FILE = infra/docker/docker-compose.local.yml --env-file .env.local
SERVICE ?= iotpilot-ng
ENV_FILE = .env

# Production server connection
PROD_HOST ?= 52.23.9.165
PROD_USER ?= ubuntu
PROD_KEY  ?= ~/.ssh/iotpilot-server.pem
SSH_CMD    = ssh -i $(PROD_KEY) $(PROD_USER)@$(PROD_HOST)

# Run a command inside the frontend-ng package directory in its dev container
EXEC_NG = docker exec -w /app/apps/frontend-ng iotpilot-server-ng

# Default target
help:
	@echo "IotPilot Server Management Commands"
	@echo "=================================="
	@echo ""
	@echo "🚀 Quick Setup:"
	@echo "  fresh-setup           - Complete fresh setup with migrations"
	@echo "  local-start-with-migration - Start with auto-migration"
	@echo ""
	@echo "🔥 Development Mode (Hot Reload):"
	@echo "  dev-start            - Start with hot reload (auto-updates on code changes)"
	@echo "  dev-stop             - Stop development mode"
	@echo "  dev-restart          - Restart development mode"
	@echo "  dev-logs             - Follow development logs"
	@echo "  dev-shell            - Open shell in dev container"
	@echo ""
	@echo "🗄️ Database:"
	@echo "  db-setup             - Setup database from scratch"
	@echo "  migrate              - Run Prisma migrations"
	@echo "  migrate-reset        - Reset and recreate database"
	@echo "  migrate-dev          - Create new migration (NAME=migration_name)"
	@echo "  db-push              - Push schema to database"
	@echo "  db-status            - Show database tables"
	@echo "  db-shell             - Open database shell"
	@echo "  apply-migration      - Apply SQL migration manually"
	@echo "  apply-seeds          - Apply seed data if missing"
	@echo ""
	@echo "🧪 Testing (Docker-based):"
	@echo "  test                 - Run all tests (with error summary)"
	@echo "  test-summary         - Run tests, show top 10 failures"
	@echo "  test-working         - Run only passing tests (fast)"
	@echo "  test-unit            - Run unit tests only"
	@echo "  test-integration     - Run integration tests only"
	@echo "  test-debug           - Run tests with verbose output"
	@echo "  test-influxdb        - Run InfluxDB tests"
	@echo "  test-ci              - Run CI tests with coverage"
	@echo "  test-fresh           - Run tests in fresh container"
	@echo "  test-coverage        - Generate test coverage report"
	@echo "  test-debug           - Run tests with verbose output"
	@echo "  test-watch           - Run tests in watch mode"
	@echo "  test-file FILE=...   - Test specific file"
	@echo "  test-all             - Complete test suite"
	@echo "  test-smoke           - Quick smoke tests"
	@echo ""
	@echo "🔍 Service Testing:"
	@echo "  test-db              - Test database connectivity"
	@echo "  test-db-with-data    - Test database with sample data"
	@echo "  test-services        - Test all service connections"
	@echo "  test-influxdb-connection - Test InfluxDB from app"
	@echo "  test-api             - Test API endpoints"
	@echo "  test-env-check       - Check test environment"
	@echo "  test-performance     - Run performance tests"
	@echo "  test-security        - Run security tests"
	@echo "  test-integration-full - Full integration with all services"
	@echo "  test-clean           - Clean test artifacts"
	@echo ""
	@echo "🔧 Development:"
	@echo "  dev                  - Start development (alias for local-start)"
	@echo "  openapi-check        - Check if backend routes are documented in openapi.yml"
	@echo "  openapi-diff         - Same as openapi-check but exits 1 on missing docs (CI use)"
	@echo ""
	@echo "🅰️  frontend-ng (Ionic + Angular):"
	@echo "  ng-dev               - Start the frontend-ng dev server (HMR) on NG_PORT"
	@echo "  ng-lint              - Lint frontend-ng (in container)"
	@echo "  ng-type-check        - Type-check frontend-ng (in container)"
	@echo "  ng-test              - Run frontend-ng Vitest suite (in container)"
	@echo "  ng-build             - Build frontend-ng (in container, dev verification)"
	@echo "  ng-image             - Build frontend-ng production Docker image (nginx)"
	@echo "  ng-api-generate      - Regenerate typed API client from docs/openapi.yml (host)"
	@echo "  ng-api-check         - Fail if the committed API client is stale (CI guard)"
	@echo "  ng-parity            - Smoke-test Angular app routes (HTTP 200 check)"
	@echo "  ng-logs              - Follow frontend-ng dev server logs"
	@echo "  ng-cap-sync          - Build frontend-ng then sync web assets to native projects"
	@echo "  ng-cap-build-ios     - Build signed iOS .ipa (macOS + Xcode required)"
	@echo "  ng-cap-build-android - Build signed Android .aab (JDK 17 required)"
	@echo ""
	@echo "🏭 Production:"
	@echo "  install              - Initial installation and setup"
	@echo "  build                - Build Docker images"
	@echo "  start                - Start services"
	@echo "  stop                 - Stop services"
	@echo "  restart              - Restart services"
	@echo "  status               - Show service status"
	@echo "  logs                 - Show logs (SERVICE=name for specific)"
	@echo "  deploy               - Deploy to production"
	@echo ""
	@echo "💻 Local Development:"
	@echo "  local-install        - Setup local environment"
	@echo "  local-start          - Start local services"
	@echo "  local-stop           - Stop local services"
	@echo "  local-restart        - Restart local services"
	@echo "  local-restart-app    - Restart app container only"
	@echo "  local-recreate-app   - Recreate app container"
	@echo "  local-status         - Show local status"
	@echo "  local-logs-app       - Show local app logs"
	@echo "  local-logs-influxdb  - Show local InfluxDB logs"
	@echo "  local-logs-loki      - Show local Loki logs"
	@echo "  local-logs-postgres  - Show local PostgreSQL logs"
	@echo "  local-logs-redis     - Show local Redis logs"
	@echo "  local-logs-traefik   - Show local Traefik logs"
	@echo "  local-clean          - Clean local resources"
	@echo ""
	@echo "🛠️ Maintenance:"
	@echo "  backup               - Create backup"
	@echo "  restore              - Restore from backup"
	@echo "  update               - Update and restart"
	@echo "  clean                - Clean Docker resources"
	@echo "  shell                - SSH into container"
	@echo "  health               - Health check"
	@echo "  local-health         - Local health check"
	@echo ""
	@echo "📟 Device Manufacturing:"
	@echo "  device-list                       - List devices by status (STATUS=UNCLAIMED)"
	@echo "  device-preregister                - Pre-register devices in DB (COUNT=10)"
	@echo "  device-flash                      - Flash ESP8266 (T-OI V1): ID=IOT-XXXX-YYYY PORT=/dev/..."
	@echo "  device-toolchain-install          - Install arduino-cli + ESP8266 toolchain"
	@echo "  device-flash-esp32c3              - Flash ESP32-C3 (T-OI Plus): ID=IOT-XXXX-YYYY PORT=/dev/..."
	@echo "  device-toolchain-install-esp32c3  - Install arduino-cli + ESP32-C3 toolchain"
	@echo "  device-flash-heltec32v3           - Flash Heltec WiFi LoRa 32 V3: ID=IOT-XXXX-YYYY PORT=/dev/..."
	@echo "  device-toolchain-install-heltec32v3 - Install arduino-cli + Heltec toolchain"
	@echo ""
	@echo "⏰ Queue & Scheduled Tasks:"
	@echo "  schedule-list        - List scheduled jobs (like Laravel schedule:list)"
	@echo "  queue-worker         - Start queue worker (like artisan queue:work)"
	@echo ""
	@echo "🌐 Tailscale:"
	@echo "  tailscale-status     - Show Tailscale status"
	@echo "  tailscale-ip         - Show Tailscale IPs"
	@echo "  tailscale-devices    - List connected devices"
	@echo "  tailscale-logs       - Show Tailscale logs"
	@echo ""
	@echo "👑 SUPERADMIN Management:"
	@echo "  create-superadmin    - Create a new SUPERADMIN user"
	@echo "  list-superadmins     - List all SUPERADMIN users"
	@echo "  reset-superadmin-password - Reset a SUPERADMIN user's password"
	@echo "  delete-superadmin    - Delete a SUPERADMIN user"
	@echo ""
	@echo "📨 Queue Management:"
	@echo "  queue-status         - Show queue job counts"
	@echo "  queue-failed         - List failed jobs"
	@echo "  queue-retry          - Retry all failed jobs"
	@echo "  queue-clean          - Clean completed/failed jobs"
	@echo "  queue-drain          - Drain all waiting jobs"
	@echo "  queue-dashboard      - Open Bull Board dashboard URL"
	@echo ""
	@echo "⚡ Quick Commands:"
	@echo "  quick-dev            - Quick development setup"
	@echo "  quick-prod           - Quick production setup"
	@echo "  switch-local         - Switch to local environment"
	@echo "  switch-prod          - Switch to production environment"
	@echo "  env-status           - Show what's running"
	@echo "  setup-env            - Setup environment file"
	@echo "  generate-secrets     - Generate new secrets"
	@echo "  fix-permissions      - Fix file permissions"

# Check environment file (same for both production and local)
check-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "❌ .env not found! Copy .env.example to .env"; exit 1; \
	fi

# =============================================================================
# DATABASE MIGRATION COMMANDS
# =============================================================================

# Database migration commands using Docker
migrate: check-env
	@echo "🗄️ Running database migrations in container..."
	@docker exec iotpilot-server-backend npm run db:migrate
	@echo "✅ Migrations complete!"

migrate-reset: check-env
	@echo "🔄 Resetting database in container..."
	@docker exec iotpilot-server-backend npx prisma migrate reset --force --schema=./prisma/schema.prisma
	@echo "✅ Database reset complete!"

migrate-dev: check-env
	@echo "🔧 Creating development migration in container..."
	@if [ -z "$(NAME)" ]; then \
		echo "❌ Please provide migration name: make migrate-dev NAME=your_migration_name"; \
		exit 1; \
	fi
	@docker exec iotpilot-server-backend npm run db:migrate:dev -- --name $(NAME)
	@echo "✅ Migration '$(NAME)' created!"

db-push: check-env
	@echo "📤 Pushing schema to database in container..."
	@docker exec iotpilot-server-backend npm run db:push
	@echo "✅ Schema pushed!"

db-status: check-env
	@echo "📊 Database Status:"
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "\dt" 2>/dev/null || echo "❌ Database not accessible"

db-setup: check-env
	@echo "🏗️ Setting up database from scratch..."
	@docker exec iotpilot-server-backend npm run db:push
	@docker exec iotpilot-server-backend npm run db:generate
	@echo "✅ Database setup complete!"

db-shell:
	@echo "🗄️ Opening database shell..."
	@docker exec -it iotpilot-server-postgres psql -U iotpilot -d iotpilot

apply-migration:
	@echo "🔧 Applying migration manually..."
	@docker exec -i iotpilot-server-postgres psql -U iotpilot -d iotpilot < apps/backend/prisma/migration/001_initial_setup.sql
	@echo "✅ Migration applied!"

# Apply seed data for local development
# NOTE: Credentials below are for LOCAL DEVELOPMENT ONLY
# For production, use environment variables or generate secure values during setup
apply-seeds:
	@echo "🌱 Checking and applying seed data..."
	@if ! docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -t -c "SELECT COUNT(*) FROM users WHERE role = 'SUPERADMIN';" 2>/dev/null | grep -q "[1-9]"; then \
		echo "📋 No SUPERADMIN user found, applying seed data..."; \
		echo " \
			INSERT INTO customers (id, name, slug, status, \"createdAt\", \"updatedAt\") \
			VALUES ('c5atmnwm7izyqp5jfv6ce6zgu', 'Default Customer', 'default', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) \
			ON CONFLICT (id) DO NOTHING; \
			\
			INSERT INTO users (id, email, username, password, role, status, \"createdAt\", \"updatedAt\") \
			VALUES ('default-admin-user', 'manager@iotpilot.app', 'manager', '$$2a$$12$$/kVthwk.MBWMioZNkADg6.QenB7RjfYSw/BSi8ePiDHp.zxKZnYCW', 'SUPERADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) \
			ON CONFLICT (id) DO NOTHING; \
			\
			INSERT INTO api_keys (id, \"userId\", \"customerId\", name, key, \"createdAt\", \"deletedAt\") \
			VALUES ('test-api-key-1', 'default-admin-user', 'c5atmnwm7izyqp5jfv6ce6zgu', 'Test Device API Key', 'local-kCs945S6Lq11CNTRL-28USAxy6dUQXxPrpq-u9ruoL', CURRENT_TIMESTAMP, NULL) \
			ON CONFLICT (id) DO NOTHING; \
		" | docker exec -i iotpilot-server-postgres psql -U iotpilot -d iotpilot; \
		echo "✅ Seed data applied!"; \
	else \
		echo "✅ Seed data already exists, skipping..."; \
	fi

# Wait for app container to be ready
wait-for-app:
	@echo "⏳ Waiting for app container to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if docker exec iotpilot-server-app echo "ready" >/dev/null 2>&1; then \
			echo "✅ App container is ready!"; \
			break; \
		fi; \
		echo "Waiting... ($$i/10)"; \
		sleep 3; \
	done
	@if ! docker exec iotpilot-server-app echo "ready" >/dev/null 2>&1; then \
		echo "❌ App container failed to start"; \
		exit 1; \
	fi

# Reset database and apply fresh migration with seeds
reset-and-migrate: check-env
	@echo "🔄 Resetting database and applying fresh migration..."
	@echo "⚠️  This will DELETE ALL DATA and recreate from migration"
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@make apply-migration
	@echo "✅ Database reset and migration applied with seeds!"

# Check if database needs initial setup
check-and-setup-db: check-env
	@echo "🔍 Checking database status..."
	@if ! docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | grep -q "[0-9]"; then \
		echo "📋 Database appears empty or uninitialized, applying migration..."; \
		make apply-migration; \
	else \
		echo "✅ Database already initialized with data"; \
	fi

# =============================================================================
# ENHANCED LOCAL DEVELOPMENT COMMANDS
# =============================================================================

local-start-with-migration: check-env
	@echo "▶️  Starting local services with auto-migration..."
	@echo "🚀 Starting all services..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d
	@echo "⏳ Waiting for services to be ready..."
	@sleep 20
	@make wait-for-app
	@echo "🗄️ Checking and setting up database..."
	@make check-and-setup-db
	@echo "✅ All services started with migrations!"
	@echo "  • Main Dashboard:    https://iotpilotserver.test:9443"
	@echo "  • Grafana:           http://iotpilotserver.test:3002"
	@echo "  • InfluxDB:          http://iotpilotserver.test:8087"
	@echo "  • Loki:              http://iotpilotserver.test:3101/metrics"
	@echo "  • Traefik Dashboard: http://iotpilotserver.test:8081"
	@echo ""

fresh-setup: check-env
	@echo "🆕 Fresh setup with migrations..."
	@make local-stop || true
	@docker system prune -f
	@docker volume prune -f || true
	@echo "🔄 Starting with fresh database..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d
	@sleep 20
	@make wait-for-app
	@make reset-and-migrate
	@echo "✅ All services started!"
	@echo "  • Main Dashboard:    https://iotpilotserver.test:9443"
	@echo "  • Grafana:           http://iotpilotserver.test:3002"
	@echo "  • InfluxDB:          http://iotpilotserver.test:8087"
	@echo "  • Loki:              http://iotpilotserver.test:3101/metrics"
	@echo "  • Traefik Dashboard: http://iotpilotserver.test:8081"
	@echo ""
	@echo "🎉 Fresh setup complete!"

# =============================================================================
# PRODUCTION COMMANDS
# =============================================================================

install: check-env
	@echo "🚀 Installing IotPilot Server..."
	@chmod +x scripts/*.sh
	@./scripts/install.sh
	@echo "✅ Installation complete!"

build: check-env
	@echo "🔨 Building Docker images..."
	@docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "✅ Build complete!"

start: check-env
	@echo "▶️  Starting services..."
	@docker compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Services started!"
	@echo "🌐 Dashboard: https://$(shell grep DOMAIN .env | cut -d '=' -f2)"

stop:
	@echo "⏹️  Stopping services..."
	@docker compose -f $(COMPOSE_FILE) down
	@echo "✅ Services stopped!"

restart: stop start

status:
	@echo "📊 Service Status:"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

logs:
	@echo "📋 Logs for $(SERVICE):"
	@docker compose -f $(COMPOSE_FILE) logs -f --tail=100 $(SERVICE)

deploy: check-env build
	@echo "🚀 Deploying..."
	@docker compose -f $(COMPOSE_FILE) up -d --remove-orphans
	@echo "✅ Deployed!"

# =============================================================================
# PRODUCTION SERVER (EC2)
# =============================================================================

ssh:
	$(SSH_CMD)

prod-logs:
	$(SSH_CMD) "cd ~/iotpilotserver && docker compose -f infra/docker/docker-compose.yml --env-file .env logs -f --tail=100"

prod-status:
	$(SSH_CMD) "cd ~/iotpilotserver && docker compose -f infra/docker/docker-compose.yml --env-file .env ps"

prod-deploy:
	@echo "🚀 Deploying to production $(PROD_HOST)..."
	$(SSH_CMD) "cd ~/iotpilotserver && git pull origin main && bash scripts/deploy.sh"
	@echo "✅ Production deploy complete!"

prod-rollback:
	@echo "⏪ Rolling back production to previous SHA..."
	$(SSH_CMD) 'cd ~/iotpilotserver && SHA=$$(cat .deploy-rollback-sha 2>/dev/null || echo "") && [ -n "$$SHA" ] || { echo "No rollback SHA found"; exit 1; } && git reset --hard $$SHA && docker compose -f infra/docker/docker-compose.yml --env-file .env up -d --build --remove-orphans && echo "Rolled back to $$SHA"'
	@echo "✅ Rollback complete!"

prod-restart:
	$(SSH_CMD) "cd ~/iotpilotserver && docker compose -f infra/docker/docker-compose.yml --env-file .env restart"

prod-migrate:
	@echo "🗄️  Applying SQL migrations on production..."
	@for f in apps/backend/prisma/migration/*.sql; do \
		echo "  ↳ $$f"; \
		scp -i $(PROD_KEY) $$f $(PROD_USER)@$(PROD_HOST):/tmp/; \
		$(SSH_CMD) "docker exec -i iotpilot-postgres psql -U iotpilot -d iotpilot < /tmp/$$(basename $$f)" 2>&1 | grep -v "^$$" || true; \
	done
	@echo "✅ Migrations applied"

# =============================================================================
# LOCAL DEVELOPMENT COMMANDS
# =============================================================================

local-install: check-env
	@echo "🚀 Setting up local development..."
	@chmod +x scripts/*.sh
	@./scripts/setup-local.sh
	@echo "▶️  Starting services for first-time setup..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d postgres redis influxdb
	@echo "⏳ Waiting for database..."
	@sleep 10
	@echo "🗄️ Applying migrations..."
	@make apply-migration
	@echo "✅ Local setup complete!"
	@echo "💡 Run 'make local-start' to start all services"

local-start: check-env
	@echo "▶️  Starting local services..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d
	@make wait-for-app
	@make check-and-setup-db
	@echo "✅ Local services started!"
	@echo "  • Main Dashboard:    https://iotpilotserver.test:9443"
	@echo "  • Grafana:           http://iotpilotserver.test:3002"
	@echo "  • InfluxDB:          http://iotpilotserver.test:8087"
	@echo "  • Loki:              http://iotpilotserver.test:3101/metrics"
	@echo "  • Traefik Dashboard: http://iotpilotserver.test:8081"
	@echo ""

local-stop:
	@echo "⏹️  Stopping local services..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) down
	@echo "✅ Local services stopped!"

local-restart:
	@make local-stop
	@make local-start

local-restart-app:
	@docker compose -f $(LOCAL_COMPOSE_FILE) restart iotpilot-ng
	@make check-and-setup-db

local-restart-backend:
	@docker compose -f $(LOCAL_COMPOSE_FILE) restart iotpilot-backend

local-restart-services:
	@docker compose -f $(LOCAL_COMPOSE_FILE) restart iotpilot-ng iotpilot-backend
	@make check-and-setup-db

local-recreate: ## Recreate all local containers (no data loss)
	@echo "🔄 Recreating all local containers..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d --force-recreate

local-recreate-app:
	@echo "⏹️  Recreating frontend-ng container..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) down iotpilot-ng
	@echo "🔨 Rebuilding frontend-ng image..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) build --no-cache iotpilot-ng
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d iotpilot-ng
	@echo "✅ frontend-ng recreated and ready!"

sync-node-modules: check-env
	@echo "📦 Syncing node_modules from container..."
	@echo "ℹ️  node_modules are in pnpm workspace — run: pnpm install" 2>/dev/null || (echo "❌ Container not running. Start it first with: make local-start" && exit 1)
	@echo "✅ node_modules synced for IDE!"

generate-prisma-client: check-env
	@echo "🔧 Generating Prisma client in container..."
	@docker exec iotpilot-server-backend npm run db:generate || (echo "❌ Backend container not running. Start it first with: make local-start" && exit 1)
	@echo "✅ Prisma client generated!"

ide-setup: check-env generate-prisma-client sync-node-modules
	@echo "✅ IDE setup complete! TypeScript should now recognize @prisma/client"

clean-dev:
	@echo "🧹 Cleaning development artifacts..."
	@rm -rf apps/frontend-ng/.angular 2>/dev/null || true
	@echo "✅ Development cleanup complete!"

local-status:
	@echo "📊 Local Service Status:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) ps
	@echo ""
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Development mode commands (Hot Reload)
dev-start: check-env
	@echo "🔥 Starting development mode with hot reload..."
	@docker compose -f infra/docker/docker-compose.local.yml -f infra/docker/docker-compose.dev.yml --env-file .env.local up -d --build
	@echo "⏳ Waiting for app to start..."
	@sleep 15
	@echo "✅ Development mode started!"
	@echo "  • Main Dashboard:    https://iotpilotserver.test:9443"
	@echo "  • Cloudflare Tunnel: https://dashboarddev.iotpilot.app"
	@echo "  • Hot reload:        ✓ Enabled"
	@echo ""
	@echo "💡 Any changes to /app/src will auto-reload!"
	@echo "📝 Check logs with: make dev-logs"

dev-stop:
	@echo "⏹️  Stopping development mode..."
	@docker compose -f infra/docker/docker-compose.local.yml -f infra/docker/docker-compose.dev.yml --env-file .env.local down

dev-restart:
	@echo "🔄 Restarting development mode..."
	@docker compose -f infra/docker/docker-compose.local.yml -f infra/docker/docker-compose.dev.yml --env-file .env.local restart iotpilot-app
	@echo "✅ Development mode restarted!"

dev-logs:
	@echo "📋 Development logs (Ctrl+C to exit):"
	@docker logs -f iotpilot-server-app

dev-shell:
	@echo "🐚 Opening development shell..."
	@docker exec -it iotpilot-server-app /bin/sh

local-logs-app:
	@echo "📋 Local logs for $(SERVICE):"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 $(SERVICE)

local-logs-influxdb:
	@echo "📋 Local logs for influxdb:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 influxdb

local-logs-loki:
	@echo "📋 Local logs for loki:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 loki

local-logs-postgres:
	@echo "📋 Local logs for postgres:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 postgres

local-logs-redis:
	@echo "📋 Local logs for redis:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 redis

local-logs-traefik:
	@echo "📋 Local logs for traefik:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 traefik

local-logs-tailscale:
	@echo "📋 Local logs for tailscale:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 tailscale

local-clean:
	@echo "🧹 Cleaning local resources..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) down -v --remove-orphans
	@docker system prune -f
	@echo "✅ Local cleanup complete!"

# =============================================================================
# DEVELOPMENT COMMANDS
# =============================================================================

dev: local-start

test:
	@echo "🧪 Running tests in Docker..."
	@TMPFILE=$$(mktemp); \
		set -o pipefail; \
		if $(EXEC_FRONTEND) npm test -- --reporter=basic --bail=1 2>&1 | tee $$TMPFILE; then \
			TEST_EXIT=0; \
		else \
			TEST_EXIT=$$?; \
		fi; \
		set +o pipefail; \
		echo ""; \
		FAILED_COUNT=$$(grep -c "FAIL " $$TMPFILE 2>/dev/null || echo "0"); \
		ERROR_COUNT=$$(grep -c "Error:" $$TMPFILE 2>/dev/null || echo "0"); \
		if [ $$FAILED_COUNT -gt 0 ] || [ $$ERROR_COUNT -gt 0 ]; then \
			echo "═══════════════════════════════════════════════════════════"; \
			echo "❌ Test Failures Summary"; \
			echo "═══════════════════════════════════════════════════════════"; \
			echo ""; \
			if [ $$FAILED_COUNT -gt 0 ]; then \
				echo "📋 Failed Tests (showing first 10):"; \
				echo ""; \
				grep "FAIL " $$TMPFILE | head -n 10; \
				if [ $$FAILED_COUNT -gt 10 ]; then \
					echo ""; \
					echo "... (showing 10 of $$FAILED_COUNT failures)"; \
				fi; \
				echo ""; \
			fi; \
			echo "📊 Test Summary:"; \
			grep -E "Test Files|Tests " $$TMPFILE | tail -2 || echo "  No summary available"; \
			echo ""; \
			echo "═══════════════════════════════════════════════════════════"; \
			echo "💡 Tip: Run 'make test-debug' for full verbose output"; \
			echo "═══════════════════════════════════════════════════════════"; \
		fi; \
		rm -f $$TMPFILE; \
		if [ $$TEST_EXIT -eq 0 ]; then \
			make lint; \
			echo "✅ Tests complete!"; \
		else \
			exit $$TEST_EXIT; \
		fi

# ─── frontend-ng (Ionic + Angular) ──────────────────────────────────────────
# ng-dev starts the dev server; the rest exec npm scripts inside its container.
_ng-running:
	@docker ps -q -f name=iotpilot-server-ng | grep -q . || { \
		echo "❌ iotpilot-server-ng is not running. Start it with: make ng-dev"; \
		exit 1; \
	}

ng-dev:
	@echo "🅰️  Starting frontend-ng dev server (HMR)..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d iotpilot-ng
	@echo "✅ frontend-ng serving on http://localhost:$${NG_PORT:-4201}"
	@echo "   Follow logs with: make ng-logs"

ng-lint: _ng-running
	@echo "🔍 Linting frontend-ng..."
	@$(EXEC_NG) npm run lint

ng-type-check: _ng-running
	@echo "🔎 Type-checking frontend-ng..."
	@$(EXEC_NG) npm run type-check

ng-test: _ng-running
	@echo "🧪 Testing frontend-ng (Vitest)..."
	@$(EXEC_NG) npm test

ng-build: _ng-running
	@echo "🔨 Building frontend-ng..."
	@$(EXEC_NG) npm run build

ng-image:
	@echo "🏗️  Building frontend-ng production image (nginx)..."
	@docker build -f infra/docker/Dockerfile --target production-ng -t iotpilot-ng:latest .
	@echo "✅ Production image built: iotpilot-ng:latest"
	@echo "   Verify SPA routing: docker run --rm -p 8090:80 iotpilot-ng:latest"

ng-logs:
	@echo "📋 frontend-ng dev server logs:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 iotpilot-ng

# Codegen runs on the host (Node), mirroring route-list/openapi-check which also
# run host-side. The generated client under core/api/generated is committed.
ng-api-generate:
	@echo "🧬 Generating typed API client from docs/openapi.yml..."
	@pnpm --filter frontend-ng api:generate
	@echo "✅ API client generated → apps/frontend-ng/src/app/core/api/generated"

# CI guard (mirrors openapi-diff): regenerate, fail if the committed client drifts.
ng-api-check:
	@echo "🔍 Checking generated API client is in sync with docs/openapi.yml..."
	@pnpm --filter frontend-ng api:generate >/dev/null 2>&1
	@if ! git diff --quiet -- apps/frontend-ng/src/app/core/api/generated; then \
		echo "❌ Generated API client is stale. Run 'make ng-api-generate' and commit."; \
		git --no-pager diff --stat -- apps/frontend-ng/src/app/core/api/generated; \
		exit 1; \
	fi
	@echo "✅ Generated API client is in sync."

ng-parity:
	@echo "🔍 Parity smoke-test: legacy (port 3001) vs Angular (port 4201)..."
	@node scripts/ng-parity.mjs

ng-cap-sync: _ng-running
	@echo "📱 Building frontend-ng and syncing to native projects..."
	@$(EXEC_NG) npm run build
	@$(EXEC_NG) npx cap sync
	@echo "✅ Capacitor sync complete"

ng-cap-build-ios:
	@echo "🍎 Building signed iOS archive (requires macOS + Xcode + signing certs)..."
	@cd apps/frontend-ng && npm run build && npx cap sync
	@cd apps/frontend-ng/ios/App && \
		xcodebuild -workspace App.xcworkspace \
		           -scheme App \
		           -configuration Release \
		           -archivePath ../../build/App.xcarchive \
		           archive
	@cd apps/frontend-ng/ios/App && \
		xcodebuild -exportArchive \
		           -archivePath ../../build/App.xcarchive \
		           -exportOptionsPlist ExportOptions.plist \
		           -exportPath ../../build/ipa
	@echo "✅ iOS archive at apps/frontend-ng/build/ipa/"

ng-cap-build-android:
	@echo "🤖 Building signed Android bundle (requires JDK 17 + signing keystore)..."
	@cd apps/frontend-ng && npm run build && npx cap sync
	@cd apps/frontend-ng/android && ./gradlew bundleRelease
	@echo "✅ Android .aab at apps/frontend-ng/android/app/build/outputs/bundle/release/"

openapi-check:
	@echo "🔍 Checking OpenAPI spec endpoint coverage..."
	@node scripts/check-openapi.mjs 2>/dev/null || echo "⚠️  check-openapi.mjs not found — run ng-api-check instead"

openapi-diff:
	@echo "🔍 OpenAPI diff (exits 1 if stale)..."
	@make ng-api-check

test-db:
	@echo "🧪 Testing database..."
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "SELECT COUNT(*) FROM devices;" 2>/dev/null && echo "✅ Database working!"

test-db-with-data: check-env
	@echo "🗄️ Testing database with sample data..."
	@make check-and-setup-db
	@make test-db

test-influxdb-connection: check-env
	@echo "📊 Testing InfluxDB connection from app..."
	@$(EXEC_FRONTEND) npm test -- --run src/__tests__/influxdb-connection

test-services: check-env
	@echo "🔧 Testing all service connections..."
	@make test-db
	@make test-influxdb-connection
	@echo "✅ All service tests complete!"

test-smoke: check-env
	@echo "💨 Running smoke tests..."
	@curl -f http://localhost:3001/api/health 2>/dev/null && echo "✅ API healthy" || echo "❌ API unhealthy"
	@make test-db

test-api: check-env
	@echo "🌐 Testing API endpoints..."
	@$(EXEC_FRONTEND) npm test -- --run src/__tests__/api

when: test-env-check test-fresh test-services test-smoke
	@echo "🎉 All tests completed!"

# =============================================================================
# MAINTENANCE COMMANDS
# =============================================================================

backup:
	@echo "💾 Creating backup..."
	@./scripts/backup.sh
	@echo "✅ Backup complete!"

restore:
	@echo "📥 Restoring..."
	@./scripts/restore.sh
	@echo "✅ Restore complete!"

update: check-env
	@echo "🔄 Updating..."
	@git pull
	@docker compose -f $(COMPOSE_FILE) pull
	@docker compose -f $(COMPOSE_FILE) build --no-cache
	@docker compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Update complete!"

clean:
	@echo "🧹 Cleaning Docker resources..."
	@docker system prune -f
	@docker volume prune -f
	@echo "✅ Cleanup complete!"

shell:
	@echo "🖥️  Opening shell in $(SERVICE)..."
	@docker compose -f $(COMPOSE_FILE) exec $(SERVICE) /bin/bash || \
	 docker compose -f $(COMPOSE_FILE) exec $(SERVICE) /bin/sh

local-shell:
	@echo "🖥️  Opening local shell in $(SERVICE)..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) exec $(SERVICE) /bin/bash || \
	 docker compose -f $(LOCAL_COMPOSE_FILE) exec $(SERVICE) /bin/sh

health:
	@echo "❤️  Health check:"
	@docker compose -f $(COMPOSE_FILE) ps
	@echo "Testing connectivity..."
	@curl -f http://localhost:3000/api/health 2>/dev/null && echo "✅ App healthy" || echo "❌ App unhealthy"

local-health:
	@echo "❤️  Local health check:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) ps
	@echo "Testing connectivity..."
	@curl -f http://localhost:3001/api/health 2>/dev/null && echo "✅ App healthy" || echo "❌ App unhealthy"

# =============================================================================
# QUICK SHORTCUTS
# =============================================================================

# Quick development setup
quick-dev: local-install local-start-with-migration
	@echo "🎉 Quick development setup complete!"

# Quick production setup
quick-prod: install build deploy
	@echo "🎉 Quick production setup complete!"

# Switch environments
switch-local:
	@make stop 2>/dev/null || true
	@make local-start

switch-prod:
	@make local-stop 2>/dev/null || true
	@make start

# Show what's running
env-status:
	@echo "🏭 Production:"
	@docker compose -f $(COMPOSE_FILE) ps 2>/dev/null || echo "  Not running"
	@echo "💻 Local:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) ps 2>/dev/null || echo "  Not running"

# =============================================================================
# TAILSCALE COMMANDS
# =============================================================================

tailscale-status:
	@echo "📡 Tailscale Status:"
	@docker exec iotpilot-tailscale tailscale status 2>/dev/null || echo "Tailscale not running"

tailscale-ip:
	@echo "📍 Tailscale IPs:"
	@docker exec iotpilot-tailscale tailscale ip -4 2>/dev/null || echo "Not connected"
	@docker exec iotpilot-tailscale tailscale ip -6 2>/dev/null || echo "IPv6 not available"

tailscale-devices:
	@echo "📱 Connected Tailscale Devices:"
	@docker exec iotpilot-tailscale tailscale status --json 2>/dev/null | jq -r '.Peer[]? | "\(.HostName) - \(.TailscaleIPs[0])"' || echo "No devices found"

tailscale-logs:
	@echo "📋 Tailscale Logs:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=50 tailscale

# =============================================================================
# SUPERADMIN MANAGEMENT
# =============================================================================

create-superadmin:
	@echo "👑 Creating SUPERADMIN user..."
	@./scripts/create-superadmin.sh

list-superadmins:
	@echo "👑 Listing SUPERADMIN users..."
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "SELECT id, email, username, status FROM users WHERE role = 'SUPERADMIN' AND \"deletedAt\" IS NULL;"

reset-superadmin-password:
	@echo "🔑 Resetting SUPERADMIN password..."
	@./scripts/reset-superadmin-password.sh

delete-superadmin:
	@echo "🗑️  Deleting SUPERADMIN user..."
	@./scripts/delete-superadmin.sh

# =============================================================================
# QUEUE MANAGEMENT
# =============================================================================

queue-status:
	@echo "📊 Queue Status:"
	@docker exec iotpilot-server-app node -e " \
		const { Queue } = require('bullmq'); \
		const IORedis = require('ioredis'); \
		(async () => { \
			const conn = new IORedis({ host: 'redis', port: 6379, db: 1, maxRetriesPerRequest: null }); \
			const q = new Queue('iotpilot-jobs', { connection: conn }); \
			const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'); \
			console.log('  Waiting:', counts.waiting); \
			console.log('  Active:', counts.active); \
			console.log('  Completed:', counts.completed); \
			console.log('  Failed:', counts.failed); \
			console.log('  Delayed:', counts.delayed); \
			await q.close(); \
			await conn.quit(); \
			process.exit(0); \
		})();"

queue-failed:
	@echo "❌ Failed Jobs:"
	@docker exec iotpilot-server-app node -e " \
		const { Queue } = require('bullmq'); \
		const IORedis = require('ioredis'); \
		(async () => { \
			const conn = new IORedis({ host: 'redis', port: 6379, db: 1, maxRetriesPerRequest: null }); \
			const q = new Queue('iotpilot-jobs', { connection: conn }); \
			const failed = await q.getFailed(0, 20); \
			failed.forEach(j => console.log('  [' + j.id + '] ' + j.name + ' - ' + j.failedReason)); \
			if (!failed.length) console.log('  No failed jobs'); \
			await q.close(); \
			await conn.quit(); \
			process.exit(0); \
		})();"

queue-retry:
	@echo "🔄 Retrying all failed jobs..."
	@docker exec iotpilot-server-app node -e " \
		const { Queue } = require('bullmq'); \
		const IORedis = require('ioredis'); \
		(async () => { \
			const conn = new IORedis({ host: 'redis', port: 6379, db: 1, maxRetriesPerRequest: null }); \
			const q = new Queue('iotpilot-jobs', { connection: conn }); \
			const failed = await q.getFailed(0, 1000); \
			for (const job of failed) await job.retry(); \
			console.log('  Retried ' + failed.length + ' jobs'); \
			await q.close(); \
			await conn.quit(); \
			process.exit(0); \
		})();"

queue-clean:
	@echo "🧹 Cleaning completed and failed jobs..."
	@docker exec iotpilot-server-app node -e " \
		const { Queue } = require('bullmq'); \
		const IORedis = require('ioredis'); \
		(async () => { \
			const conn = new IORedis({ host: 'redis', port: 6379, db: 1, maxRetriesPerRequest: null }); \
			const q = new Queue('iotpilot-jobs', { connection: conn }); \
			await q.clean(0, 1000, 'completed'); \
			await q.clean(0, 1000, 'failed'); \
			console.log('  Queue cleaned'); \
			await q.close(); \
			await conn.quit(); \
			process.exit(0); \
		})();"

queue-drain:
	@echo "⚠️  Draining queue (removing all waiting jobs)..."
	@docker exec iotpilot-server-app node -e " \
		const { Queue } = require('bullmq'); \
		const IORedis = require('ioredis'); \
		(async () => { \
			const conn = new IORedis({ host: 'redis', port: 6379, db: 1, maxRetriesPerRequest: null }); \
			const q = new Queue('iotpilot-jobs', { connection: conn }); \
			await q.drain(); \
			console.log('  Queue drained'); \
			await q.close(); \
			await conn.quit(); \
			process.exit(0); \
		})();"

queue-dashboard:
	@echo "📊 Bull Board dashboard available at: http://localhost:3001/admin/queues"
	@echo "   (Requires app to be running: make local-start)"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

setup-env:
	@echo "⚙️  Setting up environment file..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env from example"; \
	else \
		echo "✅ .env already exists"; \
	fi

generate-secrets:
	@echo "🔐 Generating new secrets..."
	@./scripts/generate-secrets.sh

fix-permissions:
	@echo "🔧 Fixing file permissions..."
	@chmod +x scripts/*.sh
	@echo "✅ Permissions fixed!"

# ═══════════════════════════════════════════════════════════════
# 📟 Device Manufacturing
# ═══════════════════════════════════════════════════════════════

COUNT ?= 10
STATUS ?= UNCLAIMED

device-list:
ifdef API_URL
	@curl -s "$(API_URL)/api/admin/devices?status=$(STATUS)" \
		-H "Authorization: Bearer $(API_TOKEN)" | python3 -m json.tool
else
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c \
		"SELECT \"deviceId\", status, \"customerId\", \"registeredAt\" FROM devices WHERE status='$(STATUS)' ORDER BY \"registeredAt\" DESC;"
endif

device-preregister:
	@echo "📟 Pre-registering $(COUNT) devices..."
ifdef API_URL
	@curl -s -X POST "$(API_URL)/api/admin/devices" \
		-H "Authorization: Bearer $(API_TOKEN)" \
		-H "Content-Type: application/json" \
		-d '{"count":$(COUNT)}' | python3 -m json.tool
else
	@docker cp scripts/preregister-devices.ts iotpilot-server-app:/tmp/preregister-devices.ts
	@docker exec iotpilot-server-app npx tsx /tmp/preregister-devices.ts --count=$(COUNT)
endif

device-flash:
	@SERVER_URL=$(or $(SERVER_URL),http://192.168.0.168:3001) ./scripts/flash-device.sh $(ID) $(PORT)

device-toolchain-install:
	@echo "📟 Installing ESP8266 manufacturing toolchain..."
	@if ! command -v arduino-cli &>/dev/null; then \
		echo "Installing arduino-cli..."; \
		brew install arduino-cli; \
	else \
		echo "✅ arduino-cli already installed"; \
	fi
	@echo "Installing ESP8266 core..."
	@arduino-cli core update-index --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
	@arduino-cli core install esp8266:esp8266 --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
	@echo "Installing required libraries..."
	@arduino-cli lib install "OneWire" "DallasTemperature" "ArduinoJson" "WiFiManager"
	@echo ""
	@echo "✅ Toolchain ready! Manufacturing workflow:"
	@echo "   1. make device-preregister COUNT=10    # Generate device IDs"
	@echo "   2. Plug in ESP8266 via USB"
	@echo "   3. make device-flash ID=IOT-XXXX-YYYY # Compile + flash"
	@echo "   4. Stick QR label on device"

device-flash-esp32c3:
	@SERVER_URL=$(or $(SERVER_URL),https://dashboarddev.iotpilot.app) BAUD_OVERRIDE=$(BAUD) PORT_OVERRIDE=$(PORT) WIFI_SSID_OVERRIDE="$(WIFI_SSID)" WIFI_PASS_OVERRIDE="$(WIFI_PASS)" TOKEN_OVERRIDE="$(TOKEN)" ERASE_OVERRIDE="$(ERASE)" ./scripts/flash-device-esp32c3.sh $(ID)

device-toolchain-install-esp32c3:
	@echo "📟 Installing ESP32-C3 manufacturing toolchain (LILYGO T-OI Plus)..."
	@if ! command -v arduino-cli &>/dev/null; then \
		echo "Installing arduino-cli..."; \
		brew install arduino-cli; \
	else \
		echo "✅ arduino-cli already installed"; \
	fi
	@echo "Installing ESP32 core (Espressif)..."
	@arduino-cli core update-index --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
	@arduino-cli core install esp32:esp32 --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
	@echo "Installing required libraries..."
	@arduino-cli lib install "OneWire" "DallasTemperature" "ArduinoJson" "WiFiManager"
	@echo ""
	@echo "✅ Toolchain ready! Manufacturing workflow (T-OI Plus):"
	@echo "   1. make device-preregister COUNT=10             # Generate device IDs"
	@echo "   2. Plug in T-OI Plus via USB-C"
	@echo "   3. make device-flash-esp32c3 ID=IOT-XXXX-YYYY  # Compile + flash"
	@echo "   4. Stick QR label on device"
	@echo ""
	@echo "   If upload fails: hold BOOT, press RST, release BOOT, retry"

device-serial:
	@PORT=$${PORT:-$$(ls /dev/cu.usbserial* /dev/cu.wchusbserial* /dev/cu.SLAB* 2>/dev/null | head -1)}; \
	if [ -z "$$PORT" ]; then echo "❌ No serial device found. Plug in the device first."; exit 1; fi; \
	echo "📡 Opening serial monitor on $$PORT (Ctrl+A then K to exit)"; \
	TERM=xterm screen $$PORT ${or $(BAUD),115200}

device-flash-heltec32v3:
	@SERVER_URL=$(or $(SERVER_URL),https://dashboarddev.iotpilot.app) BAUD_OVERRIDE=$(BAUD) PORT_OVERRIDE=$(PORT) WIFI_SSID_OVERRIDE="$(WIFI_SSID)" WIFI_PASS_OVERRIDE="$(WIFI_PASS)" TOKEN_OVERRIDE="$(TOKEN)" ERASE_OVERRIDE="$(ERASE)" ./scripts/flash-device-heltec32v3.sh $(ID)

device-toolchain-install-heltec32v3:
	@echo "📟 Installing Heltec WiFi LoRa 32 V3 manufacturing toolchain..."
	@if ! command -v arduino-cli &>/dev/null; then \
		echo "Installing arduino-cli..."; \
		brew install arduino-cli; \
	else \
		echo "✅ arduino-cli already installed"; \
	fi
	@echo "Installing ESP32 core (Espressif)..."
	@arduino-cli core update-index --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
	@arduino-cli core install esp32:esp32 --additional-urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
	@echo "Installing required libraries..."
	@arduino-cli lib install "OneWire" "DallasTemperature" "ArduinoJson" "WiFiManager" "U8g2"
	@echo ""
	@echo "✅ Toolchain ready! Manufacturing workflow (Heltec WiFi LoRa 32 V3):"
	@echo "   1. make device-preregister COUNT=10                  # Generate device IDs"
	@echo "   2. Plug in Heltec via USB-C"
	@echo "   3. make device-flash-heltec32v3 ID=IOT-XXXX-YYYY    # Compile + flash"
	@echo "   4. Stick QR label on device"
	@echo ""
	@echo "   If upload fails: hold PRG, press RST, release PRG, retry"

# ═══════════════════════════════════════════════════════════════
# ⏰ Queue & Scheduled Tasks
# ═══════════════════════════════════════════════════════════════

queue-worker:
	@echo "⏰ Starting queue worker..."
	@docker exec -it iotpilot-server-app npm run worker

schedule-list:
	@echo "⏰ Scheduled Tasks (BullMQ Repeatable Jobs)"
	@echo ""
	@curl -s http://localhost:3001/api/schedule 2>/dev/null | python3 -c "\
import sys,json; \
d=json.load(sys.stdin); \
ts=d.get('tasks',[]); \
err=d.get('error'); \
print(f'  {\"Task\":<30} {\"Schedule\":<20} {\"Next Run\"}') if ts else None; \
print('  '+'-'*70) if ts else None; \
[print(f'  {t[\"name\"]:<30} {t[\"schedule\"]:<20} {(t[\"nextRun\"] or \"pending\")[:19]}') for t in ts]; \
print(f'\n  {len(ts)} scheduled task(s)') if ts else print(f'  No tasks. {err or \"Is the app running?\"}'); \
" 2>/dev/null || echo "  Failed to connect. Is the app running?"


-include Makefile.local
