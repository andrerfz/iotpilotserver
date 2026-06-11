import { TestBed } from '@angular/core/testing';
import {
  InMemoryTokenStorage,
  SecureStoragePort,
  SecureTokenStorage,
  SESSION_TOKEN_KEY,
} from './token.storage';

describe('InMemoryTokenStorage (web strategy)', () => {
  it('returns null before any token is set', async () => {
    const storage = new InMemoryTokenStorage();
    expect(await storage.get()).toBeNull();
  });

  it('round-trips a token through set/get', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.set('jwt-abc');
    expect(await storage.get()).toBe('jwt-abc');
  });

  it('overwrites the previous token on set', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.set('first');
    await storage.set('second');
    expect(await storage.get()).toBe('second');
  });

  it('clears the token', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.set('jwt-abc');
    await storage.clear();
    expect(await storage.get()).toBeNull();
  });

  it('does not persist anywhere JS-readable (no localStorage write)', async () => {
    const storage = new InMemoryTokenStorage();
    await storage.set('jwt-abc');
    // The web strategy is memory-only by design (Q2): nothing leaks to localStorage.
    expect(globalThis.localStorage?.getItem(SESSION_TOKEN_KEY) ?? null).toBeNull();
  });
});

/** In-memory fake of the mobile secure-storage backend. */
class FakeSecureStorage extends SecureStoragePort {
  private readonly map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}

describe('SecureTokenStorage (mobile strategy)', () => {
  let backend: FakeSecureStorage;
  let storage: SecureTokenStorage;

  beforeEach(() => {
    backend = new FakeSecureStorage();
    TestBed.configureTestingModule({
      providers: [SecureTokenStorage, { provide: SecureStoragePort, useValue: backend }],
    });
    storage = TestBed.inject(SecureTokenStorage);
  });

  it('returns null before any token is set', async () => {
    expect(await storage.get()).toBeNull();
  });

  it('persists the token under the session key', async () => {
    await storage.set('jwt-xyz');
    expect(await storage.get()).toBe('jwt-xyz');
    expect(await backend.getItem(SESSION_TOKEN_KEY)).toBe('jwt-xyz');
  });

  it('clears the token from the backend', async () => {
    await storage.set('jwt-xyz');
    await storage.clear();
    expect(await storage.get()).toBeNull();
    expect(await backend.getItem(SESSION_TOKEN_KEY)).toBeNull();
  });
});
