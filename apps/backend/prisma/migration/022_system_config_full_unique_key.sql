-- Migration 022: make system_config.key a FULL unique index
--
-- Prisma's schema declares @@unique([key]) (a full unique), and
-- systemConfig.upsert emits `ON CONFLICT ("key")`. Some environments have a
-- PARTIAL unique index instead — `... (key) WHERE ("deletedAt" IS NULL)` —
-- which Postgres will NOT use for a plain ON CONFLICT, causing:
--   42P10: there is no unique or exclusion constraint matching the ON CONFLICT
-- Replace it with a full unique index so upsert works and the DB matches the
-- Prisma schema. There are no duplicate keys, so this is safe.

DROP INDEX IF EXISTS system_config_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS system_config_key_key ON system_config (key);
