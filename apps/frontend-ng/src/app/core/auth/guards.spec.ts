import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, roleGuard } from './guards';

/** Mutable session state the fake AuthService reflects. */
const session = { authed: false, role: null as string | null };
const fakeAuth = {
  isAuthenticated: () => session.authed,
  role: () => session.role,
};

let router: Router;

/** Run a guard under the current session and reduce its result to a route class. */
function run(guard: CanActivateFn, url = '/protected'): 'allow' | string {
  const state = { url } as RouterStateSnapshot;
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, state),
  );
  if (result === true) {
    return 'allow';
  }
  return router.serializeUrl(result as UrlTree);
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: fakeAuth }],
  });
  router = TestBed.inject(Router);
  session.authed = false;
  session.role = null;
});

describe('authGuard', () => {
  it('redirects an unauthenticated visitor to /login with returnUrl', () => {
    session.authed = false;
    expect(run(authGuard, '/devices')).toBe('/login?returnUrl=%2Fdevices');
  });

  for (const role of ['READONLY', 'USER', 'ADMIN', 'SUPERADMIN']) {
    it(`allows an authenticated ${role}`, () => {
      session.authed = true;
      session.role = role;
      expect(run(authGuard)).toBe('allow');
    });
  }
});

describe('roleGuard — role matrix', () => {
  // Expected outcome per (guard minRole) × (session). 'allow' | '/' (forbidden) | '/login' (unauth)
  type Outcome = 'allow' | 'home' | 'login';
  const cases: { minRole: 'USER' | 'ADMIN' | 'SUPERADMIN'; role: string | null; authed: boolean; expect: Outcome }[] = [
    // unauthenticated → always /login
    { minRole: 'USER', role: null, authed: false, expect: 'login' },
    { minRole: 'ADMIN', role: null, authed: false, expect: 'login' },
    { minRole: 'SUPERADMIN', role: null, authed: false, expect: 'login' },
    // roleGuard(USER)
    { minRole: 'USER', role: 'READONLY', authed: true, expect: 'home' },
    { minRole: 'USER', role: 'USER', authed: true, expect: 'allow' },
    { minRole: 'USER', role: 'ADMIN', authed: true, expect: 'allow' },
    { minRole: 'USER', role: 'SUPERADMIN', authed: true, expect: 'allow' },
    // roleGuard(ADMIN)
    { minRole: 'ADMIN', role: 'READONLY', authed: true, expect: 'home' },
    { minRole: 'ADMIN', role: 'USER', authed: true, expect: 'home' },
    { minRole: 'ADMIN', role: 'ADMIN', authed: true, expect: 'allow' },
    { minRole: 'ADMIN', role: 'SUPERADMIN', authed: true, expect: 'allow' },
    // roleGuard(SUPERADMIN)
    { minRole: 'SUPERADMIN', role: 'READONLY', authed: true, expect: 'home' },
    { minRole: 'SUPERADMIN', role: 'USER', authed: true, expect: 'home' },
    { minRole: 'SUPERADMIN', role: 'ADMIN', authed: true, expect: 'home' },
    { minRole: 'SUPERADMIN', role: 'SUPERADMIN', authed: true, expect: 'allow' },
  ];

  for (const c of cases) {
    const label = `${c.minRole} guard + ${c.authed ? c.role : 'unauthenticated'} → ${c.expect}`;
    it(label, () => {
      session.authed = c.authed;
      session.role = c.role;
      const result = run(roleGuard(c.minRole), '/x');
      if (c.expect === 'allow') {
        expect(result).toBe('allow');
      } else if (c.expect === 'home') {
        expect(result).toBe('/');
      } else {
        expect(result).toBe('/login?returnUrl=%2Fx');
      }
    });
  }
});
