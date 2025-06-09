#!/bin/bash

# https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-quick-test-local.sh

set -e

echo "🚀 Starting IoT test device..."

# Install dependencies
echo "📦 Installing dependencies..."
apt-get update -qq && apt-get install -y -qq curl jq cron procps

# Generate unique device ID
DEVICE_ID="test-device-$(cat /proc/sys/kernel/random/uuid | cut -d'-' -f1)"
echo "📱 Device ID: $DEVICE_ID"

# Create heartbeat script
echo "📝 Creating heartbeat script..."
cat > /usr/local/bin/heartbeat.sh << 'EOF'
#!/bin/bash

# Collect system metrics
get_cpu_usage() {
    top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}' | head -1
}

get_memory_info() {
    free -m | awk 'NR==2{printf "%.1f,%.1f,%.1f", $3*100/$2, $3, $2}'
}

get_disk_info() {
    df -h / | awk 'NR==2{printf "%s,%s,%s", $5, $3, $2}'
}

# Get metrics
CPU_USAGE=$(get_cpu_usage)
MEM_INFO=$(get_memory_info)
MEM_PERCENT=$(echo $MEM_INFO | cut -d',' -f1)
MEM_USED=$(echo $MEM_INFO | cut -d',' -f2)
MEM_TOTAL=$(echo $MEM_INFO | cut -d',' -f3)

DISK_INFO=$(get_disk_info)
DISK_PERCENT=$(echo $DISK_INFO | cut -d',' -f1 | tr -d '%')
DISK_USED=$(echo $DISK_INFO | cut -d',' -f2)
DISK_TOTAL=$(echo $DISK_INFO | cut -d',' -f3)

# Create JSON payload
DEVICE_DATA=$(cat << JSON_EOF
{
  "device_id": "$DEVICE_ID",
  "hostname": "$DEVICE_NAME",
  "device_type": "DOCKER_CONTAINER",
  "architecture": "$(uname -m)",
  "location": "$DEVICE_LOCATION",
  "uptime": "$(uptime -p)",
  "cpu_usage": ${CPU_USAGE:-15.5},
  "memory_usage_percent": ${MEM_PERCENT:-35.2},
  "memory_used_mb": ${MEM_USED:-512},
  "memory_total_mb": ${MEM_TOTAL:-1024},
  "disk_usage_percent": ${DISK_PERCENT:-25.1},
  "disk_used": "${DISK_USED:-1.2G}",
  "disk_total": "${DISK_TOTAL:-5.0G}",
  "app_status": "running",
  "agent_version": "1.0.0-simple-test",
  "timestamp": "$(date -Iseconds)"
}
JSON_EOF
)

# Send heartbeat
echo "$(date): Sending heartbeat for $DEVICE_ID"
HTTP_STATUS=$(curl -w "%{http_code}" -o /tmp/heartbeat_response.json -s \
  -X POST "https://$IOTPILOT_SERVER/api/heartbeat" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d "$DEVICE_DATA" \
  --max-time 15 --connect-timeout 10)

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "$(date): ✅ Heartbeat successful ($HTTP_STATUS)"
else
  echo "$(date): ❌ Heartbeat failed ($HTTP_STATUS)"
  cat /tmp/heartbeat_response.json 2>/dev/null || echo "No response body"
fi
EOF

chmod +x /usr/local/bin/heartbeat.sh

# Register device
echo "📝 Registering device with IoTPilot server..."
REGISTRATION_DATA=$(cat << JSON_EOF
{
  "device_id": "$DEVICE_ID",
  "hostname": "$DEVICE_NAME",
  "device_type": "DOCKER_CONTAINER",
  "architecture": "$(uname -m)",
  "location": "$DEVICE_LOCATION",
  "auto_registered": true,
  "registration_time": "$(date -Iseconds)"
}
JSON_EOF
)

HTTP_STATUS=$(curl -w "%{http_code}" -o /tmp/registration_response.json -s \
  -X POST "https://$IOTPILOT_SERVER/api/devices/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $DEVICE_API_KEY" \
  -d "$REGISTRATION_DATA" \
  --max-time 15)

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Device registered successfully"
else
  echo "⚠️  Registration failed ($HTTP_STATUS), continuing anyway..."
  cat /tmp/registration_response.json 2>/dev/null
fi

# Send initial heartbeat
echo "📊 Sending initial heartbeat..."
/usr/local/bin/heartbeat.sh

# Set up cron for regular heartbeats (every 2 minutes)
echo "⏰ Setting up periodic heartbeat (every 2 minutes)..."
echo "*/2 * * * * /usr/local/bin/heartbeat.sh >> /var/log/heartbeat.log 2>&1" | crontab -
service cron start

echo "✅ Test device started successfully"
echo "📊 Heartbeat every 2 minutes"
echo "📋 View logs: docker logs iotpilot-test-device"
echo "🌐 Server: $IOTPILOT_SERVER"
echo "📱 Device: $DEVICE_ID"

# Keep container running and show periodic status
while true; do
  echo "$(date): Device $DEVICE_ID running - Next heartbeat in 2min"
  sleep 120
done