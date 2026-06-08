#!/usr/bin/env bash
#
# Manufacturing flash tool for LILYGO TTGO Heltec WiFi LoRa 32 V3 (ESP32-C3) temperature sensors.
#
# Usage:
#   ./scripts/flash-device-esp32c3.sh                          # Auto-pick next UNCLAIMED device
#   ./scripts/flash-device-esp32c3.sh IOT-PSMS-ZYV3            # Flash specific device ID
#   ./scripts/flash-device-esp32c3.sh IOT-PSMS-ZYV3 /dev/cu.usbserial-1420   # Explicit port
#
# Prerequisites:
#   make device-toolchain-install-esp32c3
#

set -euo pipefail

FIRMWARE="firmware/heltec-lora32v3-firmware"
BOARD="esp32:esp32:heltec_wifi_lora_32_V3"
BAUD="921600"
FLASH_LOG="scripts/.flash-log-heltec32v3.csv"
SERVER_URL="${SERVER_URL:-https://dashboarddev.iotpilot.app}"
TEST_WIFI_SSID="${WIFI_SSID_OVERRIDE:-}"
TEST_WIFI_PASS="${WIFI_PASS_OVERRIDE:-}"
TEST_TOKEN="${TOKEN_OVERRIDE:-}"

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
        error "arduino-cli not found. Run: make device-toolchain-install-esp32c3"
    fi

    if ! arduino-cli core list 2>/dev/null | grep -q "esp32:esp32"; then
        error "ESP32 core not installed. Run: make device-toolchain-install-esp32c3"
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
#
# Heltec WiFi LoRa 32 V3 uses CH340K (usbserial) or WCH (wchusbserial).
# Also handles CP210x (SLAB) and native USB-serial (usbmodem) variants.

detect_port() {
    local ports
    ports=$(ls \
        /dev/cu.usbserial* \
        /dev/cu.wchusbserial* \
        /dev/cu.SLAB_USBtoUART* \
        /dev/cu.usbmodem* \
        2>/dev/null || true)

    if [ -z "$ports" ]; then
        error "No USB serial device detected. Plug in the Heltec WiFi LoRa 32 V3 and try again."
    fi

    local count
    count=$(echo "$ports" | wc -l | tr -d ' ')

    if [ "$count" -eq 1 ]; then
        echo "$ports"
    else
        warn "Multiple serial ports found:"
        echo "$ports" | nl -ba
        echo ""
        echo "Pass the port explicitly: make device-flash-esp32c3 PORT=/dev/cu.usbserial-XXXX"
        echo ""
        echo "$ports" | head -1
    fi
}

# ── Pick next UNCLAIMED device ───────────────────────────────────────

pick_next_device() {
    info "Picking next UNCLAIMED device from database..." >&2

    if [ -f "$FLASH_LOG" ]; then
        local failed
        failed=$(grep ",FAILED," "$FLASH_LOG" | tail -1 | cut -d',' -f1 || true)
        if [ -n "$failed" ]; then
            local success_count
            success_count=$(grep "^${failed},.*,OK," "$FLASH_LOG" 2>/dev/null | wc -l | tr -d ' ')
            if [ "$success_count" -eq 0 ]; then
                warn "Retrying previously failed flash: ${failed}" >&2
                echo "$failed"
                return
            fi
        fi
    fi

    local flashed_ids=""
    if [ -f "$FLASH_LOG" ]; then
        flashed_ids=$(grep ",OK," "$FLASH_LOG" | cut -d',' -f1 | sort -u || true)
    fi

    local devices
    devices=$(docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -t -A -c \
        "SELECT \"deviceId\" FROM devices WHERE status='UNCLAIMED' ORDER BY \"registeredAt\" ASC;" 2>/dev/null)

    if [ -z "$devices" ]; then
        error "No UNCLAIMED devices found. Run: make device-preregister COUNT=10"
    fi

    while IFS= read -r device_id; do
        if [ -z "$flashed_ids" ] || ! echo "$flashed_ids" | grep -q "^${device_id}$" 2>/dev/null; then
            echo "$device_id"
            return
        fi
    done <<< "$devices"

    error "All UNCLAIMED devices have been flashed. Run: make device-preregister COUNT=10"
}

