-- Add personal info fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- Add missing alert fields for threshold linking and acknowledgement
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "thresholdId" TEXT;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
