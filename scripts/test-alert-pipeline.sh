#!/usr/bin/env bash
#
# Integration test for the alert pipeline: POSTs real sensor readings to
# /api/webhook/temperature on the DEV backend and asserts the `alerts` table
# reacts correctly (battery + temperature: create / dedupe / escalate / resolve,
# honoring the device's configurable thresholds).
#
# Runs entirely against the local DEV stack (iotpilot-server-* containers). No
# secrets committed — the device's tenant API key is read from the dev DB.
#
# Usage:  bash scripts/test-alert-pipeline.sh [DEVICE_ID]
#         DEVICE_ID defaults to IOT-TEST-ESP01 (a claimed dev test device).
set -uo pipefail

DEVID="${1:-IOT-TEST-ESP01}"
PG="docker exec iotpilot-server-postgres psql -U iotpilot -d iotpilot -t -A"

UUID="$($PG -c "SELECT id FROM devices WHERE \"deviceId\"='$DEVID';" 2>/dev/null)"
CUST="$($PG -c "SELECT \"customerId\" FROM devices WHERE \"deviceId\"='$DEVID';" 2>/dev/null)"
KEY="$($PG -c "SELECT key FROM api_keys WHERE \"customerId\"='$CUST' AND \"deletedAt\" IS NULL LIMIT 1;" 2>/dev/null)"

if [ -z "$UUID" ] || [ -z "$KEY" ]; then
  echo "❌ Could not resolve device '$DEVID' or an API key for its tenant in the dev DB."
  echo "   Make sure the device is claimed (has customerId) and the dev stack is up."
  exit 1
fi

PASS=0; FAIL=0
post() {
  docker exec iotpilot-server-backend sh -c \
    "curl -s -X POST http://localhost:3100/api/webhook/temperature \
     -H 'x-api-key: $KEY' -H 'content-type: application/json' -d '$1'" >/dev/null
  sleep 0.4
}
q() { $PG -c "$1" 2>/dev/null; }
check() {
  if [ "$2" = "$3" ]; then echo "  ✅ $1 (= $2)"; PASS=$((PASS+1));
  else echo "  ❌ $1 — got '$2', expected '$3'"; FAIL=$((FAIL+1)); fi
}
openCount()    { q "SELECT count(*) FROM alerts WHERE \"deviceId\"='$UUID' AND type='$1' AND resolved=false;"; }
openSeverity() { q "SELECT severity FROM alerts WHERE \"deviceId\"='$UUID' AND type='$1' AND resolved=false ORDER BY \"createdAt\" DESC LIMIT 1;"; }
setThreshold() { # $1 = setting key, $2 = value  (per-device DEVICE_SETTINGS preference)
  local uid; uid="$($PG -c "SELECT \"userId\" FROM devices WHERE id='$UUID';")"
  q "INSERT INTO user_preferences (id, \"userId\", category, key, value, \"createdAt\", \"updatedAt\")
     VALUES ('test-thr-$1', '$uid', 'DEVICE_SETTINGS', 'device_${UUID}_$1', '$2', now(), now())
     ON CONFLICT (id) DO UPDATE SET value=EXCLUDED.value;" >/dev/null
}

echo "▶ Device $DEVID ($UUID), tenant key resolved. Clean slate."
q "DELETE FROM alerts WHERE \"deviceId\"='$UUID';" >/dev/null

echo; echo "S1 — Battery 15% → LOW_BATTERY WARNING (default threshold 20)"
post '{"deviceId":"'$DEVID'","batteryLevel":15,"readings":[{"temperature":-20}]}'
check "open LOW_BATTERY" "$(openCount LOW_BATTERY)" "1"
check "severity WARNING"  "$(openSeverity LOW_BATTERY)" "WARNING"

echo; echo "S2 — Battery 15% again → no duplicate"
post '{"deviceId":"'$DEVID'","batteryLevel":15,"readings":[{"temperature":-20}]}'
check "still 1 open" "$(openCount LOW_BATTERY)" "1"

echo; echo "S3 — Battery 8% → escalate to CRITICAL"
post '{"deviceId":"'$DEVID'","batteryLevel":8,"readings":[{"temperature":-20}]}'
check "1 open (escalated)" "$(openCount LOW_BATTERY)" "1"
check "severity CRITICAL"  "$(openSeverity LOW_BATTERY)" "CRITICAL"

echo; echo "S4 — Battery 55% → resolve"
post '{"deviceId":"'$DEVID'","batteryLevel":55,"readings":[{"temperature":-20}]}'
check "0 open LOW_BATTERY" "$(openCount LOW_BATTERY)" "0"

