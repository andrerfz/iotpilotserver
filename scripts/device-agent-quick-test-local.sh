#!/bin/bash

# https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-quick-test-local.sh

set -e

echo "🚀 Starting IoT test device..."

# Install dependencies
echo "📦 Installing dependencies..."
export DEBIAN_FRONTEND=noninteractive

echo "  Updating package lists..."
if ! apt-get update -qq; then
    echo "❌ Package update failed"
    exit 1
fi

echo "  Installing curl jq cron procps ca-certificates..."
if ! apt-get install -y curl jq cron procps ca-certificates --no-install-recommends; then
    echo "❌ Package installation failed"
    exit 1
fi

echo "✅ Dependencies installed"

# Use passed environment variables or generate fallback
if [ -n "$DEVICE_ID" ]; then
    echo "📱 Using provided Device ID: $DEVICE_ID"
else
    # Fallback: Generate device ID if not provided
    DEVICE_ID="test-device-$(hostname)"
    echo "📱 Generated Device ID: $DEVICE_ID"
fi

DEVICE_NAME="${DEVICE_NAME:-$DEVICE_ID}"
echo "📛 Device Name: $DEVICE_NAME"
echo "📍 Location: ${DEVICE_LOCATION:-unknown}"
echo "🔑 API Key: ${DEVICE_API_KEY:0:8}... (${#DEVICE_API_KEY} chars)"
echo "🏷️  InfluxDB Token: ${INFLUXDB_TOKEN:0:8}... (${#INFLUXDB_TOKEN} chars)"

# Determine protocol based on server URL
if [[ "$IOTPILOT_SERVER" == *"://"* ]]; then
    # URL already includes protocol
    SERVER_URL="$IOTPILOT_SERVER"
else
    # No protocol specified, determine based on server name
    if [[ "$IOTPILOT_SERVER" == *":3000" ]] || [[ "$IOTPILOT_SERVER" == "iotpilot-server-app"* ]]; then
        # Internal container communication - use HTTP
        SERVER_URL="http://$IOTPILOT_SERVER"
    else
        # External communication - use HTTPS
        SERVER_URL="https://$IOTPILOT_SERVER"
    fi
fi

echo "🌐 Using server URL: $SERVER_URL"

# Create heartbeat script
echo "📝 Creating heartbeat script..."
cat > /usr/local/bin/heartbeat.sh << 'EOF'
#!/bin/bash

