import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { SecureStoragePort } from '../auth/token.storage';

/**
 * Implements SecureStoragePort using @aparajita/capacitor-secure-storage,
 * which uses iOS Keychain and Android EncryptedSharedPreferences.
 */
@Injectable()
export class CapacitorSecureStorageAdapter extends SecureStoragePort {
  async getItem(key: string): Promise<string | null> {
    return SecureStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await SecureStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await SecureStorage.removeItem(key);
  }
}
