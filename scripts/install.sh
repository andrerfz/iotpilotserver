#!/bin/bash

# IotPilot Installation Script
# Used by Makefile for initial setup

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

header() {
    echo -e "${BLUE}[INSTALL]${NC} $1"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        error ".env file not found! Copy .env.example to .env and configure it first."
    fi
    info ".env file found ✓"
}

# Create necessary directories
create_directories() {
    header "Creating application directories..."

    mkdir -p data logs backups
    mkdir -p grafana/{dashboards,provisioning/dashboards,provisioning/datasources}
    mkdir -p influxdb/config
    mkdir -p loki
    mkdir -p traefik/{config,dynamic}
    mkdir -p prometheus
    mkdir -p alertmanager
    mkdir -p database/init
    mkdir -p ssh_keys

    info "Directories created ✓"
}

# Setup permissions
setup_permissions() {
    header "Setting up permissions..."

    # Create user if doesn't exist (Linux only)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if ! id -u iotpilot &>/dev/null; then
            sudo useradd -m -s /bin/bash iotpilot || true
            sudo usermod -aG docker iotpilot || true
            info "Created iotpilot user"
        fi

        # Set ownership
        sudo chown -R iotpilot:iotpilot . || true
    fi

    # Set script permissions
    chmod +x scripts/*.sh || true

    info "Permissions set ✓"
}

# Generate default configuration files
generate_configs() {
    header "Generating configuration files..."

    # Loki configuration
    cat > loki/config.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /tmp/loki
  storage:
    filesystem:
      chunks_directory: /tmp/loki/chunks
      rules_directory: /tmp/loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
EOF

    # Grafana datasources
    mkdir -p grafana/provisioning/datasources
    cat > grafana/provisioning/datasources/datasources.yml << EOF
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    database: iotpilot
    jsonData:
      version: Flux
      organization: \${INFLUXDB_ORG}
      defaultBucket: \${INFLUXDB_BUCKET}
    secureJsonData:
      token: \${INFLUXDB_TOKEN}

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false

  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: false
EOF

    # Prometheus configuration
    cat > prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'iotpilot-app'
    static_configs:
      - targets: ['iotpilot-app:3000']
    metrics_path: '/api/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8080']
EOF

    # Alertmanager configuration
    cat > alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alertmanager@iotpilot.app'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://iotpilot-app:3000/api/webhooks/alerts'
EOF

    # Redis configuration
    mkdir -p redis
    cat > redis/redis.conf << 'EOF'
# Redis configuration for IotPilot
bind 0.0.0.0
port 6379
protected-mode yes
requirepass ${REDIS_PASSWORD:-}

# Memory management
maxmemory 128mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile ""

# Performance
tcp-keepalive 300
timeout 0
EOF

    info "Configuration files generated ✓"
}

# Install Node.js dependencies
install_dependencies() {
    header "Installing Node.js dependencies..."

    if [ -d "app" ]; then
        cd app
        if [ -f "package.json" ]; then
            npm install
            info "Node.js dependencies installed ✓"
        else
            warn "No package.json found in app directory"
        fi
        cd ..
    else
        warn "No app directory found"
    fi
}

# Generate SSL certificates for development
generate_ssl_certs() {
    header "Generating SSL certificates for development..."

    if [ ! -f "traefik/config/cert.pem" ]; then
        mkdir -p traefik/config

        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout traefik/config/key.pem \
            -out traefik/config/cert.pem \
            -subj "/C=US/ST=State/L=City/O=IotPilot/CN=localhost" 2>/dev/null || true

        info "SSL certificates generated ✓"
    else
        info "SSL certificates already exist ✓"
    fi
}

# Initialize database
init_database() {
    header "Setting up database initialization..."

    cat > database/init/01-init.sql << 'EOF'
-- IotPilot Database Initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create additional databases if needed
-- CREATE DATABASE grafana;
EOF

    info "Database initialization script created ✓"
}

# Main installation function
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}        IotPilot Installation Script        ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    check_env
    create_directories
    setup_permissions
    generate_configs
    install_dependencies
    generate_ssl_certs
    init_database

    echo ""
    echo -e "${GREEN}✅ Installation completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: make build"
    echo "2. Run: make start"
    echo "3. Access your dashboard at: https://\$(grep DOMAIN .env | cut -d '=' -f2)"
    echo ""
}

# Run main function
main "$@"