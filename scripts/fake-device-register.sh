#!/usr/bin/env bash
# Register the local fake-device container as an IoT device in the platform.
# Usage: bash scripts/fake-device-register.sh <email> <password> [backend_url]
set -euo pipefail

EMAIL="${1:-}"
PASSWORD="${2:-}"
BACKEND="${3:-http://localhost:3102}"

# Resolve container IP dynamically — works regardless of Docker subnet
FAKE_IP=$(docker inspect iotpilot-fake-device \
  --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | head -1)
FAKE_ID="fake-pi-local-001"
FAKE_HOST="fake-pi-local"
SSH_USER="pi"
SSH_PASS="raspberry"
SSH_PORT=22

GREEN='\033[0;32m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${GREEN}[fake-device]${NC} $1"; }
error() { echo -e "${RED}[fake-device]${NC} $1"; exit 1; }
header(){ echo -e "\n${BLUE}▶ $1${NC}"; }

[ -n "$EMAIL" ] && [ -n "$PASSWORD" ] || \
  error "Usage: make fake-device-register EMAIL=user@example.com PASSWORD=secret"

[ -n "$FAKE_IP" ] || \
  error "Container iotpilot-fake-device is not running — run: make fake-device-up"

info "Container IP: $FAKE_IP"

# 1. Login
header "Login"
TOKEN=$(curl -sf -X POST "$BACKEND/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
[ -n "$TOKEN" ] || error "Login failed — check EMAIL/PASSWORD"
info "Logged in ✓"

# 2. Check if already registered
header "Check for existing device"
EXISTING=$(curl -sf "$BACKEND/api/devices?search=$FAKE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',d) if isinstance(d,dict) else d
matches=[x for x in (items if isinstance(items,list) else []) if x.get('deviceId')=='$FAKE_ID']
print(matches[0].get('id','') if matches else '')
" 2>/dev/null)

if [ -n "$EXISTING" ]; then
  info "Device already registered (id=$EXISTING) — updating SSH credentials"
  DEVICE_ID="$EXISTING"
else
  # 3. Register
  header "Register device"
  RESULT=$(curl -sf -X POST "$BACKEND/api/devices/register" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"deviceId\": \"$FAKE_ID\",
      \"hostname\": \"$FAKE_HOST\",
      \"deviceType\": \"GENERIC\",
      \"architecture\": \"x86_64\",
      \"ipAddress\": \"$FAKE_IP\",
      \"location\": \"local-dev\"
    }")
  DEVICE_ID=$(echo "$RESULT" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('deviceId',''))" 2>/dev/null)
  [ -n "$DEVICE_ID" ] || error "Registration failed: $RESULT"
  info "Registered ✓  id=$DEVICE_ID"
fi

# 4. Set SSH credentials
header "Set SSH credentials"
curl -sf -X PUT "$BACKEND/api/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sshUsername\":\"$SSH_USER\",\"sshPassword\":\"$SSH_PASS\",\"sshPort\":$SSH_PORT}" \
  > /dev/null
info "SSH credentials set ✓"

echo ""
echo -e "${GREEN}✅ Fake device ready${NC}"
echo "   Device ID : $DEVICE_ID"
echo "   IP (Docker): $FAKE_IP  (backend SSHes here on port 22)"
echo "   SSH (host) : ssh -p 2222 pi@localhost  (pass: raspberry)"
