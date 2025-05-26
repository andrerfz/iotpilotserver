#!/bin/bash

# IotPilot Orange Pi Zero 3 Server Deployment Script
# This script sets up a complete IoT management server on Orange Pi Zero 3
# Usage: curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilot/main/scripts/orangepi-server-setup.sh | sudo bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored messages
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (sudo)"
fi

# Environment variables (can be passed when running the script)
TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-}"
DOMAIN="${DOMAIN:-iotpilot.app}"
ACME_EMAIL="${ACME_EMAIL:-admin@iotpilot.app}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-$(openssl rand -base64 12)}"
INFLUXDB_PASSWORD="${INFLUXDB_PASSWORD:-$(openssl rand -base64 12)}"
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-$(openssl rand -base64 32)}"

# Create application user
create_app_user() {
    info "Creating iotpilot application user..."
    if ! id -u iotpilot &>/dev/null; then
        useradd -m -s /bin/bash iotpilot
        usermod -aG docker iotpilot
        info "Created iotpilot user and added to docker group"
    else
        info "iotpilot user already exists"
    fi
}

# Detect Orange Pi model
detect_hardware() {
    header "Detecting hardware..."

    if [ -f /proc/device-tree/model ]; then
        MODEL=$(tr -d '\0' < /proc/device-tree/model)
        info "Detected: $MODEL"

        if [[ "$MODEL" == *"Orange Pi Zero 3"* ]]; then
            info "Orange Pi Zero 3 confirmed - perfect for IoT management!"
        else
            warn "This script is optimized for Orange Pi Zero 3, but will try to continue"
        fi
    else
        warn "Could not detect hardware model"
    fi

    # Check architecture
    ARCH=$(uname -m)
    info "Architecture: $ARCH"

    # Check available memory
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_MB=$((MEMORY_KB / 1024))
    info "Available memory: ${MEMORY_MB}MB"

    if [ $MEMORY_MB -lt 1024 ]; then
        warn "Less than 1GB RAM detected. Consider using lightweight configuration."
        export USE_LIGHTWEIGHT_CONFIG=true
    fi
}

# Update system
update_system() {
    header "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y

    info "Installing essential packages..."
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        htop \
        nano \
        jq \
        openssl \
        ca-certificates \
        gnupg \
        lsb-release \
        avahi-daemon \
        ufw
}

# Install Docker
install_docker() {
    header "Installing Docker..."

    if command -v docker &> /dev/null; then
        info "Docker is already installed"
        docker --version
    else
        info "Installing Docker from official repository..."

        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

        # Add Docker repository
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker
        apt-get update -y
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

        # Start and enable Docker
        systemctl start docker
        systemctl enable docker

        info "Docker installed successfully"
    fi

    # Add users to docker group
    usermod -aG docker iotpilot
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
    fi
}

