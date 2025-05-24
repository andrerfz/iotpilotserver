# IotPilot Server Management Makefile

.PHONY: help install start stop restart logs status clean build deploy backup restore update dev test

# Default target
help:
	@echo "IotPilot Server Management Commands"
	@echo "=================================="
	@echo ""
	@echo "Setup Commands:"
	@echo "  install      - Initial installation and setup"
	@echo "  build        - Build all Docker images"
	@echo "  deploy       - Deploy to production"
	@echo ""
	@echo "Service Management:"
	@echo "  start        - Start all services"
	@echo "  stop         - Stop all services"
	@echo "  restart      - Restart all services"
	@echo "  status       - Show service status"
	@echo ""
	@echo "Development:"
	@echo "  dev          - Start development environment"
	@echo "  test         - Run tests"
	@echo "  lint         - Run linter"
	@echo ""
	@echo "Maintenance:"
	@echo "  logs         - Show logs (use SERVICE=name for specific service)"
	@echo "  backup       - Create backup"
	@echo "  restore      - Restore from backup"
	@echo "  update       - Update and restart services"
	@echo "  clean        - Clean up unused Docker resources"
	@echo ""
	@echo "Examples:"
	@echo "  make logs SERVICE=iotpilot-app"
	@echo "  make backup"
	@echo "  make deploy"

# Variables
COMPOSE_FILE = docker-compose.yml
SERVICE ?= iotpilot-app
BACKUP_DIR = ./backups
ENV_FILE = .env

# Check if .env exists
check-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "❌ .env file not found!"; \
		echo "   Copy .env.example to .env and configure it first:"; \
		echo "   cp .env.example .env"; \
		exit 1; \
	fi

