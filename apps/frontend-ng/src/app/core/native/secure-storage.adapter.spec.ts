import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CapacitorSecureStorageAdapter } from './secure-storage.adapter';
import { SecureStoragePort } from '../auth/token.storage';

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('CapacitorSecureStorageAdapter', () => {
  let adapter: SecureStoragePort;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: SecureStoragePort, useClass: CapacitorSecureStorageAdapter }],
    });
    adapter = TestBed.inject(SecureStoragePort);
  });

  it('getItem returns null when key not set', async () => {
    const result = await adapter.getItem('missing-key');
    expect(result).toBeNull();
  });

  it('setItem delegates to SecureStorage.setItem', async () => {
    const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
    await adapter.setItem('my-key', 'my-token');
    expect(SecureStorage.setItem).toHaveBeenCalledWith('my-key', 'my-token');
  });

  it('getItem returns the stored value', async () => {
    const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
    vi.mocked(SecureStorage.getItem).mockResolvedValueOnce('stored-token');
    const result = await adapter.getItem('my-key');
    expect(result).toBe('stored-token');
  });

  it('removeItem delegates to SecureStorage.removeItem', async () => {
    const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
    await adapter.removeItem('my-key');
    expect(SecureStorage.removeItem).toHaveBeenCalledWith('my-key');
  });
});
