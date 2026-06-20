-- Migration: Add firmware version tracking to Device
-- Supports the iotpilotserver fw-integration layer:
--   firmwareVersion   — current firmware running on the device (reported via heartbeat)
--   targetFirmwareVersion — desired version set by admin to trigger OTA update

ALTER TABLE "Device"
  ADD COLUMN IF NOT EXISTS "firmwareVersion"       TEXT,
  ADD COLUMN IF NOT EXISTS "targetFirmwareVersion" TEXT;
