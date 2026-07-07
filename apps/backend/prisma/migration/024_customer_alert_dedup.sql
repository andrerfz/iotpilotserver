-- Migration 024: add alertDedupEnabled to customers
--
-- Controls whether RecordSensorReadingHandler collapses repeated threshold
-- breaches into a single open alert per device/type (true) or creates a new
-- alert + email for every breaching reading (false, the default — customers
-- want a real notification per incident, not a single silent one).

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "alertDedupEnabled" BOOLEAN NOT NULL DEFAULT false;
