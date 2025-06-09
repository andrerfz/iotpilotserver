#!/bin/bash

# IotPilot Device Agent Installer - LOCAL DEVELOPMENT
# Cross-platform installer for ARM devices (armv6, armv7, aarch64)
# Usage
# curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-install-local.sh | sudo IOTPILOT_SERVER="iotpilotserver.test:9443" INFLUXDB_TOKEN="your-token" DEVICE_API_KEY="your-key" DEVICE_LOCATION="office-lab" bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
header() { echo -e "${BLUE}[AGENT]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   error "Please run as root (sudo)"
fi

# Configuration - all from environment variables
IOTPILOT_SERVER="${IOTPILOT_SERVER:-iotpilotserver.test:9443}"
INFLUXDB_TOKEN="${INFLUXDB_TOKEN:-}"
DEVICE_API_KEY="${DEVICE_API_KEY:-}"
DEVICE_LOCATION="${DEVICE_LOCATION:-local-dev}"

# Validate required environment variables
if [ -z "$INFLUXDB_TOKEN" ]; then
   error "INFLUXDB_TOKEN environment variable is required"
fi

if [ -z "$DEVICE_API_KEY" ]; then
   error "DEVICE_API_KEY environment variable is required"
fi

# Detect device type
detect_device_type() {
   header "Detecting device information..."

   if [ -f /proc/device-tree/model ]; then
       DEVICE_MODEL=$(tr -d '\0' < /proc/device-tree/model)
       info "Device: $DEVICE_MODEL"

       # Set device type based on model
       if [[ "$DEVICE_MODEL" == *"Pi Zero"* ]]; then
           DEVICE_TYPE="pi-zero"
       elif [[ "$DEVICE_MODEL" == *"Pi 3"* ]]; then
           DEVICE_TYPE="pi-3"
       elif [[ "$DEVICE_MODEL" == *"Pi 4"* ]]; then
           DEVICE_TYPE="pi-4"
       elif [[ "$DEVICE_MODEL" == *"Pi 5"* ]]; then
           DEVICE_TYPE="pi-5"
       elif [[ "$DEVICE_MODEL" == *"Orange Pi"* ]]; then
           DEVICE_TYPE="orange-pi"
       else
           DEVICE_TYPE="raspberry-pi"
       fi
   else
       DEVICE_TYPE="unknown"
       warn "Could not detect device model"
   fi

   # Generate unique device ID
   DEVICE_ID=$(hostname)-$(cat /sys/class/net/eth0/address 2>/dev/null | tr -d ':' || echo "unknown")
   info "Device ID: $DEVICE_ID"
   info "Device Type: $DEVICE_TYPE"

   export DEVICE_TYPE DEVICE_MODEL DEVICE_ID
}

# Detect architecture
detect_architecture() {
   ARCH=$(uname -m)

   case "$ARCH" in
       "armv6l")
           ARM_TYPE="armv6"
           info "Detected: ARM v6 (32-bit) - Pi Zero"
           ;;
       "armv7l")
           ARM_TYPE="armv7"
           info "Detected: ARM v7 (32-bit) - Pi 2/3"
           ;;
       "aarch64")
           ARM_TYPE="arm64"
           info "Detected: ARM 64-bit - Pi 3/4/5"
           ;;
       "x86_64")
           ARM_TYPE="x86_64"
           info "Detected: x86_64 - Generic Linux"
           ;;
       *)
           ARM_TYPE="unknown"
           warn "Unknown architecture: $ARCH"
           ;;
   esac

   export ARCH ARM_TYPE
}

# Install system dependencies
install_dependencies() {
   header "Installing system dependencies..."

   # Update package list
   apt-get update

   # Install required packages
   apt-get install -y \
       curl \
       wget \
       unzip \
       jq \
       cron \
       lsb-release \
       gnupg2 \
       ca-certificates \
       apt-transport-https

   info "System dependencies installed"
}

