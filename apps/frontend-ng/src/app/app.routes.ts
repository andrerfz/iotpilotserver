import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards';
import { SHELL_CHILDREN } from './shell/shell.routes';

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
  {
    // Provisional UI-kit showcase. T12 will complete + prod-exclude it.
    path: '__ui',
    loadComponent: () => import('./demo/demo.page').then((m) => m.DemoPage),
  },
  {
    // Dev preview of the shell without the auth guard (provisional, like __ui).
    path: '__shell',
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: SHELL_CHILDREN,
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
