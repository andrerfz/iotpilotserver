import {describe, it, expect} from 'vitest';
import * as crypto from 'crypto';
import {AesGcmSecretCipher} from './aes-gcm-secret-cipher';

const key = () => crypto.randomBytes(32);

describe('AesGcmSecretCipher', () => {
  it('round-trips a secret through encrypt/decrypt', () => {
    const cipher = new AesGcmSecretCipher(key());
    const secret = '-----BEGIN OPENSSH PRIVATE KEY-----\nabc123\n-----END-----';

    const token = cipher.encrypt(secret);
    expect(cipher.decrypt(token)).toBe(secret);
  });

  it('produces a versioned, self-describing token', () => {
    const cipher = new AesGcmSecretCipher(key());
    const token = cipher.encrypt('hunter2');

    const parts = token.split(':');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('v1');
    expect(cipher.isEncrypted(token)).toBe(true);
  });

  it('uses a fresh IV so the same plaintext yields different tokens', () => {
    const cipher = new AesGcmSecretCipher(key());
    expect(cipher.encrypt('same')).not.toBe(cipher.encrypt('same'));
  });

  it('detects tampering via the GCM auth tag', () => {
    const cipher = new AesGcmSecretCipher(key());
    const token = cipher.encrypt('sensitive');
    const parts = token.split(':');
    // Flip the ciphertext segment
    const tamperedCt = Buffer.from(parts[3], 'base64');
    tamperedCt[0] ^= 0xff;
    parts[3] = tamperedCt.toString('base64');

    expect(() => cipher.decrypt(parts.join(':'))).toThrow(/decryption failed/);
  });

  it('fails to decrypt with the wrong key', () => {
    const token = new AesGcmSecretCipher(key()).encrypt('secret');
    expect(() => new AesGcmSecretCipher(key()).decrypt(token)).toThrow(/decryption failed/);
  });

  it('rejects malformed or unversioned tokens', () => {
    const cipher = new AesGcmSecretCipher(key());
    expect(() => cipher.decrypt('not-a-token')).toThrow(/malformed/);
    expect(() => cipher.decrypt('v9:a:b:c')).toThrow(/malformed/);
    expect(cipher.isEncrypted('plaintext')).toBe(false);
  });

  it('rejects keys that are not 32 bytes', () => {
    expect(() => new AesGcmSecretCipher(crypto.randomBytes(16))).toThrow(/32 bytes/);
  });

  describe('deriveKey', () => {
    it('accepts a 64-char hex key as 32 raw bytes', () => {
      const hex = crypto.randomBytes(32).toString('hex');
      expect(AesGcmSecretCipher.deriveKey(hex)).toEqual(Buffer.from(hex, 'hex'));
    });

    it('accepts a 32-byte base64 key', () => {
      const raw = crypto.randomBytes(32);
      expect(AesGcmSecretCipher.deriveKey(raw.toString('base64'))).toEqual(raw);
    });

    it('stretches an arbitrary passphrase to 32 bytes deterministically', () => {
      const k1 = AesGcmSecretCipher.deriveKey('a weak passphrase');
      const k2 = AesGcmSecretCipher.deriveKey('a weak passphrase');
      expect(k1).toHaveLength(32);
      expect(k1).toEqual(k2);
    });

    it('derived passphrase key actually works end-to-end', () => {
      const cipher = new AesGcmSecretCipher(AesGcmSecretCipher.deriveKey('passphrase'));
      expect(cipher.decrypt(cipher.encrypt('payload'))).toBe('payload');
    });
  });
});
