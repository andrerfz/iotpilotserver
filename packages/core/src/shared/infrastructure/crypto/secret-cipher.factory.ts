import {SecretCipher} from '../../domain/interfaces/secret-cipher.interface';
import {AesGcmSecretCipher} from './aes-gcm-secret-cipher';

let cached: SecretCipher | null = null;

/**
 * Returns the process-wide {@link SecretCipher}, built lazily from the
 * `CREDENTIAL_ENCRYPTION_KEY` environment variable.
 *
 * Fail-closed: if the key is missing, this throws rather than silently
 * degrading to plaintext storage. Generate a key with `openssl rand -hex 32`.
 *
 * A module-level singleton (rather than DI) is deliberate: the cipher is a
 * pure, env-keyed infrastructure utility consumed by both the device
 * repository (write) and the static DeviceMapper (read), and threading DI
 * through static mapper methods would add ceremony without benefit. The
 * underlying {@link AesGcmSecretCipher} stays fully unit-testable on its own.
 */
export function getSecretCipher(): SecretCipher {
  if (cached) return cached;

  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is not set. SSH credentials cannot be encrypted/decrypted. ' +
      'Generate one with `openssl rand -hex 32` and set it in the environment.'
    );
  }

  cached = new AesGcmSecretCipher(AesGcmSecretCipher.deriveKey(secret));
  return cached;
}

/** Test seam — resets the memoized cipher so tests can vary the env key. */
export function resetSecretCipherForTests(): void {
  cached = null;
}
