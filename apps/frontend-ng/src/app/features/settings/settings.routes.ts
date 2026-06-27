import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'profile',
    pathMatch: 'full',
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/settings-profile.page').then((m) => m.SettingsProfilePage),
    data: { breadcrumb: ['nav.administer', 'nav.settings', 'settings.tabs.profile'] },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/settings-notifications.page').then(
        (m) => m.SettingsNotificationsPage,
      ),
    data: { breadcrumb: ['nav.administer', 'nav.settings', 'settings.tabs.notifications'] },
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./pages/security/settings-security.page').then((m) => m.SettingsSecurityPage),
    data: { breadcrumb: ['nav.administer', 'nav.settings', 'settings.tabs.security'] },
  },
  {
    path: 'system',
    loadComponent: () =>
      import('./pages/system/settings-system.page').then((m) => m.SettingsSystemPage),
    data: { breadcrumb: ['nav.administer', 'nav.settings', 'settings.tabs.system'] },
  },
  {
    path: 'api-keys',
    loadComponent: () =>
      import('./pages/api-keys/settings-api-keys.page').then((m) => m.SettingsApiKeysPage),
    data: { breadcrumb: ['nav.administer', 'nav.settings', 'settings.tabs.api_keys'] },
  },
];