# ── Enter bootloader mode ────────────────────────────────────────────
#
# The Heltec WiFi LoRa 32 V3 auto-resets into bootloader via DTR/RTS toggling, which
# arduino-cli handles automatically. This function is a no-op but kept
# here as a reminder in case a board needs manual BOOT+RST press.

ensure_bootloader_mode() {
    local port="$1"
    info "arduino-cli will auto-reset the board into bootloader mode via DTR/RTS."
    info "If upload fails, hold BOOT button, press RST, then release BOOT."
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
    # Build optional test-mode flags
    local test_flags=""
    if [ -n "$TEST_WIFI_SSID" ]; then
        test_flags=" -DTEST_WIFI_SSID=\"${TEST_WIFI_SSID}\" -DTEST_WIFI_PASS=\"${TEST_WIFI_PASS}\""
        info "TEST MODE: WiFi=${TEST_WIFI_SSID}"
    fi
    if [ -n "$TEST_TOKEN" ]; then
        test_flags="${test_flags} -DTEST_TOKEN=\"${TEST_TOKEN}\""
        info "TEST MODE: Token=${TEST_TOKEN}"
    fi

    info "Compiling firmware with DEVICE_ID=${device_id}..."
    if ! arduino-cli compile \
        --fqbn "$BOARD" \
        --build-property "compiler.cpp.extra_flags=-DDEVICE_ID=\"${device_id}\" -DACTIVATION_URL=\"${activation_url}\"${test_flags}" \
        "$FIRMWARE"; then
        log_flash "$device_id" "$port" "COMPILE_FAILED"
        error "Compilation failed for ${device_id}"
    fi
    ok "Compilation successful"

    ensure_bootloader_mode "$port"

    # ── Erase flash (optional — clears NVS/config) ──
    if [ -n "${ERASE_OVERRIDE:-}" ]; then
        local esptool
        esptool=$(find ~/Library/Arduino15/packages/esp32/tools/esptool_py -name "esptool" -type f 2>/dev/null | head -1)
        if [ -z "$esptool" ]; then
            warn "esptool not found — skipping erase"
        else
            info "Erasing flash (NVS will be cleared)..."
            "$esptool" --port "$port" --baud 115200 erase_flash
            sleep 1
            info "Flash erased — reflashing..."
        fi
    fi

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
        warn "Troubleshooting:"
        echo -e "   • Hold ${CYAN}BOOT${NC} button, press ${CYAN}RST${NC}, release ${CYAN}BOOT${NC}, then retry"
        echo -e "   • Try a lower baud: ${CYAN}make device-flash-esp32c3 BAUD=460800${NC}"
        echo -e "   • Retry: ${CYAN}make device-flash-esp32c3${NC} (auto-retries this ID)"
        echo -e "   • Explicit: ${CYAN}make device-flash-esp32c3 ID=${device_id}${NC}"
        echo ""
        exit 1
    fi

    # ── Success ──
    log_flash "$device_id" "$port" "OK"

    ok "Upload complete!"
    echo ""
    echo -e "${GREEN}${BOLD}Done!${NC} Stick the ${CYAN}${device_id}${NC} label on this device."
    echo ""
    echo -e "  Next device: plug in a new Heltec WiFi LoRa 32 V3 and run ${CYAN}make device-flash-esp32c3${NC}"
    echo ""
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
    # Allow baud override at runtime (e.g. BAUD=460800 for stubborn boards)
    if [ -n "${BAUD_OVERRIDE:-}" ]; then
        BAUD="$BAUD_OVERRIDE"
        info "Using baud rate override: ${BAUD}"
    fi

    check_prerequisites
    init_flash_log

    local device_id="${1:-}"
    local port="${2:-}"

    if [ -z "$device_id" ]; then
        device_id=$(pick_next_device)
    fi

    if [ -z "$device_id" ]; then
        error "No device ID available"
    fi

    if ! [[ "$device_id" =~ ^IOT-[A-Z0-9]{4}-[A-Z0-9]{4}$ ]]; then
        error "Invalid device ID format: $device_id (expected IOT-XXXX-YYYY)"
    fi

    if [ -z "$port" ]; then
        port="${PORT_OVERRIDE:-$(detect_port)}"
    fi

    if [ -z "$port" ]; then
        error "No serial port detected"
    fi

    compile_and_flash "$device_id" "$port"
}

main "$@"
