-- Migration: Add device claiming support
-- Description: Adds UNCLAIMED and PENDING_SETUP statuses, ensures metadata JSON column exists

-- Add new device statuses if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'DeviceStatus' AND e.enumlabel = 'UNCLAIMED'
    ) THEN
        ALTER TYPE "DeviceStatus" ADD VALUE 'UNCLAIMED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'DeviceStatus' AND e.enumlabel = 'PENDING_SETUP'
    ) THEN
        ALTER TYPE "DeviceStatus" ADD VALUE 'PENDING_SETUP';
    END IF;
END$$;

-- Ensure metadata column exists and is JSONB
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'devices' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "devices" ADD COLUMN "metadata" JSONB DEFAULT '{}';
    END IF;
END$$;

-- Create index on metadata for faster claiming token lookups
CREATE INDEX IF NOT EXISTS idx_devices_metadata_claiming_token
ON "devices" USING gin ((metadata -> 'claimingToken'));

-- Create index on metadata for faster API key lookups
CREATE INDEX IF NOT EXISTS idx_devices_metadata_api_key
ON "devices" USING gin ((metadata -> 'apiKey'));

-- Create helper function to generate device IDs
CREATE OR REPLACE FUNCTION generate_device_id() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'IOT-';
    i INTEGER;
BEGIN
    -- Generate 4 random characters
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    result := result || '-';

    -- Generate 4 more random characters
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Note: To pre-register devices for manufacturing, run:
-- INSERT INTO devices (id, deviceId, name, status, metadata)
-- VALUES (
--     gen_random_uuid(),
--     generate_device_id(),
--     'Unclaimed Device',
--     'UNCLAIMED',
--     '{}'::jsonb
-- );
