-- Migration 019: hash API keys at rest + invalidate legacy plaintext keys
--
-- API keys were previously stored in PLAINTEXT in api_keys.key, meaning a
-- database or backup leak exposed directly usable credentials. Going forward
-- the application stores only the SHA-256 digest of each key (see
-- packages/core/src/shared/infrastructure/crypto/api-key-hasher.ts). This
-- migration brings existing data in line:
--
--   1. Add the keyHint display column (non-secret "iotp_sen…4f2a" style hint).
--   2. Backfill keyHint from the current plaintext, then overwrite key with its
--      SHA-256 digest so NO plaintext remains in the table or future backups.
--   3. Soft-delete every pre-existing key: they were stored in plaintext and may
--      already have leaked, so they can no longer be trusted and must be
--      re-issued.
--   4. Reset every currently-claimed device to UNCLAIMED so it re-claims and is
--      issued a fresh (hashed) key.
--
-- Idempotent: the digest step only rewrites rows that are not already a 64-char
-- hex hash; the column add and device reset are guarded.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "keyHint" TEXT;

-- 1 + 2: backfill the display hint from the plaintext, then replace the stored
-- value with its SHA-256 digest. The WHERE guard makes re-runs a no-op.
UPDATE api_keys
SET "keyHint" = COALESCE("keyHint", left(key, 8) || '…' || right(key, 4)),
    key = encode(digest(key, 'sha256'), 'hex')
WHERE key !~ '^[0-9a-f]{64}$';

-- 3: invalidate all previously stored keys (plaintext at rest → untrusted).
UPDATE api_keys
SET "deletedAt" = NOW()
WHERE "deletedAt" IS NULL;

-- 4: unclaim every claimed device so it re-claims and receives a fresh key.
UPDATE devices
SET status = 'UNCLAIMED',
    "userId" = NULL,
    "customerId" = NULL,
    "updatedAt" = NOW()
WHERE status <> 'UNCLAIMED';
