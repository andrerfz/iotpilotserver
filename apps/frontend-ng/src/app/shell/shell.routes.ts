import { Routes } from '@angular/router';
import { roleGuard, superadminTenantGuard } from '../core/auth/guards';

/**
 * Child routes rendered inside the shell outlet. Each carries `breadcrumb`
 * (drives the topbar) plus `title`/`sub` for the placeholder pages. Real
 * feature modules replace the placeholder loadComponent as they land.
 */
export const SHELL_CHILDREN: Routes = [
  {
    path: 'dashboard',
    canActivate: [superadminTenantGuard],
    loadComponent: () =>
      import('../features/dashboard/pages/dashboard/dashboard.page').then(
        (m) => m.DashboardPage,
      ),
    data: { breadcrumb: ['nav.operate', 'nav.dashboard'] },
  },
  {
    path: 'devices',
    loadComponent: () =>
      import('../features/dashboard/pages/devices/devices.page').then(
        (m) => m.DevicesPage,
      ),
    data: { breadcrumb: ['nav.operate', 'nav.devices'] },
  },
  {
    path: 'devices/:id',
    loadComponent: () =>
      import('../features/dashboard/pages/device-detail/device-detail.page').then(
        (m) => m.DeviceDetailPage,
      ),
    loadChildren: () =>
      import('../features/dashboard/device-detail.routes').then(
        (m) => m.DEVICE_DETAIL_ROUTES,
      ),
    data: { breadcrumb: ['nav.operate', 'nav.devices'] },
  },
  {
    path: 'monitoring',
    canActivate: [superadminTenantGuard],
    loadComponent: () =>
      import('../features/dashboard/pages/monitoring/monitoring.page').then(
        (m) => m.MonitoringPage,
      ),
    data: { breadcrumb: ['nav.operate', 'nav.monitoring'] },
  },
  {
    path: 'logs',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('../features/dashboard/pages/logs/logs.page').then(m => m.LogsPage),
    data: { breadcrumb: ['nav.operate', 'nav.logs'] },
  },
  {
    path: 'admin',
    canActivate: [roleGuard('ADMIN')],
    loadChildren: () =>
      import('../features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../features/settings/pages/hub/settings-hub.page').then(
        (m) => m.SettingsHubPage,
      ),
    loadChildren: () =>
      import('../features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
    data: { breadcrumb: ['nav.account', 'nav.settings'] },
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
