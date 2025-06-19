# IotPilot Server Management Makefile

.PHONY: help install start stop restart logs status clean build deploy backup restore update
.PHONY: local-install local-start local-stop local-restart local-restart-app local-recreate-app local-status local-clean
.PHONY: local-logs-app local-logs-influxdb local-logs-loki local-logs-postgres local-logs-redis local-logs-traefik local-logs-tailscale
.PHONY: dev shell health migrate migrate-reset migrate-dev db-push db-setup db-status db-shell apply-migration
.PHONY: fresh-setup local-start-with-migration
.PHONY: fresh-setup local-start-with-migration
.PHONY: test lint test-api test-ci test-db test-influxdb test-integration test-unit test-fresh test-file test-debug test-watch test-coverage test-env-check test-integration-full test-performance test-security test-clean test-db-with-data test-influxdb-connection test-services test-smoke test-all
.PHONY: create-superadmin list-superadmins reset-superadmin-password delete-superadmin

# Variables - Using .env for both production and local
COMPOSE_FILE = docker/docker-compose.yml --env-file .env
LOCAL_COMPOSE_FILE = docker/docker-compose.local.yml --env-file .env.local
SERVICE ?= iotpilot-app
ENV_FILE = .env

# Default target
help:
	@echo "IotPilot Server Management Commands"
	@echo "=================================="
	@echo ""
	@echo "🚀 Quick Setup:"
	@echo "  fresh-setup           - Complete fresh setup with migrations"
	@echo "  local-start-with-migration - Start with auto-migration"
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
	@echo ""
	@echo "🧪 Testing (Docker-based):"
	@echo "  test                 - Run all tests in Docker"
	@echo "  test-unit            - Run unit tests only"
	@echo "  test-integration     - Run integration tests only"
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
	@echo "  lint                 - Run linter in Docker"
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
	@docker exec iotpilot-server-app npx prisma migrate deploy
	@echo "✅ Migrations complete!"

migrate-reset: check-env
	@echo "🔄 Resetting database in container..."
	@docker exec iotpilot-server-app npx prisma migrate reset --force
	@echo "✅ Database reset complete!"

migrate-dev: check-env
	@echo "🔧 Creating development migration in container..."
	@if [ -z "$(NAME)" ]; then \
		echo "❌ Please provide migration name: make migrate-dev NAME=your_migration_name"; \
		exit 1; \
	fi
	@docker exec iotpilot-server-app npx prisma migrate dev --name $(NAME)
	@echo "✅ Migration '$(NAME)' created!"

db-push: check-env
	@echo "📤 Pushing schema to database in container..."
	@docker exec iotpilot-server-app npx prisma db push
	@echo "✅ Schema pushed!"

db-status: check-env
	@echo "📊 Database Status:"
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "\dt" 2>/dev/null || echo "❌ Database not accessible"

db-setup: check-env
	@echo "🏗️ Setting up database from scratch..."
	@docker exec iotpilot-server-app npx prisma db push --force-reset
	@docker exec iotpilot-server-app npx prisma generate
	@echo "✅ Database setup complete!"

make:
	@echo "📊 Database Status:"
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "\dt" 2>/dev/null || echo "❌ Database not accessible"

db-shell:
	@echo "🗄️ Opening database shell..."
	@docker exec -it iotpilot-server-postgres psql -U iotpilot -d iotpilot

apply-migration:
	@echo "🔧 Applying migration manually..."
	@docker exec -i iotpilot-server-postgres psql -U iotpilot -d iotpilot < app/prisma/migration/001_initial_setup.sql
	@echo "✅ Migration applied!"

# =============================================================================
# ENHANCED LOCAL DEVELOPMENT COMMANDS
# =============================================================================

local-start-with-migration: check-env
	@echo "▶️  Starting local services with auto-migration..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d postgres redis influxdb loki grafana
	@echo "⏳ Waiting for database to be ready..."
	@sleep 15
	@echo "🗄️ Running database setup..."
	@make db-setup
	@echo "🚀 Starting main application..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d iotpilot-app traefik
	@echo "✅ All services started with migrations!"
	@echo "  • Main Dashboard:    https://iotpilotserver.test:9443"
	@echo "  • Grafana:           http://iotpilotserver.test:3002"
	@echo "  • InfluxDB:          http://iotpilotserver.test:8087"
	@echo "  • Loki:              http://iotpilotserver.test:3101/metrics"
	@echo "  • Traefik Dashboard: http://iotpilotserver.test:8081"

fresh-setup: check-env
	@echo "🆕 Fresh setup with migrations..."
	@make local-stop || true
	@docker system prune -f
	@make local-start-with-migration
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
	@make db-setup
	@make apply-migration
	@echo "✅ Local setup complete!"
	@echo "💡 Run 'make local-start' to start all services"

local-start: check-env
	@echo "▶️  Starting local services..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d
	@make migrate
	@echo "✅ Local services started!"
	@echo "  • Main Dashboard:    https://iotpilotserver.test:9443"
	@echo "  • Grafana:           http://iotpilotserver.test:3002"
	@echo "  • InfluxDB:          http://iotpilotserver.test:8087"
	@echo "  • Loki:              http://iotpilotserver.test:3101/metrics"
	@echo "  • Traefik Dashboard: http://iotpilotserver.test:8081"

