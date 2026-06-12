import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards';
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
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
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
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