echo; echo "S5 — alertPending temp -12 → HIGH_TEMPERATURE WARNING"
post '{"deviceId":"'$DEVID'","batteryLevel":80,"alertPending":true,"alertTemp":-12,"readings":[{"temperature":-12}]}'
check "open HIGH_TEMPERATURE" "$(openCount HIGH_TEMPERATURE)" "1"
check "severity WARNING"      "$(openSeverity HIGH_TEMPERATURE)" "WARNING"

echo; echo "S6 — temp -20 (normal) → resolve HIGH_TEMPERATURE"
post '{"deviceId":"'$DEVID'","batteryLevel":80,"readings":[{"temperature":-20}]}'
check "0 open HIGH_TEMPERATURE" "$(openCount HIGH_TEMPERATURE)" "0"

echo; echo "S7 — alertPending temp -8 → HIGH_TEMPERATURE CRITICAL"
post '{"deviceId":"'$DEVID'","batteryLevel":80,"alertPending":true,"alertTemp":-8,"readings":[{"temperature":-8}]}'
check "open HIGH_TEMPERATURE" "$(openCount HIGH_TEMPERATURE)" "1"
check "severity CRITICAL"     "$(openSeverity HIGH_TEMPERATURE)" "CRITICAL"

echo; echo "S8 — CONFIGURABLE battery threshold = 40 → alert fires at 35% (above default 20)"
q "DELETE FROM alerts WHERE \"deviceId\"='$UUID';" >/dev/null
setThreshold batteryThreshold 40
post '{"deviceId":"'$DEVID'","batteryLevel":35,"readings":[{"temperature":-20}]}'
check "open LOW_BATTERY at 35% (cfg 40)" "$(openCount LOW_BATTERY)" "1"

echo; echo "S9 — Battery 45% (above configured 40) → no alert / resolved"
post '{"deviceId":"'$DEVID'","batteryLevel":45,"readings":[{"temperature":-20}]}'
check "0 open LOW_BATTERY" "$(openCount LOW_BATTERY)" "0"

echo; echo "S10 — CONFIGURED sensorTempThreshold=8 → server-side eval: reading 12°C (no device flag) → HIGH_TEMPERATURE WARNING"
q "DELETE FROM alerts WHERE \"deviceId\"='$UUID';" >/dev/null
q "DELETE FROM user_preferences WHERE id='test-thr-batteryThreshold';" >/dev/null
setThreshold sensorTempThreshold 8
post '{"deviceId":"'$DEVID'","batteryLevel":80,"readings":[{"temperature":12}]}'
check "open HIGH_TEMPERATURE (server eval)" "$(openCount HIGH_TEMPERATURE)" "1"
check "severity WARNING"                    "$(openSeverity HIGH_TEMPERATURE)" "WARNING"

echo; echo "S11 — reading 20°C (> crit 13) no flag → escalate to CRITICAL"
post '{"deviceId":"'$DEVID'","batteryLevel":80,"readings":[{"temperature":20}]}'
check "1 open (escalated)" "$(openCount HIGH_TEMPERATURE)" "1"
check "severity CRITICAL"  "$(openSeverity HIGH_TEMPERATURE)" "CRITICAL"

echo; echo "S12 — reading 5°C (<= 8) no flag → resolve"
post '{"deviceId":"'$DEVID'","batteryLevel":80,"readings":[{"temperature":5}]}'
check "0 open HIGH_TEMPERATURE" "$(openCount HIGH_TEMPERATURE)" "0"

echo; echo "S13 — REGRESSION GUARD: no sensorTempThreshold configured + warm 27°C, no flag → NO alert"
q "DELETE FROM alerts WHERE \"deviceId\"='$UUID';" >/dev/null
q "DELETE FROM user_preferences WHERE id='test-thr-sensorTempThreshold';" >/dev/null
post '{"deviceId":"'$DEVID'","batteryLevel":80,"readings":[{"temperature":27}]}'
check "0 open HIGH_TEMPERATURE (no misfire)" "$(openCount HIGH_TEMPERATURE)" "0"

echo; echo "▶ Cleanup"
q "DELETE FROM alerts WHERE \"deviceId\"='$UUID';" >/dev/null
q "DELETE FROM user_preferences WHERE id IN ('test-thr-batteryThreshold','test-thr-sensorTempThreshold');" >/dev/null

echo "════════════════════════════════════"
echo "  PASS: $PASS   FAIL: $FAIL"
echo "════════════════════════════════════"
[ "$FAIL" -eq 0 ]
