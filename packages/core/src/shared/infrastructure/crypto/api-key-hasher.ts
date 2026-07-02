import { createHash } from 'crypto';

/**
 * API keys are stored **hashed**, never in plaintext. The raw key is shown to
 * the caller exactly once at creation; only its SHA-256 digest is persisted, so
 * a database/backup leak does not expose usable credentials.
 *
 * SHA-256 (rather than bcrypt/argon2) is the right choice here: API keys are
 * high-entropy random tokens, not human-chosen passwords, so there is nothing
 * to brute-force and we need a *deterministic* digest to do an indexed
 * exact-match lookup on every request.
 *
 * IMPORTANT: the exact same transformation must be applied on write (store) and
 * on read (validate). Do not trim or normalise here — hash the raw value both
 * sides so they always agree.
 */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * A non-secret display hint derived from the raw key, e.g. `iotp_sen…4f2a`.
 * Safe to persist and return in listings so a user can recognise which key is
 * which without the full secret ever being retrievable again.
 */
export function apiKeyHint(raw: string): string {
  if (raw.length <= 12) return '****';
  return `${raw.slice(0, 8)}…${raw.slice(-4)}`;
}