# Install Tailscale
install_tailscale() {
    header "Installing Tailscale..."

    if command -v tailscale &> /dev/null; then
        info "Tailscale is already installed"
    else
        curl -fsSL https://tailscale.com/install.sh | sh
        info "Tailscale installed successfully"
    fi

    if [ -n "$TAILSCALE_AUTH_KEY" ]; then
        info "Connecting to Tailscale network..."
        tailscale up --authkey="$TAILSCALE_AUTH_KEY" \
                     --hostname="iotpilot-server" \
                     --advertise-tags=tag:server \
                     --accept-routes

        # Get Tailscale IP
        sleep 5
        TAILSCALE_IP=$(tailscale ip -4)
        TAILSCALE_DOMAIN=$(tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//')

        info "Tailscale IP: $TAILSCALE_IP"
        info "Tailscale domain: $TAILSCALE_DOMAIN"

        # Save for later use
        echo "TAILSCALE_IP=$TAILSCALE_IP" >> /opt/iotpilot/.env
        echo "TAILSCALE_DOMAIN=$TAILSCALE_DOMAIN" >> /opt/iotpilot/.env
    else
        warn "No Tailscale auth key provided. You'll need to configure it manually."
        info "Run: sudo tailscale up --authkey=YOUR_KEY --hostname=iotpilot-server"
    fi
}

# Setup application directory
setup_application_directory() {
    header "Setting up application directory..."

    # Create application directory
    mkdir -p /opt/iotpilot
    cd /opt/iotpilot

    # Clone repository
    if [ -d "/opt/iotpilot/.git" ]; then
        info "Repository already exists, updating..."
        git pull
    else
        info "Cloning IotPilot repository..."
        git clone https://github.com/andrerfz/iotpilot.git .
    fi

    # Set ownership
    chown -R iotpilot:iotpilot /opt/iotpilot
}

# Create configuration files
create_configuration_files() {
    header "Creating configuration files..."

    # Create .env file
    cat > /opt/iotpilot/.env << EOF
# IotPilot Server Configuration
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL

# Database Configuration
POSTGRES_DB=iotpilot
POSTGRES_USER=iotpilot
POSTGRES_PASSWORD=$(openssl rand -base64 12)

# Grafana Configuration
GRAFANA_PASSWORD=$GRAFANA_PASSWORD

# InfluxDB Configuration
INFLUXDB_USERNAME=admin
INFLUXDB_PASSWORD=$INFLUXDB_PASSWORD
INFLUXDB_TOKEN=$INFLUXDB_TOKEN
INFLUXDB_ORG=iotpilot
INFLUXDB_BUCKET=devices

# Security
JWT_SECRET=$(openssl rand -base64 32)
DEVICE_API_KEY=$(openssl rand -base64 24)

# Tailscale (will be filled automatically)
TAILSCALE_AUTH_KEY=$TAILSCALE_AUTH_KEY
EOF

    # Create additional required directories
    mkdir -p /opt/iotpilot/{data,logs,backups}
    mkdir -p /opt/iotpilot/grafana/{dashboards,provisioning/dashboards,provisioning/datasources}
    mkdir -p /opt/iotpilot/traefik/{config,dynamic}
    mkdir -p /opt/iotpilot/loki

    # Set proper ownership
    chown -R iotpilot:iotpilot /opt/iotpilot
}

# Setup firewall
setup_firewall() {
    header "Configuring firewall..."

    # Reset UFW
    ufw --force reset

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow ssh

    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Allow Traefik dashboard (restrict this in production)
    ufw allow 8080/tcp

    # Allow Tailscale
    ufw allow in on tailscale0

    # Enable firewall
    ufw --force enable

    info "Firewall configured successfully"
}

# Setup system services
setup_system_services() {
    header "Setting up system services..."

    # Create systemd service for IotPilot
    cat > /etc/systemd/system/iotpilot.service << 'EOF'
[Unit]
Description=IotPilot Server
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
WorkingDirectory=/opt/iotpilot
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=iotpilot
Group=docker

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start the service
    systemctl daemon-reload
    systemctl enable iotpilot.service

    info "IotPilot service created and enabled"
}

# Create management scripts
create_management_scripts() {
    header "Creating management scripts..."

    # Create control script
    cat > /usr/local/bin/iotpilot << 'EOF'
#!/bin/bash
# IotPilot Management Script

IOTPILOT_DIR="/opt/iotpilot"

case "$1" in
    start)
        echo "Starting IotPilot services..."
        cd $IOTPILOT_DIR && docker compose up -d
        ;;
    stop)
        echo "Stopping IotPilot services..."
        cd $IOTPILOT_DIR && docker compose down
        ;;
    restart)
        echo "Restarting IotPilot services..."
        cd $IOTPILOT_DIR && docker compose down && docker compose up -d
        ;;
    logs)
        cd $IOTPILOT_DIR && docker compose logs -f "${2:-iotpilot-app}"
        ;;
    status)
        cd $IOTPILOT_DIR && docker compose ps
        ;;
    update)
        echo "Updating IotPilot..."
        cd $IOTPILOT_DIR
        git pull
        docker compose down
        docker compose build --no-cache
        docker compose up -d
        ;;
    backup)
        echo "Creating backup..."
        tar -czf "/tmp/iotpilot-backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C /opt iotpilot
        echo "Backup created in /tmp/"
        ;;
    *)
        echo "Usage: iotpilot {start|stop|restart|logs|status|update|backup}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show logs (optionally specify service)"
        echo "  status  - Show service status"
        echo "  update  - Update and restart services"
        echo "  backup  - Create a backup"
        exit 1
        ;;
esac
EOF

    chmod +x /usr/local/bin/iotpilot

    info "Management script created: 'iotpilot' command available"
}

# Start services
start_services() {
    header "Starting IotPilot services..."

    cd /opt/iotpilot

    # Start services as iotpilot user
    sudo -u iotpilot docker compose up -d

    # Wait for services to start
    sleep 10

    # Check service status
    sudo -u iotpilot docker compose ps
}

# Display final information
show_final_information() {
    echo ""
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${GREEN}    IotPilot Server Installation Complete   ${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo ""
    echo "🎉 Your IotPilot server is now running on Orange Pi Zero 3!"
    echo ""
    echo "📱 Access your installation:"
    echo "  • Main Dashboard: https://$DOMAIN"
    echo "  • Grafana:        https://$DOMAIN/grafana"
    echo "  • Traefik:        http://$DOMAIN:8080"

    if [ -n "$TAILSCALE_DOMAIN" ]; then
        echo "  • Tailscale:      https://$TAILSCALE_DOMAIN"
    fi

    echo ""
    echo "🔐 Login credentials:"
    echo "  • Grafana admin password: $GRAFANA_PASSWORD"
    echo "  • Database password saved in: /opt/iotpilot/.env"
    echo ""
    echo "🛠️ Management commands:"
    echo "  • iotpilot start    - Start services"
    echo "  • iotpilot stop     - Stop services"
    echo "  • iotpilot restart  - Restart services"
    echo "  • iotpilot logs     - View logs"
    echo "  • iotpilot status   - Check status"
    echo ""
    echo "📁 Important files:"
    echo "  • Application: /opt/iotpilot/"
    echo "  • Logs: /opt/iotpilot/logs/"
    echo "  • Configuration: /opt/iotpilot/.env"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Configure your domain DNS to point to this server"
    echo "  2. Add your first IoT device using the device installation script"
    echo "  3. Configure Grafana dashboards for monitoring"
    echo ""
    echo "For support and documentation: https://github.com/andrerfz/iotpilot"
    echo ""
}

# Main installation function
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}   IotPilot Orange Pi Zero 3 Server Setup   ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    info "Starting automated installation..."
    info "This will take 10-15 minutes depending on internet speed"
    echo ""

    detect_hardware
    create_app_user
    update_system
    install_docker
    install_tailscale
    setup_application_directory
    create_configuration_files
    setup_firewall
    setup_system_services
    create_management_scripts
    start_services
    show_final_information
}

# Run main installation
main

exit 0