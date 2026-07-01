import { Routes } from '@angular/router';
import { roleGuard, superadminTenantGuard } from '@ng/core/auth/guards';

/**
 * Settings — organised by SCOPE.
 *
 *   /app/settings/account/*   → PERSONAL. Every role. No tenant required.
 *   /app/settings/org/*       → TENANT. ADMIN+ with an active customer only.
 *
 * Back-compat redirects at the bottom keep old deep links alive.
 */
export const SETTINGS_ROUTES: Routes = [
  { path: '', redirectTo: 'account', pathMatch: 'full' },

  // ─────────────────────────── PERSONAL ───────────────────────────
  {
    path: 'account',
    loadComponent: () =>
      import('./pages/account-hub/account-hub.page').then((m) => m.AccountHubPage),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/settings-profile.page').then((m) => m.SettingsProfilePage),
        data: { breadcrumb: ['nav.settings', 'settings.account', 'settings.tabs.profile'] },
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./pages/security/settings-security.page').then((m) => m.SettingsSecurityPage),
        data: { breadcrumb: ['nav.settings', 'settings.account', 'settings.tabs.security'] },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/settings-notifications.page').then(
            (m) => m.SettingsNotificationsPage,
          ),
        data: { breadcrumb: ['nav.settings', 'settings.account', 'settings.tabs.notifications'] },
      },
      {
        path: 'preferences',
        loadComponent: () =>
          import('./pages/preferences/settings-preferences.page').then(
            (m) => m.SettingsPreferencesPage,
          ),
        data: { breadcrumb: ['nav.settings', 'settings.account', 'settings.tabs.preferences'] },
      },
    ],
  },

  // ─────────────────────────── TENANT ─────────────────────────────
  {
    path: 'org',
    canActivate: [roleGuard('ADMIN'), superadminTenantGuard],
    loadComponent: () =>
      import('./pages/org-hub/org-hub.page').then((m) => m.OrgHubPage),
    children: [
      { path: '', redirectTo: 'thresholds', pathMatch: 'full' },
      {
        path: 'thresholds',
        loadComponent: () =>
          import('./pages/thresholds/settings-thresholds.page').then(
            (m) => m.SettingsThresholdsPage,
          ),
        data: { breadcrumb: ['nav.settings', 'settings.org', 'settings.tabs.thresholds'] },
      },
      {
        path: 'api-keys',
        loadComponent: () =>
          import('./pages/api-keys/settings-api-keys.page').then((m) => m.SettingsApiKeysPage),
        data: { breadcrumb: ['nav.settings', 'settings.org', 'settings.tabs.api_keys'] },
      },
      {
        path: 'app-config',
        loadComponent: () =>
          import('./pages/app-config/settings-app-config.page').then(
            (m) => m.SettingsAppConfigPage,
          ),
        data: { breadcrumb: ['nav.settings', 'settings.org', 'settings.tabs.app_config'] },
      },
    ],
  },

  // ─────────────── Back-compat redirects (old flat → nested) ───────────────
  { path: 'profile',       redirectTo: 'account/profile' },
  { path: 'security',      redirectTo: 'account/security' },
  { path: 'notifications', redirectTo: 'account/notifications' },
  { path: 'system',        redirectTo: 'account/preferences' },
  { path: 'preferences',   redirectTo: 'account/preferences' },
  { path: 'api-keys',      redirectTo: 'org/api-keys' },
  { path: 'thresholds',    redirectTo: 'org/thresholds' },
];
