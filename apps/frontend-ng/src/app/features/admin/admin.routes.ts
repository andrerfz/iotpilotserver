import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-overview/admin-overview.page').then(m => m.AdminOverviewPage),
    data: { breadcrumb: ['nav.administer', 'nav.overview'] },
  },
  {
    path: 'customers',
    canActivate: [roleGuard('SUPERADMIN')],
    loadComponent: () =>
      import('./pages/admin-customers/admin-customers.page').then(m => m.AdminCustomersPage),
    data: { breadcrumb: ['nav.administer', 'nav.customers'] },
  },
  { path: 'users', redirectTo: '/app/users', pathMatch: 'full' },
  {
    path: 'system',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-system/admin-system.page').then(m => m.AdminSystemPage),
    data: { breadcrumb: ['nav.administer', 'nav.system'] },
  },
];
