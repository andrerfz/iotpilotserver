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
    data: { breadcrumb: ['Administer', 'Settings', 'Profile'] },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/settings-notifications.page').then(
        (m) => m.SettingsNotificationsPage,
      ),
    data: { breadcrumb: ['Administer', 'Settings', 'Notifications'] },
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./pages/security/settings-security.page').then((m) => m.SettingsSecurityPage),
    data: { breadcrumb: ['Administer', 'Settings', 'Security'] },
  },
  {
    path: 'system',
    loadComponent: () =>
      import('./pages/system/settings-system.page').then((m) => m.SettingsSystemPage),
    data: { breadcrumb: ['Administer', 'Settings', 'System'] },
  },
];
