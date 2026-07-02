-- Migration 021: denormalized latest sensor reading on the device row
--
-- Sensor devices (ESP/LoRa temperature sensors) report temperature/battery/RSSI
-- via /api/webhook/temperature. Those readings only lived in device_metrics, so
-- the device list could not show a sensor's own metrics. Mirror the pattern
-- already used for system metrics (cpuUsage etc. denormalized from heartbeat):
-- store the latest reading on the device row so the list can render it directly.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE devices ADD COLUMN IF NOT EXISTS temperature    DOUBLE PRECISION;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS "batteryLevel"   DOUBLE PRECISION;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS "signalStrength" DOUBLE PRECISION;