# Initial installation
install: check-env
	@echo "🚀 Installing IotPilot Server..."
	@chmod +x scripts/*.sh
	@./scripts/install.sh
	@echo "✅ Installation complete!"

# Build Docker images
build: check-env
	@echo "🔨 Building Docker images..."
	@docker compose -f $(COMPOSE_FILE) build --no-cache
	@echo "✅ Build complete!"

# Start services
start: check-env
	@echo "▶️  Starting IotPilot services..."
	@docker compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Services started!"
	@echo ""
	@echo "🌐 Access your installation:"
	@echo "   Dashboard: https://$(shell grep DOMAIN .env | cut -d '=' -f2)"
	@echo "   Grafana:   https://$(shell grep DOMAIN .env | cut -d '=' -f2)/grafana"
	@echo "   Traefik:   http://$(shell grep DOMAIN .env | cut -d '=' -f2):8080"

# Stop services
stop:
	@echo "⏹️  Stopping IotPilot services..."
	@docker compose -f $(COMPOSE_FILE) down
	@echo "✅ Services stopped!"

# Restart services
restart: stop start

# Show service status
status:
	@echo "📊 Service Status:"
	@echo "=================="
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "📈 Resource Usage:"
	@echo "=================="
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Show logs
logs:
	@echo "📋 Showing logs for $(SERVICE)..."
	@docker compose -f $(COMPOSE_FILE) logs -f --tail=100 $(SERVICE)

# Development environment
dev: check-env
	@echo "🛠️  Starting development environment..."
	@docker compose -f $(COMPOSE_FILE) -f docker-compose.dev.yml up --build
	@echo "✅ Development environment started!"

# Run tests
test:
	@echo "🧪 Running tests..."
	@cd app && npm test
	@echo "✅ Tests complete!"

# Run linter
lint:
	@echo "🔍 Running linter..."
	@cd app && npm run lint
	@echo "✅ Linting complete!"

# Create backup
backup:
	@echo "💾 Creating backup..."
	@mkdir -p $(BACKUP_DIR)
	@./scripts/backup.sh
	@echo "✅ Backup created in $(BACKUP_DIR)/"

# Restore from backup
restore:
	@echo "📥 Restoring from backup..."
	@./scripts/restore.sh
	@echo "✅ Restore complete!"

# Update services
update: check-env
	@echo "🔄 Updating IotPilot..."
	@git pull
	@docker compose -f $(COMPOSE_FILE) pull
	@docker compose -f $(COMPOSE_FILE) build --no-cache
	@docker compose -f $(COMPOSE_FILE) up -d
	@echo "✅ Update complete!"

# Deploy to production
deploy: check-env build
	@echo "🚀 Deploying to production..."
	@docker compose -f $(COMPOSE_FILE) up -d --remove-orphans
	@echo "✅ Deployment complete!"
	@echo ""
	@echo "🔍 Checking service health..."
	@sleep 10
	@make status

# Clean up Docker resources
clean:
	@echo "🧹 Cleaning up Docker resources..."
	@docker system prune -f
	@docker volume prune -f
	@echo "✅ Cleanup complete!"

# Show system information
info:
	@echo "📊 System Information:"
	@echo "====================="
	@echo "Docker version: $(shell docker --version)"
	@echo "Compose version: $(shell docker compose version)"
	@echo "Available disk space: $(shell df -h . | tail -1 | awk '{print $4}')"
	@echo "Memory usage: $(shell free -h | head -2 | tail -1 | awk '{print $3 "/" $2}')"
	@echo "Load average: $(shell uptime | awk -F'load average:' '{print $2}')"
	@echo ""
	@echo "🐳 Docker containers:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# SSH into a container
shell:
	@echo "🖥️  Opening shell in $(SERVICE)..."
	@docker compose -f $(COMPOSE_FILE) exec $(SERVICE) /bin/bash || \
	 docker compose -f $(COMPOSE_FILE) exec $(SERVICE) /bin/sh

# Show application logs with filtering
app-logs:
	@echo "📱 Application logs:"
	@docker compose -f $(COMPOSE_FILE) logs -f --tail=50 iotpilot-app | grep -E "(ERROR|WARN|INFO)"

# Database operations
db-migrate:
	@echo "🗄️  Running database migrations..."
	@docker compose -f $(COMPOSE_FILE) exec iotpilot-app npm run db:migrate
	@echo "✅ Migrations complete!"

db-seed:
	@echo "🌱 Seeding database..."
	@docker compose -f $(COMPOSE_FILE) exec iotpilot-app npm run db:seed
	@echo "✅ Database seeded!"

db-backup:
	@echo "💾 Creating database backup..."
	@docker compose -f $(COMPOSE_FILE) exec postgres pg_dump -U iotpilot iotpilot > $(BACKUP_DIR)/database-$(shell date +%Y%m%d-%H%M%S).sql
	@echo "✅ Database backup created!"

# Security scan
security-scan:
	@echo "🔒 Running security scan..."
	@docker run --rm -v $(PWD):/app -w /app node:18-alpine npm audit
	@echo "✅ Security scan complete!"

# Generate SSL certificates (for development)
ssl-cert:
	@echo "🔐 Generating SSL certificates..."
	@./scripts/generate-ssl.sh
	@echo "✅ SSL certificates generated!"

# Monitor real-time metrics
monitor:
	@echo "📊 Real-time monitoring (Press Ctrl+C to exit)..."
	@watch -n 2 'docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"'

# Check health of all services
health:
	@echo "❤️  Health check:"
	@echo "================"
	@for service in $(docker compose -f $(COMPOSE_FILE) config --services); do \
		echo -n "$service: "; \
		if docker compose -f $(COMPOSE_FILE) exec -T $service sh -c 'exit 0' 2>/dev/null; then \
			echo "✅ healthy"; \
		else \
			echo "❌ unhealthy"; \
		fi; \
	done

# Tail all logs
logs-all:
	@echo "📋 Showing all service logs..."
	@docker compose -f $(COMPOSE_FILE) logs -f --tail=20

# Quick setup for new installations
quick-setup: install build deploy
	@echo "🎉 Quick setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Configure your domain DNS"
	@echo "2. Set up device monitoring"
	@echo "3. Configure Grafana dashboards"

# Development helpers
dev-install:
	@echo "📦 Installing development dependencies..."
	@cd app && npm install
	@echo "✅ Development dependencies installed!"

dev-build:
	@echo "🔨 Building for development..."
	@cd app && npm run build
	@echo "✅ Development build complete!"

# Performance testing
perf-test:
	@echo "⚡ Running performance tests..."
	@docker run --rm --network iotpilot-network \
		-v $(PWD)/tests:/tests \
		node:18-alpine sh -c "cd /tests && npm install && npm run perf"
	@echo "✅ Performance tests complete!"