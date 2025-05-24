#!/bin/bash

# IotPilot Local Development Setup for macOS
# This script sets up the IoT server for local testing

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
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    header "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker Desktop for macOS first."
    fi

    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker Desktop."
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not available. Please ensure Docker Desktop is properly installed."
    fi

    info "Docker is installed and running ✓"
}

# Setup hosts file for local domains
setup_hosts() {
    header "Setting up local domains..."

    # Check if entries already exist
    if grep -q "iotpilotserver.test" /etc/hosts; then
        info "iotpilotserver.test already in hosts file"
    else
        info "Adding iotpilotserver.test to hosts file (requires sudo)..."
        echo "127.0.0.1 iotpilotserver.test" | sudo tee -a /etc/hosts
    fi

    # Check if iotpilot.test exists (your IoT device)
    if grep -q "iotpilot.test" /etc/hosts; then
        info "iotpilot.test already in hosts file ✓"
    else
        warn "iotpilot.test not found in hosts file. Make sure your IoT device is accessible."
        info "You may need to add: 127.0.0.1 iotpilot.test"
    fi
}

# Create necessary directories
create_directories() {
    header "Creating necessary directories..."

    mkdir -p data logs backups
    mkdir -p grafana/{dashboards,provisioning/dashboards,provisioning/datasources}
    mkdir -p influxdb/config
    mkdir -p loki
    mkdir -p database/init

    info "Directories created ✓"
}

# Setup configuration files
setup_configs() {
    header "Setting up configuration files..."

    # Copy .env.local to .env if it doesn't exist
    if [ ! -f .env ]; then
        cp .env.local .env
        info "Created .env file from .env.local"
    else
        info ".env file already exists"
    fi

    # Create minimal Loki config
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
  alertmanager_url: http://localhost:9093
EOF

    # Create Grafana datasource config
    mkdir -p grafana/provisioning/datasources
    cat > grafana/provisioning/datasources/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    database: iotpilot
    jsonData:
      version: Flux
      organization: iotpilot
      defaultBucket: devices
    secureJsonData:
      token: my-super-secret-auth-token-for-local-testing

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: false
EOF

    info "Configuration files created ✓"
}

# Build and start services
start_services() {
    header "Building and starting services..."

    info "Building Docker images..."
    docker-compose -f docker-compose.local.yml build

    info "Starting services..."
    docker-compose -f docker-compose.local.yml up -d

    info "Waiting for services to start..."
    sleep 15

    # Check service health
    docker-compose -f docker-compose.local.yml ps
}

# Test connectivity to IoT device
test_iot_connectivity() {
    header "Testing IoT device connectivity..."

    if curl -s --connect-timeout 5 http://iotpilot.test &> /dev/null; then
        info "Successfully connected to IoT device at iotpilot.test ✓"
    else
        warn "Cannot reach IoT device at iotpilot.test"
        info "Make sure your IoT device Docker container is running and accessible"
    fi
}

# Show final information
show_final_info() {
    echo ""
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}    IotPilot Server - Local Setup Complete  ${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    echo "🎉 Your IotPilot server is now running locally!"
    echo ""
    echo "📱 Access URLs:"
    echo "  • Main Dashboard:    http://iotpilotserver.test:3001"
    echo "  • Grafana:           http://iotpilotserver.test:3002"
    echo "  • InfluxDB:          http://iotpilotserver.test:8087"
    echo "  • Loki:              http://iotpilotserver.test:3101"
    echo "  • Traefik Dashboard: http://iotpilotserver.test:8081"
    echo ""
    echo "🔐 Login credentials:"
    echo "  • Grafana:    admin / admin123"
    echo "  • InfluxDB:   admin / influxdb123"
    echo ""
    echo "🔧 Management commands:"
    echo "  • Start:    docker-compose -f docker-compose.local.yml up -d"
    echo "  • Stop:     docker-compose -f docker-compose.local.yml down"
    echo "  • Logs:     docker-compose -f docker-compose.local.yml logs -f [service]"
    echo "  • Status:   docker-compose -f docker-compose.local.yml ps"
    echo ""
    echo "🌐 IoT Device:"
    echo "  • Your device should be accessible at: http://iotpilot.test"
    echo "  • The server will collect metrics from this device"
    echo ""
    echo "🛠️ Next steps:"
    echo "  1. Configure your IoT device to send data to: http://iotpilotserver.test:3001"
    echo "  2. Set up Grafana dashboards for your metrics"
    echo "  3. Test data flow from your IoT device"
    echo ""
    echo "For logs: docker-compose -f docker-compose.local.yml logs -f iotpilot-app"
    echo ""
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}   IotPilot Server - Local Development Setup ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    check_prerequisites
    setup_hosts
    create_directories
    setup_configs
    start_services
    test_iot_connectivity
    show_final_info
}

# Run main function
main