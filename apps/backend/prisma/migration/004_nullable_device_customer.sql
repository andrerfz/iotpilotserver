-- Migration 004: Make devices.customerId nullable
-- UNCLAIMED devices have no customer until claimed.

-- Drop the existing NOT NULL constraint and foreign key
ALTER TABLE "devices" ALTER COLUMN "customerId" DROP NOT NULL;

-- The foreign key constraint already allows NULL implicitly once NOT NULL is dropped.
-- Existing UNCLAIMED devices with a placeholder customerId are unaffected.
