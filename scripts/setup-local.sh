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

    info "Configuration files created ✓"
}

# Load environment variables from .env
load_env() {
    if [ -f .env ]; then
        # Export variables from .env file
        set -a  # automatically export all variables
        source .env
        set +a  # stop automatically exporting
        info "Environment variables loaded from .env"
    else
        warn ".env file not found, using defaults"
        GRAFANA_PASSWORD=""
        INFLUXDB_PASSWORD=""
    fi
}

# Build and start services
start_services() {
    header "Building and starting services..."

    info "Building Docker images..."
    docker-compose -f docker/docker-compose.local.yml --env-file .env build --no-cache

    info "Starting services..."
    docker-compose -f docker/docker-compose.local.yml --env-file .env up -d

    info "Waiting for services to start..."
    sleep 15

    # Check service health
    docker-compose -f docker/docker-compose.local.yml ps
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
    echo "  • Main Dashboard:    https://iotpilotserver.test:9443"
    echo "  • Grafana:           http://iotpilotserver.test:3002"
    echo "  • InfluxDB:          http://iotpilotserver.test:8087"
    echo "  • Loki:              http://iotpilotserver.test:3101/metrics"
    echo "  • Traefik Dashboard: http://iotpilotserver.test:8081"
    echo ""
    echo "🔐 Login credentials:"
    echo "  • Grafana:    admin / ${GRAFANA_PASSWORD}"
    echo "  • InfluxDB:   admin / ${INFLUXDB_PASSWORD}"
    echo ""
    echo "🔧 Management commands:"
    echo "  • Help: make help"
    echo ""
    echo "🛠️ Next steps:"
    echo "  1. Configure your IoT device to send data to: http://iotpilotserver.test:3001"
    echo "  2. Set up Grafana dashboards for your metrics"
    echo "  3. Test data flow from your IoT device"
    echo ""
    echo "For logs: docker-compose -f docker/docker-compose.local.yml logs -f iotpilot-app"
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
    load_env
    start_services
    show_final_info
}

# Run main function
main