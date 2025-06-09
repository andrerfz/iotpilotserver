# https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-quick-test-local.sh

#!/bin/bash
set -e

echo "🚀 IoT Test Device Startup"
echo "=========================="

# Install required packages
echo "📦 Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null 2>&1
apt-get install -y curl jq sudo systemd cron >/dev/null 2>&1
echo "✅ System packages installed"

# Display configuration
echo ""
echo "📋 Configuration:"
echo "  IOTPILOT_SERVER: ${IOTPILOT_SERVER}"
echo "  DEVICE_API_KEY: ${DEVICE_API_KEY:0:8}..."
echo "  DEVICE_LOCATION: ${DEVICE_LOCATION}"
echo "  INFLUXDB_TOKEN: ${INFLUXDB_TOKEN:0:8}..."
echo ""

# Test server connectivity
echo "🔍 Testing server connectivity..."

FOUND_SERVER=""

# Test order: internal containers first, then external
SERVER_ENDPOINTS=(
    "http://iotpilot-server-app:3000"
)

for endpoint in "${SERVER_ENDPOINTS[@]}"; do
    echo -n "  Testing ${endpoint}... "

    if [[ "$endpoint" == *"https"* ]]; then
        # HTTPS endpoint - use insecure flag for self-signed certs
        if curl -k --insecure -f --connect-timeout 5 --max-time 10 "${endpoint}/api/health" >/dev/null 2>&1; then
            echo "✅ OK"
            FOUND_SERVER="$endpoint"
            break
        else
            echo "❌ FAIL"
        fi
    else
        # HTTP endpoint
        if curl -f --connect-timeout 5 --max-time 10 "${endpoint}/api/health" >/dev/null 2>&1; then
            echo "✅ OK"
            FOUND_SERVER="$endpoint"
            break
        else
            echo "❌ FAIL"
        fi
    fi
done

if [ -z "$FOUND_SERVER" ]; then
    echo ""
    echo "❌ No IoT Pilot server accessible"
    echo "💡 Waiting 30 seconds for services to start..."
    sleep 30

    # Retry once
    for endpoint in "${SERVER_ENDPOINTS[@]}"; do
        echo -n "  Retry ${endpoint}... "

        if [[ "$endpoint" == *"https"* ]]; then
            if curl -k --insecure -f --connect-timeout 10 "${endpoint}/api/health" >/dev/null 2>&1; then
                echo "✅ OK"
                FOUND_SERVER="$endpoint"
                break
            else
                echo "❌ FAIL"
            fi
        else
            if curl -f --connect-timeout 10 "${endpoint}/api/health" >/dev/null 2>&1; then
                echo "✅ OK"
                FOUND_SERVER="$endpoint"
                break
            else
                echo "❌ FAIL"
            fi
        fi
    done
fi

if [ -z "$FOUND_SERVER" ]; then
    echo ""
    echo "❌ No server accessible after retry. Available for debugging:"
    echo "   docker exec -it iotpilot-test-device bash"
    tail -f /dev/null  # Keep container alive
    exit 1
fi

echo ""
echo "🎯 Using server: $FOUND_SERVER"

# Download and execute the official installation script
echo "⬇️  Downloading IoT agent installation script..."
echo "   URL: https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-install-local.sh"

# Export environment variables for the script
export IOTPILOT_SERVER="$FOUND_SERVER"

# Execute the installation script with proper environment
if curl -sSL https://raw.githubusercontent.com/andrerfz/iotpilotserver/main/scripts/device-agent-install-local.sh | bash; then
    echo ""
    echo "✅ IoT Agent installation completed successfully!"
    echo ""
    echo "📱 Device should now appear in dashboard: $FOUND_SERVER"
    echo "🔄 Agent will send heartbeats every 5 minutes"
    echo "📊 Monitoring server: $FOUND_SERVER"
    echo ""
    echo "📋 Useful commands:"
    echo "   View agent logs: tail -f /var/log/iotpilot-agent.log"
    echo "   Test agent: iotpilot-agent test"
    echo "   Agent status: iotpilot-agent status"
    echo ""
    echo "🔄 Starting continuous monitoring..."

    # Keep container alive and show agent activity
    if [ -f /var/log/iotpilot-agent.log ]; then
        tail -f /var/log/iotpilot-agent.log
    else
        echo "📝 Agent log not found, keeping container alive for inspection..."
        tail -f /dev/null
    fi
else
    echo ""
    echo "❌ IoT Agent installation failed"
    echo "💡 Server was accessible but installation failed"
    echo ""
    echo "🔍 Debug information:"
    echo "   Server URL: $FOUND_SERVER"
    echo "   API Key: ${DEVICE_API_KEY:0:8}..."
    echo "   Location: $DEVICE_LOCATION"
    echo ""
    echo "🛠️  Container available for debugging:"
    echo "   docker exec -it iotpilot-test-device bash"
    echo ""

    # Keep container alive for debugging
    tail -f /dev/null
fi