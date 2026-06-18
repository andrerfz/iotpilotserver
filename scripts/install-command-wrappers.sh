#!/bin/sh
# IotPilot — install OS-agnostic command wrappers
#
# The platform sends generic commands (update, reboot, shutdown, restart) via SSH.
# This script creates wrappers in /usr/local/bin/ that map each command to the
# right tool for the current distro. Run as root during device provisioning.
#
# Supported: Debian/Ubuntu/Raspbian, Alpine, Fedora/RHEL/CentOS, Arch, openSUSE

set -e

WRAPPER_DIR="${WRAPPER_DIR:-/usr/local/bin}"

# Determine sudo prefix: if already root, no sudo needed
if [ "$(id -u)" = "0" ]; then
    SUDO=""
else
    SUDO="sudo"
fi

detect_pkg_manager() {
    if   command -v apt-get > /dev/null 2>&1; then echo "apt"
    elif command -v apk     > /dev/null 2>&1; then echo "apk"
    elif command -v dnf     > /dev/null 2>&1; then echo "dnf"
    elif command -v yum     > /dev/null 2>&1; then echo "yum"
    elif command -v pacman  > /dev/null 2>&1; then echo "pacman"
    elif command -v zypper  > /dev/null 2>&1; then echo "zypper"
    else echo "unknown"
    fi
}

write_wrapper() {
    local name="$1"
    local body="$2"
    local path="$WRAPPER_DIR/$name"
    printf '#!/bin/sh\n%s\n' "$body" > "$path"
    chmod +x "$path"
    echo "[iotpilot-wrappers] installed: $path"
}

PKG=$(detect_pkg_manager)
echo "[iotpilot-wrappers] detected package manager: $PKG"

# ── update ────────────────────────────────────────────────────────────────────
case "$PKG" in
    apt)     UPDATE_CMD='sudo sh -c "DEBIAN_FRONTEND=noninteractive apt-get update -qq && apt-get upgrade -y"' ;;
    apk)     UPDATE_CMD='sudo apk update && sudo apk upgrade --available' ;;
    dnf)     UPDATE_CMD='sudo dnf upgrade -y' ;;
    yum)     UPDATE_CMD='sudo yum update -y' ;;
    pacman)  UPDATE_CMD='sudo pacman -Syu --noconfirm' ;;
    zypper)  UPDATE_CMD='sudo zypper -n update' ;;
    *)       UPDATE_CMD='echo "[iotpilot] update: unknown package manager" && exit 1' ;;
esac
write_wrapper "update" "$UPDATE_CMD"

# ── reboot ───────────────────────────────────────────────────────────────────
write_wrapper "reboot" \
'if command -v systemctl > /dev/null 2>&1; then
    sudo systemctl reboot
elif sudo reboot 2>/dev/null; then
    :
else
    echo "[iotpilot] reboot: not permitted in this environment" && exit 1
fi'

# ── shutdown ──────────────────────────────────────────────────────────────────
write_wrapper "shutdown" \
'if command -v systemctl > /dev/null 2>&1; then
    sudo systemctl poweroff
elif sudo shutdown -h now 2>/dev/null; then
    :
else
    echo "[iotpilot] shutdown: not permitted in this environment" && exit 1
fi'

# ── restart (restart the iotpilot agent service) ──────────────────────────────
write_wrapper "restart" \
'if command -v systemctl > /dev/null 2>&1; then
    sudo systemctl restart iotpilot-agent || true
fi
echo "[iotpilot] agent restarted"'

echo "[iotpilot-wrappers] done — package manager: $PKG"
