# IotPilot Server Management Makefile

.PHONY: help install start stop restart logs status clean build deploy backup restore update
.PHONY: local-install local-start local-stop local-restart local-logs local-status local-clean
.PHONY: dev test lint shell health

# Variables
COMPOSE_FILE = docker-compose.yml
LOCAL_COMPOSE_FILE = docker/docker-compose.local.yml
SERVICE ?= iotpilot-app
ENV_FILE = .env
LOCAL_ENV_FILE = .env.local

# Default target
help:
	@echo "IotPilot Server Management Commands"
	@echo "=================================="
	@echo ""
	@echo "Production:"
	@echo "  install      - Initial installation and setup"
	@echo "  build        - Build Docker images"
	@echo "  start        - Start services"
	@echo "  stop         - Stop services"
	@echo "  restart      - Restart services"
	@echo "  status       - Show service status"
	@echo "  logs         - Show logs (SERVICE=name for specific)"
	@echo "  deploy       - Deploy to production"
	@echo ""
	@echo "Local Development:"
	@echo "  local-install - Setup local environment"
	@echo "  local-start   - Start local services"
	@echo "  local-stop    - Stop local services"
	@echo "  local-restart - Restart local services"
	@echo "  local-status  - Show local status"
	@echo "  local-logs    - Show local logs"
	@echo "  local-clean   - Clean local resources"
	@echo ""
	@echo "Development:"
	@echo "  dev          - Start development (alias for local-start)"
	@echo "  test         - Run tests"
	@echo "  lint         - Run linter"
	@echo ""
	@echo "Maintenance:"
	@echo "  backup       - Create backup"
	@echo "  restore      - Restore from backup"
	@echo "  update       - Update and restart"
	@echo "  clean        - Clean Docker resources"
	@echo "  shell        - SSH into container"
	@echo "  health       - Health check"

# Check environment files
check-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "❌ .env not found! Copy .env.example to .env"; exit 1; \
	fi

check-local-env:
	@if [ ! -f $(LOCAL_ENV_FILE) ]; then \
		echo "❌ .env.local not found! Copy .env.example to .env.local"; exit 1; \
	fi

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

local-install: check-local-env
	@echo "🚀 Setting up local development..."
	@chmod +x scripts/*.sh
	@./scripts/setup-local.sh
	@echo "✅ Local setup complete!"

local-start: check-local-env
	@echo "▶️  Starting local services..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) up -d
	@echo "✅ Local services started!"
	@echo "🌐 Dashboard: http://iotpilotserver.test:3001"
	@echo "🌐 Grafana: http://iotpilotserver.test:3002"

local-stop:
	@echo "⏹️  Stopping local services..."
	@docker compose -f $(LOCAL_COMPOSE_FILE) down
	@echo "✅ Local services stopped!"

local-restart: local-stop local-start

local-status:
	@echo "📊 Local Service Status:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) ps
	@echo ""
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

local-logs:
	@echo "📋 Local logs for $(SERVICE):"
	@docker compose -f $(LOCAL_COMPOSE_FILE) logs -f --tail=100 $(SERVICE)

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
	@echo "🧪 Running tests..."
	@cd app && npm test
	@echo "✅ Tests complete!"

lint:
	@echo "🔍 Running linter..."
	@cd app && npm run lint
	@echo "✅ Linting complete!"

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
quick-dev: local-install local-start
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
	@echo "Production:"
	@docker compose -f $(COMPOSE_FILE) ps 2>/dev/null || echo "  Not running"
	@echo "Local:"
	@docker compose -f $(LOCAL_COMPOSE_FILE) ps 2>/dev/null || echo "  Not running"