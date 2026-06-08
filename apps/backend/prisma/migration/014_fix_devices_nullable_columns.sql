-- Migration 014: Add missing device columns and relax NOT NULL constraints
-- Applied manually to production on 2026-06-08, now tracked here.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE devices ALTER COLUMN hostname    DROP NOT NULL;
ALTER TABLE devices ALTER COLUMN architecture DROP NOT NULL;
