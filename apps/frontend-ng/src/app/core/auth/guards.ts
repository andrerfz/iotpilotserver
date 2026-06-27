import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { hasRole, Role } from './roles';
import { TenantContextService } from './tenant-context.service';

/** Route guard: prevents authenticated users from visiting public-only routes
 *  (/login, /register). Authenticated visitors are redirected to /app. */
export const loggedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/app']);
  }
  return true;
};

/** Root redirect: authenticated → /app, unauthenticated → /login.
 *  Always returns a UrlTree so the component is never rendered. */
export const rootRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return router.createUrlTree(auth.isAuthenticated() ? ['/app'] : ['/login']);
};

/**
 * Route guard: requires an authenticated session. Unauthenticated visitors are
 * redirected to /login with the attempted URL as `returnUrl` (parity with the
 * legacy middleware's no-token redirect; the legacy used `redirect`, the new app
 * standardizes on `returnUrl`).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Route guard factory: requires `minRole` or higher (USER < ADMIN < SUPERADMIN).
 *
 * Parity with the legacy middleware: an unauthenticated visitor goes to /login;
 * an authenticated user whose role is too low is sent to `/` (home), not /login
 * — matching the middleware's admin-route behavior.
 */
export function roleGuard(minRole: Role): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    if (!hasRole(auth.role(), minRole)) {
      return router.createUrlTree(['/']);
    }
    return true;
  };
}

/**
 * Route guard for tenant-scoped pages (Operate: dashboard/devices/monitoring/logs).
 * A SUPERADMIN in Platform mode (not acting as a customer) has no tenant, so these
 * views would 400/be empty — bounce them to the platform overview instead. Everyone
 * else (regular ADMIN/USER, or a SUPERADMIN acting as a tenant) passes through.
 */
export const superadminTenantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const tenant = inject(TenantContextService);
  const router = inject(Router);

  if (hasRole(auth.role(), 'SUPERADMIN') && !tenant.isActive()) {
    return router.createUrlTree(['/app/admin']);
  }
  return true;
};
