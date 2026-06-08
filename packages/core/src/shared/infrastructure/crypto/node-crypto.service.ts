import {CryptoService} from '../../domain/interfaces/crypto-service.interface';
import * as crypto from 'crypto';

/**
 * Node.js implementation of CryptoService
 * Uses Node.js built-in crypto module
 */
export class NodeCryptoService implements CryptoService {
  randomUUID(): string {
    if (typeof crypto === 'undefined' || !crypto.randomUUID) {
      throw new Error('crypto.randomUUID is not available in this environment. Requires Node.js 15.6+ or modern browser.');
    }
    return crypto.randomUUID();
  }

  randomBytes(size: number): Buffer {
    if (typeof crypto === 'undefined' || !crypto.randomBytes) {
      throw new Error('crypto.randomBytes is not available in this environment.');
    }
    return crypto.randomBytes(size);
  }
}

