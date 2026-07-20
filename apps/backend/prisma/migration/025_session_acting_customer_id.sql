-- Migration 025: add actingCustomerId to sessions
--
-- Backs the SUPERADMIN "act as customer" session-scoped tenant switch
-- (2efe2b9): customerId stays the login-time tenant, actingCustomerId is the
-- SUPERADMIN's current "act as" choice (null = global/none). This column was
-- applied by hand in production when that feature shipped but never got a
-- tracked migration file, so fresh/local databases were missing it.

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "actingCustomerId" TEXT;
