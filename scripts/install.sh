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
    setup_permissions
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