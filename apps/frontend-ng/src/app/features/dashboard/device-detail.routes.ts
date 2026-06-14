import { Routes } from '@angular/router';

export const DEVICE_DETAIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/device-overview/device-overview.page').then(m => m.DeviceOverviewPage),
  },
  {
    path: 'alerts',
    loadComponent: () =>
      import('./pages/device-alerts/device-alerts.page').then(m => m.DeviceAlertsPage),
  },
  {
    path: 'commands',
    loadComponent: () =>
      import('./pages/device-commands/device-commands.page').then(m => m.DeviceCommandsPage),
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./pages/device-logs/device-logs.page').then(m => m.DeviceLogsPage),
  },
  {
    path: 'network',
    loadComponent: () =>
      import('./pages/device-network/device-network.page').then(m => m.DeviceNetworkPage),
  },
  {
    path: 'storage',
    loadComponent: () =>
      import('./pages/device-storage/device-storage.page').then(m => m.DeviceStoragePage),
  },
  {
    path: 'metrics',
    loadComponent: () =>
      import('./pages/device-metrics/device-metrics.page').then(m => m.DeviceMetricsPage),
  },
  {
    path: 'terminal',
    loadComponent: () =>
      import('./pages/device-terminal/device-terminal.page').then(m => m.DeviceTerminalPage),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/device-settings/device-settings.page').then(m => m.DeviceSettingsPage),
  },
];
