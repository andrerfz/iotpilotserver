import { TestBed } from '@angular/core/testing';
import { Api } from '../api/generated/api';
import { authLoginPost } from '../api/generated/fn/auth/auth-login-post';
import { authLogoutPost } from '../api/generated/fn/auth/auth-logout-post';
import { authMeGet } from '../api/generated/fn/auth/auth-me-get';
import { authRefreshPost } from '../api/generated/fn/auth/auth-refresh-post';
import { authVerify2FaPost } from '../api/generated/fn/auth/auth-verify-2-fa-post';
import { User } from '../api/generated/models/user';
import { AuthService } from './auth.service';
import { InMemoryTokenStorage, TokenStorage } from './token.storage';

const adminUser: User = {
  id: 'usr_1',
  email: 'admin@acme.test',
  username: 'admin',
  role: 'ADMIN',
  customerId: 'cus_1',
};

/** Fake Api keyed by the generated function reference. */
class FakeApi {
  private readonly handlers = new Map<unknown, (params?: unknown) => Promise<unknown>>();

  on(fn: unknown, impl: (params?: unknown) => Promise<unknown>): void {
    this.handlers.set(fn, impl);
  }

  invoke(fn: unknown, params?: unknown): Promise<unknown> {
    const handler = this.handlers.get(fn);
    return handler ? handler(params) : Promise.reject(new Error(`no handler for ${String(fn)}`));
  }
}

describe('AuthService', () => {
  let api: FakeApi;
  let tokens: TokenStorage;
  let auth: AuthService;

  beforeEach(() => {
    api = new FakeApi();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Api, useValue: api },
        { provide: TokenStorage, useClass: InMemoryTokenStorage },
      ],
    });
    auth = TestBed.inject(AuthService);
    tokens = TestBed.inject(TokenStorage);
  });

  it('starts unauthenticated', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
    expect(auth.role()).toBeNull();
  });

  it('login populates session signals and stores the token', async () => {
    api.on(authLoginPost, () =>
      Promise.resolve({ success: true, data: { user: adminUser, token: 'jwt-1' } }),
    );

    const result = await auth.login('admin@acme.test', 'pw');

    expect(result).toEqual({ status: 'authenticated', user: adminUser });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUser()).toEqual(adminUser);
    expect(auth.role()).toBe('ADMIN');
    expect(await tokens.get()).toBe('jwt-1');
  });

  it('login returns a 2FA challenge without establishing a session', async () => {
    api.on(authLoginPost, () =>
      Promise.resolve({ success: true, data: { requiresTwoFactor: true, userId: 'usr_1' } }),
    );

    const result = await auth.login('admin@acme.test', 'pw');

    expect(result).toEqual({ status: 'requires-2fa', userId: 'usr_1' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(await tokens.get()).toBeNull();
  });

  it('verifyTwoFactor() completes login and establishes the session', async () => {
    let sentBody: unknown;
    api.on(authVerify2FaPost, (params) => {
      sentBody = (params as { body: unknown }).body;
      return Promise.resolve({ success: true, data: { user: adminUser, token: 'jwt-2fa' } });
    });

    const user = await auth.verifyTwoFactor('usr_1', '123456', true);

    expect(user).toEqual(adminUser);
    expect(sentBody).toEqual({ userId: 'usr_1', code: '123456', remember: true });
    expect(auth.isAuthenticated()).toBe(true);
    expect(await tokens.get()).toBe('jwt-2fa');
  });

  it('me() loads the current user into the signal', async () => {
    api.on(authMeGet, () => Promise.resolve({ success: true, data: { user: adminUser } }));

    const user = await auth.me();

    expect(user).toEqual(adminUser);
    expect(auth.currentUser()).toEqual(adminUser);
  });

  it('refresh() rotates the token and populates the session on success', async () => {
    api.on(authRefreshPost, () =>
      Promise.resolve({ success: true, data: { user: adminUser, token: 'jwt-2' } }),
    );

    const ok = await auth.refresh();

    expect(ok).toBe(true);
    expect(auth.currentUser()).toEqual(adminUser);
    expect(await tokens.get()).toBe('jwt-2');
  });

  it('refresh() clears the session and returns false on failure', async () => {
    await tokens.set('stale');
    api.on(authLoginPost, () =>
      Promise.resolve({ success: true, data: { user: adminUser, token: 'jwt-1' } }),
    );
    await auth.login('admin@acme.test', 'pw');
    api.on(authRefreshPost, () => Promise.reject(new Error('401')));

    const ok = await auth.refresh();

    expect(ok).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
    expect(await tokens.get()).toBeNull();
  });

  it('logout() clears session even though the network call resolves', async () => {
    api.on(authLoginPost, () =>
      Promise.resolve({ success: true, data: { user: adminUser, token: 'jwt-1' } }),
    );
    await auth.login('admin@acme.test', 'pw');
    api.on(authLogoutPost, () => Promise.resolve({ success: true, data: { message: 'ok' } }));

    await auth.logout();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
    expect(await tokens.get()).toBeNull();
  });

  it('logout() still clears local state when the network call fails', async () => {
    api.on(authLoginPost, () =>
      Promise.resolve({ success: true, data: { user: adminUser, token: 'jwt-1' } }),
    );
    await auth.login('admin@acme.test', 'pw');
    api.on(authLogoutPost, () => Promise.reject(new Error('network')));

    await expect(auth.logout()).rejects.toThrow();
    expect(auth.isAuthenticated()).toBe(false);
    expect(await tokens.get()).toBeNull();
  });
});
