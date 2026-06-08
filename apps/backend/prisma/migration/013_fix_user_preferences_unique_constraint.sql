-- Migration 013: Fix user_preferences unique constraint for Prisma upsert
-- Partial index (WHERE deletedAt IS NULL) is not recognized by ON CONFLICT.
-- Replace with unconditional unique index.
DROP INDEX IF EXISTS "user_preferences_userId_category_key_key";
CREATE UNIQUE INDEX "user_preferences_userId_category_key_key"
  ON user_preferences ("userId", category, key);
