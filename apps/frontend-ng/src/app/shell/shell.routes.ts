import { Routes } from '@angular/router';

/**
 * Child routes rendered inside the shell outlet. Each carries `breadcrumb`
 * (drives the topbar) plus `title`/`sub` for the placeholder pages. Real
 * feature modules replace the placeholder loadComponent as they land.
 */
export const SHELL_CHILDREN: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../features/dashboard/pages/dashboard/dashboard.page').then(
        (m) => m.DashboardPage,
      ),
    data: { breadcrumb: ['Operate', 'Dashboard'] },
  },
  {
    path: 'devices',
    loadComponent: () =>
      import('../features/dashboard/pages/devices/devices.page').then(
        (m) => m.DevicesPage,
      ),
    data: { breadcrumb: ['Operate', 'Devices'] },
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
    data: { breadcrumb: ['Operate', 'Devices'] },
  },
  {
    path: 'monitoring',
    loadComponent: () =>
      import('../features/dashboard/pages/monitoring/monitoring.page').then(
        (m) => m.MonitoringPage,
      ),
    data: { breadcrumb: ['Operate', 'Monitoring'] },
  },
  {
    path: 'logs',
    loadComponent: () => import('./placeholder.page').then(m => m.PlaceholderPage),
    data: { breadcrumb: ['Operate', 'Logs'], title: 'Logs', sub: 'Device & system logs' },
  },
  {
    path: 'admin',
    loadComponent: () => import('./placeholder.page').then(m => m.PlaceholderPage),
    data: { breadcrumb: ['Administer', 'Users'], title: 'Users', sub: 'Accounts, roles & access' },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../features/settings/pages/hub/settings-hub.page').then(
        (m) => m.SettingsHubPage,
      ),
    loadChildren: () =>
      import('../features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
    data: { breadcrumb: ['Administer', 'Settings'] },
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