# Collect system metrics with proper error handling
get_cpu_usage() {
    # Try multiple methods to get CPU usage
    local cpu_usage=""

    # Method 1: top command
    cpu_usage=$(top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\([0-9.]*\)%* id.*/\1/' | awk '{print 100 - $1}' 2>/dev/null)

    # Method 2: vmstat if available
    if [[ -z "$cpu_usage" ]] && command -v vmstat &> /dev/null; then
        cpu_usage=$(vmstat 1 2 | tail -1 | awk '{print 100-$15}' 2>/dev/null)
    fi

    # Method 3: /proc/stat calculation
    if [[ -z "$cpu_usage" ]] && [[ -f /proc/stat ]]; then
        cpu_usage=$(awk '/^cpu / {usage=($2+$4)*100/($2+$3+$4+$5)} END {printf "%.1f", usage}' /proc/stat 2>/dev/null)
    fi

    # Fallback to random realistic value for testing
    echo "${cpu_usage:-$(echo $((RANDOM % 30 + 10)).$(echo $((RANDOM % 9 + 1))))}"
}

get_memory_info() {
    if command -v free &> /dev/null; then
        free -m | awk 'NR==2{printf "%.1f,%.1f,%.1f", $3*100/$2, $3, $2}' 2>/dev/null
    elif [[ -f /proc/meminfo ]]; then
        # Parse /proc/meminfo
        local mem_total=$(grep MemTotal /proc/meminfo | awk '{print int($2/1024)}')
        local mem_free=$(grep MemFree /proc/meminfo | awk '{print int($2/1024)}')
        local mem_used=$((mem_total - mem_free))
        local mem_percent=$(echo "scale=1; $mem_used * 100 / $mem_total" | bc -l 2>/dev/null || echo "35.2")
        echo "${mem_percent},${mem_used},${mem_total}"
    else
        # Fallback for testing
        echo "$(echo $((RANDOM % 40 + 30)).$(echo $((RANDOM % 9 + 1)))),512,1024"
    fi
}

get_disk_info() {
    if command -v df &> /dev/null; then
        df -h / | awk 'NR==2{printf "%s,%s,%s", $5, $3, $2}' 2>/dev/null
    else
        # Fallback for testing
        echo "$(echo $((RANDOM % 30 + 20)))%,$(echo $((RANDOM % 5 + 1))).$(echo $((RANDOM % 9 + 1)))G,$(echo $((RANDOM % 10 + 5))).0G"
    fi
}

get_cpu_temp() {
    # Try to get CPU temperature
    if [[ -f /sys/class/thermal/thermal_zone0/temp ]]; then
        local temp_millicelsius=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
        if [[ -n "$temp_millicelsius" && "$temp_millicelsius" =~ ^[0-9]+$ ]]; then
            echo "scale=1; $temp_millicelsius / 1000" | bc -l 2>/dev/null
        fi
    fi

    # Fallback to simulated temperature for testing
    echo "$(echo $((RANDOM % 20 + 45))).$(echo $((RANDOM % 9 + 1)))"
}

# Export environment variables for the script
export DEVICE_ID="$DEVICE_ID"
export DEVICE_NAME="$DEVICE_NAME"
export DEVICE_LOCATION="$DEVICE_LOCATION"
export SERVER_URL="$SERVER_URL"
export DEVICE_API_KEY="$DEVICE_API_KEY"

# Get metrics with error handling
echo "🔍 Collecting system metrics..."

CPU_USAGE=$(get_cpu_usage)
echo "  CPU Usage: ${CPU_USAGE}%"

MEM_INFO=$(get_memory_info)
MEM_PERCENT=$(echo $MEM_INFO | cut -d',' -f1)
MEM_USED=$(echo $MEM_INFO | cut -d',' -f2)
MEM_TOTAL=$(echo $MEM_INFO | cut -d',' -f3)
echo "  Memory: ${MEM_PERCENT}% (${MEM_USED}MB/${MEM_TOTAL}MB)"

DISK_INFO=$(get_disk_info)
DISK_PERCENT=$(echo $DISK_INFO | cut -d',' -f1 | tr -d '%')
DISK_USED=$(echo $DISK_INFO | cut -d',' -f2)
DISK_TOTAL=$(echo $DISK_INFO | cut -d',' -f3)
echo "  Disk: ${DISK_PERCENT}% (${DISK_USED}/${DISK_TOTAL})"

CPU_TEMP=$(get_cpu_temp)
echo "  CPU Temperature: ${CPU_TEMP}°C"

# Get load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | tr -d ' ' 2>/dev/null || echo "0.15, 0.25, 0.30")
echo "  Load Average: $LOAD_AVG"

# Get IP address
IP_ADDR=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "172.20.0.100")
echo "  IP Address: $IP_ADDR"

# Create JSON payload
DEVICE_DATA=$(cat << JSON_EOF
{
  "device_id": "$DEVICE_ID",
  "hostname": "$DEVICE_NAME",
  "device_type": "GENERIC",
  "device_model": "Test Container",
  "architecture": "$(uname -m)",
  "location": "$DEVICE_LOCATION",
  "ip_address": "$IP_ADDR",
  "uptime": "$(uptime -p 2>/dev/null || echo 'up 1 hour')",
  "load_average": "$LOAD_AVG",
  "cpu_usage": ${CPU_USAGE},
  "cpu_temperature": ${CPU_TEMP},
  "memory_usage_percent": ${MEM_PERCENT},
  "memory_used_mb": ${MEM_USED},
  "memory_total_mb": ${MEM_TOTAL},
  "disk_usage_percent": ${DISK_PERCENT},
  "disk_used": "${DISK_USED}",
  "disk_total": "${DISK_TOTAL}",
  "app_status": "RUNNING",
  "agent_version": "1.0.0-test-container",
  "last_boot": "$(uptime -s 2>/dev/null || date -Iseconds)",
  "timestamp": "$(date -Iseconds)"
}
JSON_EOF
)

echo "📊 Sending heartbeat payload:"
echo "$DEVICE_DATA" | jq . 2>/dev/null || echo "$DEVICE_DATA"

# Send heartbeat - FIXED: Use correct endpoint
echo "$(date): Sending heartbeat for $DEVICE_ID to $SERVER_URL"

# Add insecure flag for HTTPS with self-signed certs
CURL_OPTS=""
if [[ "$SERVER_URL" == "https://"* ]]; then
    CURL_OPTS="-k --insecure"
