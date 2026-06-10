import * as crypto from 'crypto';
import {SecretCipher} from '../../domain/interfaces/secret-cipher.interface';

/**
 * AES-256-GCM implementation of {@link SecretCipher}.
 *
 * Token format (colon-separated, all base64):
 *   v1:<iv>:<authTag>:<ciphertext>
 *
 * - `v1`        version tag, lets us rotate algorithm/format later
 * - `iv`        96-bit random nonce, fresh per encryption (GCM requirement)
 * - `authTag`   128-bit GCM authentication tag (integrity / tamper detection)
 * - `ciphertext` the encrypted secret
 *
 * The key is 32 bytes (AES-256). Each `encrypt` call uses a new random IV, so
 * encrypting the same plaintext twice yields different tokens — expected and
 * desirable.
 */
export class AesGcmSecretCipher implements SecretCipher {
  private static readonly VERSION = 'v1';
  private static readonly IV_BYTES = 12; // 96-bit nonce, standard for GCM
  private static readonly KEY_BYTES = 32; // AES-256

  constructor(private readonly key: Buffer) {
    if (key.length !== AesGcmSecretCipher.KEY_BYTES) {
      throw new Error(
        `SecretCipher key must be ${AesGcmSecretCipher.KEY_BYTES} bytes (got ${key.length}).`
      );
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(AesGcmSecretCipher.IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      AesGcmSecretCipher.VERSION,
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(token: string): string {
    const parts = token.split(':');
    if (parts.length !== 4 || parts[0] !== AesGcmSecretCipher.VERSION) {
      throw new Error('SecretCipher: malformed or unsupported token');
    }

    const [, ivB64, tagB64, ctB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    try {
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // final() throws if the auth tag does not verify (tampering / wrong key)
      throw new Error('SecretCipher: decryption failed (bad key or tampered data)');
    }
  }

  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(`${AesGcmSecretCipher.VERSION}:`);
  }

  /**
   * Derives a 32-byte key from a configured secret.
   *
   * Accepts either:
   * - 64 hex chars  → used directly as 32 raw bytes (recommended; generate with
   *   `openssl rand -hex 32`)
   * - 44 base64 chars (32 bytes) → used directly
   * - any other string → treated as a passphrase and stretched with scrypt
   *   against a fixed application salt (lower entropy; prefer a raw key)
   */
  static deriveKey(secret: string): Buffer {
    if (/^[0-9a-fA-F]{64}$/.test(secret)) {
      return Buffer.from(secret, 'hex');
    }
    const asBase64 = Buffer.from(secret, 'base64');
    if (asBase64.length === AesGcmSecretCipher.KEY_BYTES) {
      return asBase64;
    }
    // Fallback: stretch a passphrase. Fixed salt is acceptable here because the
    // input is a high-value server secret, not a user password subject to
    // rainbow-table attacks across many accounts.
    return crypto.scryptSync(secret, 'iotpilot.secret-cipher.v1', AesGcmSecretCipher.KEY_BYTES);
  }
}
