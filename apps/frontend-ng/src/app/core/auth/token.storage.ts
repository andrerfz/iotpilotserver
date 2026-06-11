import { inject, Injectable, Provider } from '@angular/core';

/**
 * Platform-agnostic persistence for the single session token (see fe-core Q2).
 *
 * The token is the backend's stateful, revocable session JWT; the canonical
 * transport is `Authorization: Bearer`. Where it rests differs by platform:
 *  - **Web** → memory only ({@link InMemoryTokenStorage}). Persistence across
 *    reloads is the httpOnly `auth-token` cookie + `/auth/refresh` on bootstrap,
 *    never `localStorage` (XSS cannot read what JS cannot reach).
 *  - **Mobile** → Capacitor SecureStorage ({@link SecureTokenStorage}), wired by
 *    fe-mobile.
 *
 * Async by design so the mobile SecureStorage backend fits without changing
 * callers.
 */
export abstract class TokenStorage {
  abstract get(): Promise<string | null>;
  abstract set(token: string): Promise<void>;
  abstract clear(): Promise<void>;
}

/**
 * Web strategy: holds the token in memory for the lifetime of the page.
 * Intentionally non-persistent — reloads restore the session via the cookie
 * refresh flow, keeping the token out of any JS-readable store.
 */
@Injectable()
export class InMemoryTokenStorage extends TokenStorage {
  private token: string | null = null;

  async get(): Promise<string | null> {
    return this.token;
  }

  async set(token: string): Promise<void> {
    this.token = token;
  }

  async clear(): Promise<void> {
    this.token = null;
  }
}

/**
 * Storage backend the mobile strategy depends on. fe-mobile provides a concrete
 * adapter over a Capacitor secure-storage plugin; keeping {@link SecureTokenStorage}
 * decoupled from the plugin keeps it unit-testable without a native runtime.
 */
export abstract class SecureStoragePort {
  abstract getItem(key: string): Promise<string | null>;
  abstract setItem(key: string, value: string): Promise<void>;
  abstract removeItem(key: string): Promise<void>;
}

/** Key under which the session token is stored in secure storage. */
export const SESSION_TOKEN_KEY = 'iotpilot.session-token';

/**
 * Mobile strategy: persists the token in platform secure storage so it survives
 * app relaunch (Capacitor WebView can't rely on the httpOnly cookie — Q2).
 */
@Injectable()
export class SecureTokenStorage extends TokenStorage {
  private readonly storage = inject(SecureStoragePort);

  async get(): Promise<string | null> {
    return this.storage.getItem(SESSION_TOKEN_KEY);
  }

  async set(token: string): Promise<void> {
    await this.storage.setItem(SESSION_TOKEN_KEY, token);
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(SESSION_TOKEN_KEY);
  }
}

/**
 * Default (web) provider. fe-mobile overrides this with `SecureTokenStorage`
 * plus a Capacitor `SecureStoragePort` adapter.
 */
export function provideTokenStorage(): Provider {
  return { provide: TokenStorage, useClass: InMemoryTokenStorage };
}
