#!/usr/bin/env bash
#
# Manufacturing flash tool for ESP8266 temperature sensors.
#
# Usage:
#   ./scripts/flash-device.sh                          # Auto-pick next UNCLAIMED device
#   ./scripts/flash-device.sh IOT-PSMS-ZYV3            # Flash specific device ID
#   ./scripts/flash-device.sh IOT-PSMS-ZYV3 /dev/cu.usbserial-1420   # Explicit port
#
# Prerequisites:
#   make device-toolchain-install
#

set -euo pipefail

FIRMWARE="firmware/esp8266-claiming-firmware"
BOARD="esp8266:esp8266:d1_mini_clone"
BAUD="921600"
FLASH_LOG="scripts/.flash-log.csv"
SERVER_URL="${SERVER_URL:-http://192.168.0.168:3001}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*" >&2; }
ok()    { echo -e "${GREEN}[OK]${NC} $*" >&2; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Check prerequisites ──────────────────────────────────────────────

check_prerequisites() {
    if ! command -v arduino-cli &>/dev/null; then
        error "arduino-cli not found. Run: make device-toolchain-install"
    fi

    if ! arduino-cli core list 2>/dev/null | grep -q "esp8266:esp8266"; then
        error "ESP8266 core not installed. Run: make device-toolchain-install"
    fi

    if [ ! -d "$FIRMWARE" ]; then
        error "Firmware not found at $FIRMWARE/. Run from project root."
    fi
}

# ── Flash log ────────────────────────────────────────────────────────

init_flash_log() {
    if [ ! -f "$FLASH_LOG" ]; then
        echo "deviceId,port,status,timestamp" > "$FLASH_LOG"
    fi
}

log_flash() {
    local device_id="$1" port="$2" status="$3"
    echo "${device_id},${port},${status},$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$FLASH_LOG"
}

# ── Detect USB serial port ───────────────────────────────────────────

detect_port() {
    local ports
    ports=$(ls /dev/cu.usbserial* /dev/cu.wchusbserial* /dev/cu.SLAB_USBtoUART* 2>/dev/null || true)

    if [ -z "$ports" ]; then
        error "No USB serial device detected. Plug in the ESP8266 and try again."
    fi

    local count
    count=$(echo "$ports" | wc -l | tr -d ' ')

    if [ "$count" -eq 1 ]; then
        echo "$ports"
    else
        warn "Multiple serial ports found:"
        echo "$ports" | nl -ba
        echo ""
        echo "Pass the port explicitly: make device-flash PORT=/dev/cu.usbserial-XXXX"
        echo ""
        # Pick the first one
        echo "$ports" | head -1
    fi
}

# ── Pick next UNCLAIMED device ───────────────────────────────────────

pick_next_device() {
    info "Picking next UNCLAIMED device from database..." >&2

    # Check if there's a failed flash to retry first
    if [ -f "$FLASH_LOG" ]; then
        local failed
        failed=$(grep ",FAILED," "$FLASH_LOG" | tail -1 | cut -d',' -f1 || true)
        if [ -n "$failed" ]; then
            # Check it's still UNCLAIMED (not retried successfully)
            local success_count
            success_count=$(grep "^${failed},.*,OK," "$FLASH_LOG" 2>/dev/null | wc -l | tr -d ' ')
            if [ "$success_count" -eq 0 ]; then
                warn "Retrying previously failed flash: ${failed}" >&2
                echo "$failed"
                return
            fi
        fi
    fi

    # Get already-flashed IDs (successful ones) to skip them
    local flashed_ids=""
    if [ -f "$FLASH_LOG" ]; then
        flashed_ids=$(grep ",OK," "$FLASH_LOG" | cut -d',' -f1 | sort -u || true)
    fi

    # Get oldest UNCLAIMED device not yet flashed
    local devices
    devices=$(docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -t -A -c \
        "SELECT \"deviceId\" FROM devices WHERE status='UNCLAIMED' ORDER BY \"registeredAt\" ASC;" 2>/dev/null)

    if [ -z "$devices" ]; then
        error "No UNCLAIMED devices found. Run: make device-preregister COUNT=10"
    fi

    # Find first device not already successfully flashed
    while IFS= read -r device_id; do
        if [ -z "$flashed_ids" ] || ! echo "$flashed_ids" | grep -q "^${device_id}$" 2>/dev/null; then
            echo "$device_id"
            return
        fi
    done <<< "$devices"

    error "All UNCLAIMED devices have been flashed. Run: make device-preregister COUNT=10"
}

# ── Compile + Flash ──────────────────────────────────────────────────

compile_and_flash() {
    local device_id="$1"
    local port="$2"

    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  Flashing: ${CYAN}${device_id}${NC}"
    echo -e "${BOLD}  Port:     ${CYAN}${port}${NC}"
    echo -e "${BOLD}  Board:    ${CYAN}${BOARD}${NC}"
    echo -e "${BOLD}  Server:   ${CYAN}${SERVER_URL}${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
    echo ""

    local activation_url="${SERVER_URL}/api/devices/activate"

    # ── Compile ──
    info "Compiling firmware with DEVICE_ID=${device_id}..."
    if ! arduino-cli compile \
        --fqbn "$BOARD" \
        --build-property "compiler.cpp.extra_flags=-DDEVICE_ID=\"${device_id}\" -DACTIVATION_URL=\"${activation_url}\"" \
        "$FIRMWARE"; then
        log_flash "$device_id" "$port" "COMPILE_FAILED"
        error "Compilation failed for ${device_id}"
    fi
    ok "Compilation successful"

    # ── Upload ──
    info "Uploading to ${port} at ${BAUD} baud..."
    if ! arduino-cli upload \
        --fqbn "$BOARD" \
        --port "$port" \
        --upload-field "upload.speed=${BAUD}" \
        "$FIRMWARE"; then
        log_flash "$device_id" "$port" "FAILED"
        echo ""
        warn "Upload FAILED for ${device_id}!"
        warn "The device may be partially flashed. To retry:"
        echo -e "   ${CYAN}make device-flash${NC}              (auto-retries this ID)"
        echo -e "   ${CYAN}make device-flash ID=${device_id}${NC}  (explicit)"
        echo ""
        exit 1
    fi

    # ── Success ──
    log_flash "$device_id" "$port" "OK"

    ok "Upload complete!"
    echo ""
    echo -e "${GREEN}${BOLD}Done!${NC} Stick the ${CYAN}${device_id}${NC} label on this device."
    echo ""
    echo -e "  Next device: plug in a new ESP8266 and run ${CYAN}make device-flash${NC}"
    echo ""
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
    check_prerequisites
    init_flash_log

    local device_id="${1:-}"
    local port="${2:-}"

    # Device ID — auto-pick if not provided
    if [ -z "$device_id" ]; then
        device_id=$(pick_next_device)
    fi

    if [ -z "$device_id" ]; then
        error "No device ID available"
    fi

    # Validate format
    if ! [[ "$device_id" =~ ^IOT-[A-Z0-9]{4}-[A-Z0-9]{4}$ ]]; then
        error "Invalid device ID format: $device_id (expected IOT-XXXX-YYYY)"
    fi

    # Port
    if [ -z "$port" ]; then
        port=$(detect_port)
    fi

    if [ -z "$port" ]; then
        error "No serial port detected"
    fi

    compile_and_flash "$device_id" "$port"
}

main "$@"
