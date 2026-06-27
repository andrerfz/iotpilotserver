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
    path: 'devices',
    canActivate: [roleGuard('SUPERADMIN')],
    loadComponent: () =>
      import('./pages/admin-devices/admin-devices.page').then(m => m.AdminDevicesPage),
    data: { breadcrumb: ['nav.administer', 'nav.devices'] },
  },
  {
    path: 'customers',
    canActivate: [roleGuard('SUPERADMIN')],
    loadComponent: () =>
      import('./pages/admin-customers/admin-customers.page').then(m => m.AdminCustomersPage),
    data: { breadcrumb: ['nav.administer', 'nav.customers'] },
  },
  {
    path: 'users',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-users/admin-users.page').then(m => m.AdminUsersPage),
    data: { breadcrumb: ['nav.administer', 'nav.users'] },
  },
  {
    path: 'logs',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-logs/admin-logs.page').then(m => m.AdminLogsPage),
    data: { breadcrumb: ['nav.administer', 'nav.logs'] },
  },
  {
    path: 'system',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-system/admin-system.page').then(m => m.AdminSystemPage),
    data: { breadcrumb: ['nav.administer', 'nav.system'] },
  },
];