fi

# FIXED: Use existing /api/heartbeat endpoint
HTTP_STATUS=$(curl $CURL_OPTS -w "%{http_code}" -o /tmp/heartbeat_response.json -s \
  -X POST "$SERVER_URL/api/heartbeat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d "$DEVICE_DATA" \
  --max-time 15 --connect-timeout 10)

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "$(date): ✅ Heartbeat successful ($HTTP_STATUS)"
  cat /tmp/heartbeat_response.json 2>/dev/null | jq . 2>/dev/null || cat /tmp/heartbeat_response.json
else
  echo "$(date): ❌ Heartbeat failed ($HTTP_STATUS)"
  echo "Response:"
  cat /tmp/heartbeat_response.json 2>/dev/null || echo "No response body"

  # Debug information
  echo "Debug info:"
  echo "  Server URL: $SERVER_URL"
  echo "  API Key: ${DEVICE_API_KEY:0:10}..."
  echo "  Device ID: $DEVICE_ID"
fi
EOF

chmod +x /usr/local/bin/heartbeat.sh

# Export variables for use in the heartbeat script
export DEVICE_ID="$DEVICE_ID"
export DEVICE_NAME="$DEVICE_NAME"
export DEVICE_LOCATION="${DEVICE_LOCATION:-docker-test-lab}"
export SERVER_URL="$SERVER_URL"
export DEVICE_API_KEY="$DEVICE_API_KEY"

# Register device
echo "📝 Registering device with IoTPilot server..."
REGISTRATION_DATA=$(cat << JSON_EOF
{
  "device_id": "$DEVICE_ID",
  "hostname": "$DEVICE_NAME",
  "device_type": "GENERIC",
  "device_model": "Test Container",
  "architecture": "$(uname -m)",
  "location": "$DEVICE_LOCATION",
  "ip_address": "$(hostname -I | awk '{print $1}' 2>/dev/null || echo '172.20.0.100')",
  "auto_registered": true,
  "registration_time": "$(date -Iseconds)"
}
JSON_EOF
)

# Add insecure flag for HTTPS with self-signed certs
CURL_OPTS=""
if [[ "$SERVER_URL" == "https://"* ]]; then
    CURL_OPTS="-k --insecure"
fi

echo "🔗 Registering at: $SERVER_URL/api/devices"
echo "📋 Registration payload:"
echo "$REGISTRATION_DATA" | jq . 2>/dev/null || echo "$REGISTRATION_DATA"

HTTP_STATUS=$(curl $CURL_OPTS -w "%{http_code}" -o /tmp/registration_response.json -s \
  -X POST "$SERVER_URL/api/devices" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d "$REGISTRATION_DATA" \
  --max-time 15)

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Device registered successfully"
  cat /tmp/registration_response.json 2>/dev/null | jq . 2>/dev/null || cat /tmp/registration_response.json
else
  echo "⚠️  Registration failed ($HTTP_STATUS)"
  echo "Response:"
  cat /tmp/registration_response.json 2>/dev/null
  echo ""
  echo "Continuing with heartbeat anyway..."
fi

# Send initial heartbeat
echo "📊 Sending initial heartbeat..."
/usr/local/bin/heartbeat.sh

# Set up cron for regular heartbeats (every 2 minutes)
echo "⏰ Setting up periodic heartbeat (every 2 minutes)..."
echo "*/2 * * * * /usr/local/bin/heartbeat.sh >> /var/log/heartbeat.log 2>&1" | crontab -

# Start cron service
service cron start

echo "✅ Test device started successfully"
echo "📊 Heartbeat every 2 minutes"
echo "📋 View logs: docker logs iotpilot-test-device"
echo "🌐 Server: $SERVER_URL"
echo "📱 Device: $DEVICE_ID"
echo ""
echo "📊 Current metrics being sent:"
echo "  - CPU Usage: Generated dynamically"
echo "  - Memory Usage: Calculated from system"
echo "  - Disk Usage: Real disk usage"
echo "  - CPU Temperature: Simulated for container"

# Keep container running and show periodic status
while true; do
  echo "$(date): Device $DEVICE_ID running - Next heartbeat in 2min"
  echo "  Last heartbeat status: $(tail -1 /var/log/heartbeat.log 2>/dev/null | grep -o 'Heartbeat.*' || echo 'No logs yet')"
  sleep 120
done