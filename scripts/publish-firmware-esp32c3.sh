#!/usr/bin/env bash
#
# Publishes a compiled ESP32-C3 OTA firmware artifact into the backend's
# firmware-releases store (a bind-mounted directory, no CDN/object storage —
# see docs/firmware-ota/ for the fuller design this intentionally scopes down).
#
# Usage:
#   ./scripts/publish-firmware-esp32c3.sh 1.3.0                # publish locally
#   PROD=1 ./scripts/publish-firmware-esp32c3.sh 1.3.0          # also scp to production host
#
# After publishing, trigger the rollout for a specific device with:
#   curl -X POST <server>/api/devices/<id>/request-ota -d '{"targetVersion":"1.3.0"}'
#
# Prerequisites:
#   make device-toolchain-install-esp32c3
#

set -euo pipefail

FIRMWARE="firmware/esp32c3-claiming-firmware"
# Same partition scheme as scripts/flash-device-esp32c3.sh — must match what's
# already flashed on-device (dual OTA app slots; see docs in that script).
BOARD="esp32:esp32:esp32c3:PartitionScheme=min_spiffs"
DEVICE_TYPE="ESP32C3_SENSOR"
SERVER_URL="${SERVER_URL:-https://dashboard.iotpilot.app}"
RELEASES_DIR="apps/backend/firmware-releases"
BUILD_DIR="/tmp/iotpilot-ota-build-esp32c3"

# Production server connection — same variables as the Makefile's PROD_* defaults.
PROD_HOST="${PROD_HOST:-52.23.9.165}"
PROD_USER="${PROD_USER:-ubuntu}"
PROD_KEY="${PROD_KEY:-~/.ssh/iotpilot-server.pem}"
PROD_REMOTE_DIR="~/iotpilotserver/${RELEASES_DIR}"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*" >&2; }
ok()    { echo -e "${GREEN}[OK]${NC} $*" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
    error "Usage: $0 <version>  (e.g. 1.3.0)"
fi
if ! [[ "$VERSION" =~ ^[A-Za-z0-9._-]+$ ]]; then
    error "Invalid version: $VERSION (allowed: letters, digits, dot, dash, underscore)"
fi

if ! command -v arduino-cli &>/dev/null; then
    error "arduino-cli not found. Run: make device-toolchain-install-esp32c3"
fi
if [ ! -d "$FIRMWARE" ]; then
    error "Firmware not found at $FIRMWARE/. Run from project root."
fi

# DEVICE_ID is intentionally left at the firmware's built-in placeholder default —
# an OTA-updated device already has its real deviceId in NVS (loadConfig() only
# falls back to the compiled DEVICE_ID when NVS is empty), so it's irrelevant here.
# ACTIVATION_URL IS baked in for real, though: if this device is ever factory-reset
# after the update, it needs a working claim endpoint.
ACTIVATION_URL="${SERVER_URL}/api/devices/activate"

info "Compiling ${FIRMWARE} for OTA release ${VERSION}..."
rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR"
arduino-cli compile \
    --fqbn "$BOARD" \
    --build-property "compiler.cpp.extra_flags=-DACTIVATION_URL=\"${ACTIVATION_URL}\"" \
    --output-dir "$BUILD_DIR" \
    "$FIRMWARE"

BIN_PATH="${BUILD_DIR}/esp32c3-claiming-firmware.ino.bin"
[ -f "$BIN_PATH" ] || error "Build did not produce $BIN_PATH"
ok "Compiled: $BIN_PATH"

DEST_DIR="${RELEASES_DIR}/${DEVICE_TYPE}/${VERSION}"
mkdir -p "$DEST_DIR"
cp "$BIN_PATH" "${DEST_DIR}/firmware.bin"
ok "Published locally: ${DEST_DIR}/firmware.bin"

if [ -n "${PROD:-}" ]; then
    info "Publishing to production ${PROD_HOST}..."
    ssh -i "$PROD_KEY" "${PROD_USER}@${PROD_HOST}" "mkdir -p ${PROD_REMOTE_DIR}/${DEVICE_TYPE}/${VERSION}"
    scp -i "$PROD_KEY" "${DEST_DIR}/firmware.bin" "${PROD_USER}@${PROD_HOST}:${PROD_REMOTE_DIR}/${DEVICE_TYPE}/${VERSION}/firmware.bin"
    ok "Published to production: ${DEVICE_TYPE}/${VERSION}"
fi

echo ""
echo -e "${BOLD}Trigger the rollout for a device with:${NC}"
echo "  curl -X POST <server>/api/devices/<id>/request-ota -H 'Content-Type: application/json' -d '{\"targetVersion\":\"${VERSION}\"}'"