local-stop:
	@echo "⏹️  Stopping local services..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) down
	@echo "✅ Local services stopped!"

local-restart:
	@docker exec iotpilot-server-app rm -rf .next
	@make local-stop
	@make local-start

local-restart-app:
	@docker compose -f $(LOCAL_COMPOSE_FILE) restart iotpilot-app

local-recreate-app:
	@echo "⏹️  Recreating local app..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) down iotpilot-app
	@docker compose -f $(LOCAL_COMPOSE_FILE) build --no-cache iotpilot-app
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d iotpilot-app
	@echo "✅ App is live!"

local-status:
	@echo "📊 Local Service Status:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) ps
	@echo ""
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

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
	@docker exec iotpilot-server-app npm test
	@echo "✅ Tests complete!"

lint:
	@echo "🔍 Running linter in Docker..."
	@docker exec iotpilot-server-app npm run lint
	@echo "✅ Linting complete!"

test-unit:
	@echo "🧪 Running unit tests in Docker..."
	@docker exec iotpilot-server-app npm test -- --testPathPattern=unit

test-integration:
	@echo "🧪 Running integration tests in Docker..."
	@docker exec iotpilot-server-app npm test -- --testPathPattern=integration

test-influxdb:
	@echo "🧪 Running InfluxDB tests in Docker..."
	@docker exec iotpilot-server-app npm test -- --testPathPattern=influxdb --verbose

test-ci: check-env
	@echo "🧪 Running CI tests in Docker..."
	@docker exec iotpilot-server-app sh -c "CI=true npm test -- --coverage --watchAll=false"

test-db:
	@echo "🧪 Testing database..."
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "SELECT COUNT(*) FROM devices;" 2>/dev/null && echo "✅ Database working!" || echo "❌ Database issues - try 'make apply-migration'"

# Test with fresh container (ensures clean environment)
test-fresh:
	@echo "🧪 Running tests in fresh container..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) run --rm iotpilot-app npm test
	@echo "✅ Fresh tests complete!"

# Test specific file
test-file:
	@echo "🧪 Running specific test file in Docker..."
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Please provide test file: make test-file FILE=src/__tests__/unit/influxdb.unit.test.ts"; \
		exit 1; \
	fi
	@docker exec iotpilot-server-app npm test -- $(FILE)

# Debug tests with verbose output
test-debug:
	@echo "🐛 Running tests with debug output..."
	@docker exec iotpilot-server-app npm test -- --verbose --no-coverage

# Watch mode (for development)
test-watch:
	@echo "👁️  Running tests in watch mode..."
	@docker exec -it iotpilot-server-app npm test -- --watch

# Coverage report
test-coverage:
	@echo "📊 Generating test coverage report..."
	@docker exec iotpilot-server-app npm test -- --coverage --watchAll=false
	@echo "📊 Coverage report generated in app/coverage/"

# API endpoint tests
test-api:
	@echo "🧪 Testing API endpoints..."
	@echo "Health: " && curl -s http://localhost:3001/api/health | jq .status || echo "Failed"
	@echo "Devices: " && curl -s http://localhost:3001/api/devices | jq .stats || echo "Failed"

# Test environment setup
test-env-check:
	@echo "🔍 Checking test environment..."
	@docker exec iotpilot-server-app sh -c "echo 'Node: '; node --version"
	@docker exec iotpilot-server-app sh -c "echo 'NPM: '; npm --version"
	@docker exec iotpilot-server-app sh -c "echo 'Jest: '; npx jest --version"
	@docker exec iotpilot-server-app sh -c "echo 'TypeScript: '; npx tsc --version"
	@echo "Environment variables:"
	@docker exec iotpilot-server-app printenv | grep -E "(INFLUXDB|NODE_ENV|DATABASE)" || echo "No test env vars found"

# Integration test with services
test-integration-full: check-env
	@echo "🧪 Running full integration tests with all services..."
	@echo "Ensuring all services are running..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Running integration tests..."
	@docker exec iotpilot-server-app npm test -- --testPathPattern=integration --verbose
	@echo "✅ Full integration tests complete!"

# Performance tests
test-performance:
	@echo "⚡ Running performance tests..."
	@docker exec iotpilot-server-app npm test -- --testNamePattern="Performance" --verbose

# Security tests
test-security:
	@echo "🔒 Running security tests..."
	@docker exec iotpilot-server-app npm audit
	@docker exec iotpilot-server-app npm test -- --testNamePattern="Security|Auth" --verbose

# Cleanup test artifacts
test-clean:
	@echo "🧹 Cleaning test artifacts..."
	@docker exec iotpilot-server-app rm -rf coverage/ || true
	@docker exec iotpilot-server-app rm -rf .nyc_output/ || true
	@echo "✅ Test cleanup complete!"

