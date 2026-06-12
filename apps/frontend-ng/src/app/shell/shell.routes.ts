import { Routes } from '@angular/router';

/**
 * Child routes rendered inside the shell outlet. Each carries `breadcrumb`
 * (drives the topbar) plus `title`/`sub` for the placeholder pages. Real
 * feature modules replace the placeholder loadComponent as they land.
 */
export const SHELL_CHILDREN: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./placeholder.page').then(m => m.PlaceholderPage),
    data: { breadcrumb: ['Operate', 'Dashboard'], title: 'Dashboard', sub: 'Fleet overview & telemetry' },
  },
  {
    path: 'devices',
    loadComponent: () => import('./placeholder.page').then(m => m.PlaceholderPage),
    data: { breadcrumb: ['Operate', 'Devices'], title: 'Devices', sub: 'Registered devices & status' },
  },
  {
    path: 'monitoring',
    loadComponent: () => import('./placeholder.page').then(m => m.PlaceholderPage),
    data: { breadcrumb: ['Operate', 'Monitoring'], title: 'Monitoring', sub: 'Alerts & thresholds' },
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
