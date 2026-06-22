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

const SESSION_KEY = 'iotpilot.web-token';

/**
 * Web strategy: keeps the token in memory for fast reads AND in sessionStorage
 * so it survives Command+R page reloads within the same tab. sessionStorage is
 * JS-readable (unlike an httpOnly cookie) but is scoped to the tab and cleared
 * on tab close, which is an acceptable tradeoff for developer ergonomics.
 *
 * TODO(security): the ideal path is in-memory only + httpOnly-cookie /auth/refresh
 * on bootstrap. That flow exists in the backend but the cookie never reaches
 * req.cookies in practice (root cause unknown — nginx forwarding confirmed OK,
 * cookie-parser configured). Until that is debugged and fixed, sessionStorage
 * is the working fallback. Do NOT promote this to localStorage.
 */
@Injectable()
export class InMemoryTokenStorage extends TokenStorage {
  private token: string | null = null;

  async get(): Promise<string | null> {
    return this.token ?? sessionStorage.getItem(SESSION_KEY);
  }

  async set(token: string): Promise<void> {
    this.token = token;
    sessionStorage.setItem(SESSION_KEY, token);
  }

  async clear(): Promise<void> {
    this.token = null;
    sessionStorage.removeItem(SESSION_KEY);
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
