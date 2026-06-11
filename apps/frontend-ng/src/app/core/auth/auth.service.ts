import { HttpContext } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Api } from '../api/generated/api';
import { authLoginPost } from '../api/generated/fn/auth/auth-login-post';
import { authLogoutPost } from '../api/generated/fn/auth/auth-logout-post';
import { authMeGet } from '../api/generated/fn/auth/auth-me-get';
import { authRefreshPost } from '../api/generated/fn/auth/auth-refresh-post';
import { authVerify2FaPost } from '../api/generated/fn/auth/auth-verify-2-fa-post';
import { User } from '../api/generated/models/user';
import { WITH_CREDENTIALS } from '../api/http-context';
import { TokenStorage } from './token.storage';

/** Outcome of a login attempt: an established session, or a 2FA challenge to continue. */
export type LoginResult =
  | { status: 'authenticated'; user: User }
  | { status: 'requires-2fa'; userId: string };

/**
 * Headless authentication: login / logout / me / refresh against the backend,
 * with session state exposed as signals. No UI here — fe-auth builds pages on
 * top of this (the 2FA continuation lands in T6).
 *
 * Session model (fe-core Q2): one revocable session token. The token lives in
 * {@link TokenStorage} (web: memory; mobile: SecureStorage) and is attached as
 * `Authorization: Bearer` by the interceptor (T4). On web, the token also rides
 * an httpOnly cookie the backend sets, which `refresh()` uses to restore the
 * session after a reload.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly tokens = inject(TokenStorage);

  private readonly _user = signal<User | null>(null);

  /** In-flight refresh, shared so concurrent 401s trigger a single rotation. */
  private refreshInFlight: Promise<boolean> | null = null;

  /** Current user, or null when unauthenticated. */
  readonly currentUser = this._user.asReadonly();
  /** True when a user session is established. */
  readonly isAuthenticated = computed(() => this._user() !== null);
  /** Current user's role, or null when unauthenticated. */
  readonly role = computed(() => this._user()?.role ?? null);

  /**
   * Authenticate with email + password. Returns `requires-2fa` (with the userId
   * to continue) when the account has 2FA enabled; otherwise establishes the
   * session and populates the signals.
   */
  async login(email: string, password: string, remember = false): Promise<LoginResult> {
    const res = await this.api.invoke(authLoginPost, { body: { email, password, remember } });
    const data = res.data;

    if (data?.requiresTwoFactor && data.userId) {
      return { status: 'requires-2fa', userId: data.userId };
    }
    if (data?.token && data.user) {
      await this.tokens.set(data.token);
      this._user.set(data.user);
      return { status: 'authenticated', user: data.user };
    }
    throw new Error('Unexpected login response: neither a session nor a 2FA challenge');
  }

  /**
   * Complete a 2FA login: verify the emailed code for the userId returned by a
   * `requires-2fa` login. On success the session is established (token + signals),
   * exactly like a direct login.
   */
  async verifyTwoFactor(userId: string, code: string, remember = false): Promise<User> {
    const res = await this.api.invoke(authVerify2FaPost, { body: { userId, code, remember } });
    if (res.data?.token && res.data.user) {
      await this.tokens.set(res.data.token);
      this._user.set(res.data.user);
      return res.data.user;
    }
    throw new Error('Unexpected 2FA verification response: no session payload');
  }

  /** Revoke the session server-side and clear local state (best-effort on the network call). */
  async logout(): Promise<void> {
    try {
      await this.api.invoke(authLogoutPost, {});
    } finally {
      await this.tokens.clear();
      this._user.set(null);
    }
  }

  /** Fetch the current user from the backend and refresh the signals. */
  async me(): Promise<User | null> {
    const res = await this.api.invoke(authMeGet, {});
    const user = res.data?.user ?? null;
    this._user.set(user);
    return user;
  }

  /**
   * Rotate the session token. On web the httpOnly cookie carries the current
   * token (WITH_CREDENTIALS); on mobile the stored token is sent in the body.
   * Returns true when a fresh session was established. On failure the session is
   * cleared.
   *
   * Single-flight: concurrent callers (e.g. several requests that 401 at once)
   * share one rotation rather than stampeding `/auth/refresh`.
   */
  refresh(): Promise<boolean> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    this.refreshInFlight = this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<boolean> {
    const stored = await this.tokens.get();
    const context = new HttpContext().set(WITH_CREDENTIALS, true);
    try {
      const res = await this.api.invoke(
        authRefreshPost,
        stored ? { body: { refreshToken: stored } } : {},
        context,
      );
      if (res.data?.token && res.data.user) {
        await this.tokens.set(res.data.token);
        this._user.set(res.data.user);
        return true;
      }
      await this.clearSession();
      return false;
    } catch {
      await this.clearSession();
      return false;
    }
  }

  /**
   * Bootstrap hook (provideAppInitializer): attempt to restore a session on app
   * start. Web relies on the cookie; mobile on the stored token. Never throws —
   * an unauthenticated start is a valid outcome.
   */
  async restoreSession(): Promise<void> {
    await this.refresh();
  }

  private async clearSession(): Promise<void> {
    await this.tokens.clear();
    this._user.set(null);
  }
}
