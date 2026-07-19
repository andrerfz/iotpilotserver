import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, loggedInGuard, rootRedirectGuard } from './core/auth/guards';
import { SHELL_CHILDREN } from './shell/shell.routes';

/** Dev-only routes: the kit showcase (/__ui) and the unguarded shell preview
 *  (/__shell). Absent from the production routing table via isDevMode(). */
const devRoutes: Routes = [
  {
    path: '__ui',
    loadComponent: () => import('./demo/demo.page').then((m) => m.DemoPage),
  },
  {
    path: '__shell',
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: SHELL_CHILDREN,
  },
  {
    // POC: iOS cascade with nested card modals (presentingElement + mode=ios).
    path: '__cascade',
    loadComponent: () => import('./demo/cascade-demo.page').then((m) => m.CascadeDemoPage),
  },
];

export const routes: Routes = [
  {
    // rootRedirectGuard always resolves to a UrlTree (redirects to /app or
    // /login), so this route never actually renders a component — `children: []`
    // only exists to satisfy the Router's route-config validator, which requires
    // one of component/loadComponent/redirectTo/children/loadChildren on every
    // route (a guard alone isn't enough).
    path: '',
    pathMatch: 'full',
    canActivate: [rootRedirectGuard],
    children: [],
  },
  {
    path: 'login',
    canActivate: [loggedInGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [loggedInGuard],
    loadComponent: () =>
      import('./features/auth/pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    // No loggedInGuard: an invite can arrive for a different email than the
    // session currently active in this browser — always reachable via the link.
    path: 'accept-invite',
    loadComponent: () =>
      import('./features/auth/pages/accept-invite/accept-invite.page').then(
        (m) => m.AcceptInvitePage,
      ),
  },
  {
    path: 'smoke',
    loadComponent: () => import('./smoke/smoke.page').then((m) => m.SmokePage),
  },
  {
    // Authenticated app shell (rail + topbar + routed pages).
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: SHELL_CHILDREN,
  },
  ...(isDevMode() ? devRoutes : []),
];