# Test database with sample data
test-db-with-data:
	@echo "🧪 Testing database with sample data..."
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "INSERT INTO devices (id, \"deviceId\", hostname, \"deviceType\", architecture, \"registeredAt\", \"updatedAt\") VALUES ('test-device-1', 'test-device-1', 'test-host', 'GENERIC', 'arm64', NOW(), NOW()) ON CONFLICT DO NOTHING;" 2>/dev/null || echo "Insert failed"
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "SELECT COUNT(*) as device_count FROM devices;" 2>/dev/null && echo "✅ Database with data working!" || echo "❌ Database issues"
	@docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -c "DELETE FROM devices WHERE id = 'test-device-1';" 2>/dev/null || echo "Cleanup failed"

# Test InfluxDB connectivity from app container
test-influxdb-connection:
	@echo "🧪 Testing InfluxDB connection from app..."
	@docker exec iotpilot-server-app sh -c "curl -f http://influxdb:8086/health || echo 'InfluxDB health check failed'"
	@docker exec iotpilot-server-app sh -c "curl -f http://influxdb:8086/api/v2/ready || echo 'InfluxDB ready check failed'"

# Test all services connectivity
test-services:
	@echo "🧪 Testing all service connections..."
	@echo "PostgreSQL:" && docker exec iotpilot-server-app sh -c "pg_isready -h postgres -p 5432 -U iotpilot" || echo "Failed"
	@echo "Redis:" && docker exec iotpilot-server-app sh -c "redis-cli -h redis ping" || echo "Failed"
	@echo "InfluxDB:" && docker exec iotpilot-server-app sh -c "curl -sf http://influxdb:8086/health" || echo "Failed"
	@echo "Loki:" && docker exec iotpilot-server-app sh -c "curl -sf http://loki:3100/ready" || echo "Failed"
	@echo "Grafana:" && docker exec iotpilot-server-app sh -c "curl -sf http://grafana:3000/api/health" || echo "Failed"

# Quick smoke test
test-smoke:
	@echo "💨 Running smoke tests..."
	@make test-env-check
	@make test-services
	@make test-db
	@make test-api
	@echo "✅ Smoke tests complete!"

# Full test suite
test-all:
	@echo "🎯 Running complete test suite..."
	@make test-env-check
	@make test-services
	@make test-unit
	@make test-integration-full
	@make test-influxdb
	@make test-api
	@echo "🎉 All tests complete!"
# =============================================================================
# MAINTENANCE COMMANDS
# =============================================================================

backup:
	@echo "💾 Creating backup..."
	@mkdir -p ./backups
	@./scripts/backup.sh
	@echo "✅ Backup created!"

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
	@docker exec iotpilot-tailscale tailscale status --json 2>/dev/null | jq -r '.Peer[]? | select(.Online == true) | .HostName + " (" + .TailscaleIPs[0] + ")"' || echo "No devices connected"

tailscale-logs:
	@echo "📋 Tailscale Logs:"
	@docker logs iotpilot-tailscale --tail=50

# =============================================================================
# SUPERADMIN MANAGEMENT COMMANDS
# =============================================================================

create-superadmin:
	@echo "👑 Creating new SUPERADMIN user..."
	@cd app && npx ts-node ../scripts/create-superadmin.ts
	@echo "✅ SUPERADMIN creation process complete!"

list-superadmins:
	@echo "👑 Listing SUPERADMIN users..."
	@cd app && npx ts-node ../scripts/list-superadmins.ts

reset-superadmin-password:
	@echo "🔑 Resetting SUPERADMIN password..."
	@cd app && npx ts-node ../scripts/reset-superadmin-password.ts
	@echo "✅ Password reset process complete!"

delete-superadmin:
	@echo "⚠️ Deleting SUPERADMIN user..."
	@cd app && npx ts-node ../scripts/delete-superadmin.ts
	@echo "✅ SUPERADMIN deletion process complete!"

# =============================================================================
# UTILITY COMMANDS
# =============================================================================

# Environment management helper
setup-env:
	@echo "🔧 Setting up environment file..."
	@if [ ! -f .env ]; then \
		if [ -f .env.local ]; then \
			cp .env.local .env; \
			echo "✅ Copied .env.local to .env"; \
		elif [ -f .env.example ]; then \
			cp .env.example .env; \
			echo "✅ Copied .env.example to .env"; \
			echo "⚠️  Please edit .env with your actual values"; \
		else \
			echo "❌ No template file found. Please create .env manually"; \
		fi \
	else \
		echo "✅ .env already exists"; \
	fi

# Show all logs
logs-all:
	@echo "📋 All service logs:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs --tail=50

# Fix permissions (useful on Linux)
fix-permissions:
	@echo "🔧 Fixing permissions..."
	@sudo chown -R $(USER):$(USER) . 2>/dev/null || echo "No permission changes needed"

# Generate new secrets
generate-secrets:
	@echo "🔐 Generating new secrets..."
	@echo "JWT_SECRET=$(shell openssl rand -base64 32)"
	@echo "DEVICE_API_KEY=$(shell openssl rand -base64 24)"
	@echo "SESSION_SECRET=$(shell openssl rand -base64 32)"
