import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-overview/admin-overview.page').then(m => m.AdminOverviewPage),
    data: { breadcrumb: ['Administer', 'Overview'] },
  },
  {
    path: 'devices',
    canActivate: [roleGuard('SUPERADMIN')],
    loadComponent: () =>
      import('./pages/admin-devices/admin-devices.page').then(m => m.AdminDevicesPage),
    data: { breadcrumb: ['Administer', 'Devices'] },
  },
  {
    path: 'users',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-users/admin-users.page').then(m => m.AdminUsersPage),
    data: { breadcrumb: ['Administer', 'Users'] },
  },
  {
    path: 'logs',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-logs/admin-logs.page').then(m => m.AdminLogsPage),
    data: { breadcrumb: ['Administer', 'Logs'] },
  },
  {
    path: 'system',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('./pages/admin-system/admin-system.page').then(m => m.AdminSystemPage),
    data: { breadcrumb: ['Administer', 'System'] },
  },
];
