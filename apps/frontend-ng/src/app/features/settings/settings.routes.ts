import { Routes } from '@angular/router';
import { roleGuard, superadminTenantGuard } from '@ng/core/auth/guards';

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
    data: { breadcrumb: ['nav.account', 'nav.settings', 'settings.tabs.profile'] },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/settings-notifications.page').then(
        (m) => m.SettingsNotificationsPage,
      ),
    data: { breadcrumb: ['nav.account', 'nav.settings', 'settings.tabs.notifications'] },
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./pages/security/settings-security.page').then((m) => m.SettingsSecurityPage),
    data: { breadcrumb: ['nav.account', 'nav.settings', 'settings.tabs.security'] },
  },
  {
    // Personal display preferences: theme, dashboard layout, items per page.
    path: 'preferences',
    loadComponent: () =>
      import('./pages/preferences/settings-preferences.page').then(
        (m) => m.SettingsPreferencesPage,
      ),
    data: { breadcrumb: ['nav.account', 'nav.settings', 'settings.tabs.preferences'] },
  },
  {
    // settings/system now lives at preferences; redirect for backwards-compat.
    path: 'system',
    redirectTo: 'preferences',
    pathMatch: 'full',
  },
  {
    path: 'api-keys',
    loadComponent: () =>
      import('./pages/api-keys/settings-api-keys.page').then((m) => m.SettingsApiKeysPage),
    data: { breadcrumb: ['nav.account', 'nav.settings', 'settings.tabs.api_keys'] },
  },
  {
    path: 'thresholds',
    // Thresholds are tenant-scoped; a SUPERADMIN in platform mode (no active
    // customer) has nothing to edit and the API 400s. Bounce them out — they
    // must select a customer first. Regular ADMIN/USER pass through.
    canActivate: [superadminTenantGuard],
    loadComponent: () =>
      import('./pages/thresholds/settings-thresholds.page').then((m) => m.SettingsThresholdsPage),
    data: { breadcrumb: ['nav.account', 'nav.settings', 'settings.tabs.thresholds'] },
  },
  {
    // Tenant admin config: advanced metrics, beta features, log level.
    // Gated to ADMIN role + active tenant (superadminTenantGuard).
    path: 'org',
    canActivate: [roleGuard('ADMIN'), superadminTenantGuard],
    loadComponent: () =>
      import('./pages/org/settings-org.page').then((m) => m.SettingsOrgPage),
    data: { breadcrumb: ['nav.account', 'nav.settings', 'settings.tabs.org'] },
  },
];
