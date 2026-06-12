import { Routes } from '@angular/router';

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
    // Provisional UI-kit showcase. T12 will complete + prod-exclude it.
    path: '__ui',
    loadComponent: () => import('./demo/demo.page').then((m) => m.DemoPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