# Install Telegraf with architecture support
install_telegraf() {
   header "Installing Telegraf for $ARM_TYPE architecture..."

   if command -v telegraf &> /dev/null; then
       info "Telegraf already installed"
       return 0
   fi

   # Architecture-specific installation
   case "$ARM_TYPE" in
       "armv6"|"armv7"|"arm64")
           info "Installing Telegraf for ARM architecture..."
           ;;
       "x86_64")
           info "Installing Telegraf for x86_64 architecture..."
           ;;
       *)
           warn "Unknown architecture, attempting standard installation..."
           ;;
   esac

   # Add InfluxData repository
   wget -qO- https://repos.influxdata.com/influxdb.key | apt-key add -
   echo "deb https://repos.influxdata.com/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/influxdb.list

   apt-get update

   # Install with error handling for architecture issues
   if apt-get install -y telegraf; then
       info "Telegraf installed successfully via repository"
   else
       warn "Repository installation failed, trying manual download..."
       install_telegraf_manual
       return $?
   fi

   # Create Telegraf configuration
   configure_telegraf
}

# Manual Telegraf installation fallback
install_telegraf_manual() {
   TELEGRAF_VERSION="1.28.5"

   case "$ARM_TYPE" in
       "armv6")
           TELEGRAF_URL="https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_armhf.deb"
           ;;
       "armv7")
           TELEGRAF_URL="https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_armhf.deb"
           ;;
       "arm64")
           TELEGRAF_URL="https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_arm64.deb"
           ;;
       "x86_64")
           TELEGRAF_URL="https://dl.influxdata.com/telegraf/releases/telegraf_${TELEGRAF_VERSION}-1_amd64.deb"
           ;;
       *)
           error "No manual installation available for $ARM_TYPE"
           ;;
   esac

   info "Downloading Telegraf for $ARM_TYPE..."
   wget "$TELEGRAF_URL" -O /tmp/telegraf.deb

   if dpkg -i /tmp/telegraf.deb; then
       info "Telegraf installed manually"
       rm /tmp/telegraf.deb

       # Fix any dependency issues
       apt-get install -f -y

       configure_telegraf
       return 0
   else
       error "Failed to install Telegraf manually"
       return 1
   fi
}

# Configure Telegraf
configure_telegraf() {
   info "Configuring Telegraf..."

   # Create Telegraf configuration
   cat > /etc/telegraf/telegraf.conf << EOF
# Global tags
[global_tags]
 device_id = "$DEVICE_ID"
 device_type = "$DEVICE_TYPE"
 device_model = "$DEVICE_MODEL"
 location = "$DEVICE_LOCATION"
 architecture = "$ARCH"

# Agent configuration
[agent]
 interval = "30s"
 round_interval = true
 metric_batch_size = 1000
 metric_buffer_limit = 10000
 collection_jitter = "5s"
 flush_interval = "30s"
 flush_jitter = "5s"
 precision = ""
 hostname = "$DEVICE_ID"
 omit_hostname = false

# Output to InfluxDB
[[outputs.influxdb_v2]]
 urls = ["https://$IOTPILOT_SERVER"]
 token = "$INFLUXDB_TOKEN"
 organization = "iotpilot"
 bucket = "devices"
 timeout = "10s"

# System metrics
[[inputs.cpu]]
 percpu = true
 totalcpu = true
 collect_cpu_time = false
 report_active = false

[[inputs.disk]]
 ignore_fs = ["tmpfs", "devtmpfs", "devfs", "iso9660", "overlay", "aufs", "squashfs"]

[[inputs.diskio]]

[[inputs.kernel]]

[[inputs.mem]]

[[inputs.processes]]

[[inputs.swap]]

[[inputs.system]]

[[inputs.net]]
 interfaces = ["eth0", "wlan0"]

# Temperature sensors (if available)
[[inputs.file]]
 files = ["/sys/class/thermal/thermal_zone0/temp"]
 name_override = "cpu_temperature"
 data_format = "value"
 data_type = "integer"

# Service status
[[inputs.systemd_units]]
 unittype = "service"
EOF

   # Start and enable Telegraf
   systemctl enable telegraf
   systemctl restart telegraf

   info "Telegraf configured and started"
}

