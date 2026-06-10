/**
 * Secret Cipher Interface
 *
 * Authenticated symmetric encryption for secrets at rest (SSH private keys,
 * passphrases, and any other sensitive credential material persisted in the
 * database).
 *
 * Implementations MUST use authenticated encryption (AEAD) so that tampering
 * with ciphertext is detected on decrypt. Tokens are self-describing and
 * versioned so the algorithm/key can be rotated without ambiguity.
 */
export interface SecretCipher {
  /**
   * Encrypts a plaintext secret.
   * @param plaintext The secret to protect (e.g. an SSH private key)
   * @returns A versioned, self-describing token safe to persist
   */
  encrypt(plaintext: string): string;

  /**
   * Decrypts a token produced by {@link encrypt}.
   * @param token A token previously produced by this cipher family
   * @returns The original plaintext
   * @throws If the token is malformed, the version is unknown, or the
   *         authentication tag does not verify (tampering / wrong key)
   */
  decrypt(token: string): string;

  /**
   * Type guard — true when the value looks like a token this cipher family
   * produced. Lets callers distinguish encrypted material from legacy
   * plaintext during a migration window.
   */
  isEncrypted(value: string): boolean;
}
