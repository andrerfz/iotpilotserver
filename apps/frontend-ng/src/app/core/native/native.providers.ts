import type { Provider } from '@angular/core';
import { SecureStoragePort, SecureTokenStorage, TokenStorage } from '../auth/token.storage';
import { CapacitorSecureStorageAdapter } from './secure-storage.adapter';

/**
 * Mobile provider set: wires CapacitorSecureStorageAdapter → SecureStoragePort
 * and SecureTokenStorage → TokenStorage. Swap into main.ts bootstrap providers
 * when running on a native Capacitor platform.
 *
 * Web builds keep the default provideTokenStorage() (in-memory, no JS-readable
 * storage of the session token).
 */
export function provideNativeTokenStorage(): Provider[] {
  return [
    { provide: SecureStoragePort, useClass: CapacitorSecureStorageAdapter },
    { provide: TokenStorage, useClass: SecureTokenStorage },
  ];
}