# Install and configure Promtail for log shipping
install_promtail() {
   header "Installing Promtail for log shipping..."

   if [ -f /usr/local/bin/promtail ]; then
       info "Promtail already installed"
       return 0
   fi

   # Determine architecture for download
   PROMTAIL_VERSION="2.9.2"
   case "$ARM_TYPE" in
       "armv6")
           PROMTAIL_ARCH="armv6"
           ;;
       "armv7")
           PROMTAIL_ARCH="armv7"
           ;;
       "arm64")
           PROMTAIL_ARCH="arm64"
           ;;
       "x86_64")
           PROMTAIL_ARCH="amd64"
           ;;
       *)
           PROMTAIL_ARCH="arm64"
           warn "Unknown architecture, defaulting to arm64"
           ;;
   esac

   info "Downloading Promtail for $PROMTAIL_ARCH..."
   wget "https://github.com/grafana/loki/releases/download/v${PROMTAIL_VERSION}/promtail-linux-${PROMTAIL_ARCH}.zip" -O /tmp/promtail.zip

   unzip /tmp/promtail.zip -d /tmp/
   mv "/tmp/promtail-linux-${PROMTAIL_ARCH}" /usr/local/bin/promtail
   chmod +x /usr/local/bin/promtail
   rm /tmp/promtail.zip

   # Create Promtail configuration
   mkdir -p /etc/promtail
   cat > /etc/promtail/config.yml << EOF
server:
 http_listen_port: 9080
 grpc_listen_port: 0

positions:
 filename: /tmp/positions.yaml

clients:
 - url: https://$IOTPILOT_SERVER/loki/api/v1/push

