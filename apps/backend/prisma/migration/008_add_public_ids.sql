-- Migration 008: Add publicId to user-facing models
-- Decouples internal DB primary keys from the API surface.
-- API routes will accept and return publicId; internal id stays server-side only.

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id TEXT;
UPDATE users SET public_id = gen_random_uuid()::text WHERE public_id IS NULL;
ALTER TABLE users ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_key ON users(public_id);

-- Devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS public_id TEXT;
UPDATE devices SET public_id = gen_random_uuid()::text WHERE public_id IS NULL;
ALTER TABLE devices ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS devices_public_id_key ON devices(public_id);

-- Alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS public_id TEXT;
UPDATE alerts SET public_id = gen_random_uuid()::text WHERE public_id IS NULL;
ALTER TABLE alerts ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS alerts_public_id_key ON alerts(public_id);

-- Device Commands
ALTER TABLE device_commands ADD COLUMN IF NOT EXISTS public_id TEXT;
UPDATE device_commands SET public_id = gen_random_uuid()::text WHERE public_id IS NULL;
ALTER TABLE device_commands ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS device_commands_public_id_key ON device_commands(public_id);
