/**
 * Crypto Service Interface
 * 
 * Abstraction for cryptographic operations to support:
 * - Better testability (mockable)
 * - DDD alignment (domain doesn't depend on Node.js directly)
 * - Flexibility (can swap implementations if needed)
 */
export interface CryptoService {
  /**
   * Generates a random UUID (v4)
   * @returns A UUID string in the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   */
  randomUUID(): string;

  /**
   * Generates cryptographically strong random bytes
   * @param size Number of random bytes to generate
   * @returns A Buffer containing random bytes
   */
  randomBytes(size: number): Buffer;
}