scrape_configs:
 - job_name: system
   static_configs:
     - targets:
         - localhost
       labels:
         job: varlogs
         device_id: $DEVICE_ID
         device_type: $DEVICE_TYPE
         __path__: /var/log/*log

 - job_name: iotpilot-app
   static_configs:
     - targets:
         - localhost
       labels:
         job: iotpilot
         device_id: $DEVICE_ID
         device_type: $DEVICE_TYPE
         __path__: /opt/iotpilot/app/*.log

 - job_name: systemd
   journal:
     max_age: 12h
     labels:
       job: systemd-journal
       device_id: $DEVICE_ID
       device_type: $DEVICE_TYPE
   relabel_configs:
     - source_labels: ['__journal__systemd_unit']
       target_label: 'unit'
EOF

   # Create systemd service for Promtail
   cat > /etc/systemd/system/promtail.service << 'EOF'
[Unit]
Description=Promtail service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/promtail -config.file /etc/promtail/config.yml
Restart=on-failure
RestartSec=20
StandardOutput=journal
StandardError=journal
SyslogIdentifier=promtail

[Install]
WantedBy=multi-user.target
EOF

   # Start and enable Promtail
   systemctl daemon-reload
   systemctl enable promtail
   systemctl restart promtail

   info "Promtail configured and started"
}

# Create IotPilot device agent
create_device_agent() {
   header "Creating IotPilot device agent..."

   # Create the agent script
   cat > /usr/local/bin/iotpilot-agent << EOF
#!/bin/bash
# IotPilot Device Agent - Reports device status to central server

IOTPILOT_SERVER="$IOTPILOT_SERVER"
DEVICE_ID="$DEVICE_ID"
DEVICE_API_KEY="$DEVICE_API_KEY"

# Function to collect device metrics
collect_device_metrics() {
   # Get CPU temperature
   CPU_TEMP=0
   if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
       CPU_TEMP=\$(($(cat /sys/class/thermal/thermal_zone0/temp) / 1000))
   fi

   # Get memory usage
   MEMORY_INFO=\$(free -m | awk 'NR==2{printf "%.1f,%.1f,%.1f", \$3*100/\$2, \$3, \$2}')
   MEMORY_PERCENT=\$(echo \$MEMORY_INFO | cut -d',' -f1)
   MEMORY_USED=\$(echo \$MEMORY_INFO | cut -d',' -f2)
   MEMORY_TOTAL=\$(echo \$MEMORY_INFO | cut -d',' -f3)

   # Get disk usage
   DISK_INFO=\$(df -h / | awk 'NR==2{printf "%s,%s,%s", \$5, \$3, \$2}')
   DISK_PERCENT=\$(echo \$DISK_INFO | cut -d',' -f1 | tr -d '%')
   DISK_USED=\$(echo \$DISK_INFO | cut -d',' -f2)
   DISK_TOTAL=\$(echo \$DISK_INFO | cut -d',' -f3)

   # Get CPU usage (5-second average)
   CPU_USAGE=\$(top -bn1 | grep "Cpu(s)" | awk '{print \$2}' | awk -F'%' '{print \$1}')
   if [ -z "\$CPU_USAGE" ]; then
       CPU_USAGE=\$(top -bn2 -d1 | grep "Cpu(s)" | tail -1 | awk '{print \$2}' | awk -F'%' '{print \$1}')
   fi

   # Get load average
   LOAD_AVERAGE=\$(uptime | awk -F'load average:' '{print \$2}' | tr -d ' ')

   # Get network info
   IP_ADDRESS=\$(hostname -I | awk '{print \$1}')

   # Check if main application is running
   APP_STATUS="unknown"
   if systemctl is-active --quiet iotpilot 2>/dev/null; then
       APP_STATUS="running"
   elif [ -f /opt/iotpilot/app/server.js ]; then
       APP_STATUS="stopped"
   else
       APP_STATUS="not_installed"
   fi

   # Create JSON payload
   cat << JSON_EOF
{
 "device_id": "\$DEVICE_ID",
 "hostname": "\$(hostname)",
 "device_type": "$DEVICE_TYPE",
 "device_model": "$DEVICE_MODEL",
 "architecture": "$ARCH",
 "location": "$DEVICE_LOCATION",
 "ip_address": "\$IP_ADDRESS",
 "uptime": "\$(uptime -p)",
 "load_average": "\$LOAD_AVERAGE",
 "cpu_usage": \$CPU_USAGE,
 "cpu_temperature": \$CPU_TEMP,
 "memory_usage_percent": \$MEMORY_PERCENT,
 "memory_used_mb": \$MEMORY_USED,
 "memory_total_mb": \$MEMORY_TOTAL,
 "disk_usage_percent": \$DISK_PERCENT,
 "disk_used": "\$DISK_USED",
 "disk_total": "\$DISK_TOTAL",
 "app_status": "\$APP_STATUS",
 "agent_version": "1.0.0",
 "last_boot": "\$(uptime -s)",
 "timestamp": "\$(date -Iseconds)"
}
JSON_EOF
}

# Function to report device status
report_device_status() {
   DEVICE_DATA=\$(collect_device_metrics)

   # Send to IotPilot server
   HTTP_STATUS=\$(curl -w "%{http_code}" -o /dev/null -s \\
        -X POST "https://\$IOTPILOT_SERVER/api/devices/heartbeat" \\
        -H "Content-Type: application/json" \\
        -H "X-API-Key: \$DEVICE_API_KEY" \\
        -H "User-Agent: IotPilot-Agent/1.0.0" \\
        -d "\$DEVICE_DATA" \\
        --max-time 15 \\
        --connect-timeout 10)

   if [ "\$HTTP_STATUS" = "200" ] || [ "\$HTTP_STATUS" = "201" ]; then
       echo "\$(date): Successfully reported to https://\$IOTPILOT_SERVER"
   else
       echo "\$(date): Failed to report to https://\$IOTPILOT_SERVER (HTTP \$HTTP_STATUS)"
   fi
}

# Main execution
case "\$1" in
   "test")
       echo "Testing device agent..."
       collect_device_metrics | jq . 2>/dev/null || collect_device_metrics
       ;;
   "status")
       echo "Device ID: \$DEVICE_ID"
       echo "Server: https://\$IOTPILOT_SERVER"
       echo "Last report: \$(tail -1 /var/log/iotpilot-agent.log 2>/dev/null || echo 'No reports yet')"
       ;;
   *)
       report_device_status >> /var/log/iotpilot-agent.log 2>&1
       ;;
esac
EOF

   chmod +x /usr/local/bin/iotpilot-agent

   # Create log file
   touch /var/log/iotpilot-agent.log

   # Test the agent
   info "Testing device agent..."
   /usr/local/bin/iotpilot-agent test

   # Create cron job for regular reporting (every 5 minutes)
   (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/iotpilot-agent") | crontab -

   # Create systemd timer as backup (more reliable)
   cat > /etc/systemd/system/iotpilot-agent.service << 'EOF'
[Unit]
Description=IotPilot Device Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/iotpilot-agent
User=root
StandardOutput=append:/var/log/iotpilot-agent.log
StandardError=append:/var/log/iotpilot-agent.log
EOF

   cat > /etc/systemd/system/iotpilot-agent.timer << 'EOF'
[Unit]
Description=Run IotPilot Device Agent every 5 minutes
Requires=iotpilot-agent.service

[Timer]
Unit=iotpilot-agent.service
OnBootSec=60s
OnUnitActiveSec=5min
AccuracySec=30s

[Install]
WantedBy=timers.target
EOF

   systemctl daemon-reload
   systemctl enable iotpilot-agent.timer
   systemctl start iotpilot-agent.timer

   info "Device agent created and scheduled"
}

# Register device with server
register_device() {
   header "Registering device with IotPilot server..."

   REGISTRATION_DATA=$(cat << EOF
{
 "device_id": "$DEVICE_ID",
 "hostname": "$(hostname)",
 "device_type": "$DEVICE_TYPE",
 "device_model": "$DEVICE_MODEL",
 "architecture": "$ARCH",
 "location": "$DEVICE_LOCATION",
 "ip_address": "$(hostname -I | awk '{print $1}')",
 "auto_registered": true,
 "registration_time": "$(date -Iseconds)"
}
EOF
)

   info "Attempting to register with: https://$IOTPILOT_SERVER"

   HTTP_STATUS=$(curl -w "%{http_code}" -o /tmp/registration_response.json -s \
        -X POST "https://$IOTPILOT_SERVER/api/devices" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $DEVICE_API_KEY" \
        -H "User-Agent: IotPilot-Agent/1.0.0" \
        -d "$REGISTRATION_DATA" \
        --max-time 15 \
        --connect-timeout 10)

   if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
       info "Device registered successfully!"
       if [ -f /tmp/registration_response.json ]; then
           cat /tmp/registration_response.json | jq . 2>/dev/null || cat /tmp/registration_response.json
       fi
   else
       warn "Device registration failed (HTTP $HTTP_STATUS). Device will still report metrics."
       if [ -f /tmp/registration_response.json ]; then
           cat /tmp/registration_response.json
       fi
   fi

   rm -f /tmp/registration_response.json
}

# Show final information
show_final_info() {
   echo ""
   echo -e "${GREEN}=============================================${NC}"
   echo -e "${GREEN}   IotPilot Device Agent Installation Complete   ${NC}"
   echo -e "${GREEN}=============================================${NC}"
   echo ""
   echo "🎉 Device agent successfully installed!"
   echo ""
   echo "📊 Device Information:"
   echo "  • Device ID: $DEVICE_ID"
   echo "  • Device Type: $DEVICE_TYPE"
   echo "  • Model: $DEVICE_MODEL"
   echo "  • Architecture: $ARCH ($ARM_TYPE)"
   echo "  • Location: $DEVICE_LOCATION"
   echo ""
   echo "🔗 Connection:"
   echo "  • IotPilot Server: https://$IOTPILOT_SERVER"
   echo "  • Reporting Interval: Every 5 minutes"
   echo ""
   echo "📈 Monitoring:"
   echo "  • Metrics: Telegraf → InfluxDB"
   echo "  • Logs: Promtail → Loki"
   echo "  • Status: Device Agent → API"
   echo ""
   echo "🛠️ Management Commands:"
   echo "  • iotpilot-agent test    - Test agent functionality"
   echo "  • iotpilot-agent status  - Show agent status"
   echo "  • systemctl status iotpilot-agent.timer - Check timer status"
   echo "  • tail -f /var/log/iotpilot-agent.log - View agent logs"
   echo ""
   echo "📁 Configuration Files:"
   echo "  • Telegraf: /etc/telegraf/telegraf.conf"
   echo "  • Promtail: /etc/promtail/config.yml"
   echo "  • Agent: /usr/local/bin/iotpilot-agent"
   echo ""
   echo "🔧 Next Steps:"
   echo "  1. Check agent status: iotpilot-agent status"
   echo "  2. View logs: tail -f /var/log/iotpilot-agent.log"
   echo "  3. Verify device appears in your IotPilot dashboard"
   echo ""
   echo "Your device is now connected to the IotPilot management system!"
   echo ""
}

# Main installation function
main() {
   echo ""
   echo -e "${BLUE}=============================================${NC}"
   echo -e "${BLUE}   IotPilot Device Agent Installer (Local)   ${NC}"
   echo -e "${BLUE}=============================================${NC}"
   echo ""

   info "Installing IotPilot device monitoring agent..."
   info "Target server: https://$IOTPILOT_SERVER"
   info "This will add monitoring capabilities to your device"
   echo ""

   detect_device_type
   detect_architecture
   install_dependencies
   install_telegraf
   install_promtail
   create_device_agent
   register_device
   show_final_info
}

# Run main installation
main

exit 0