/**
 * Grouped navigation for the shell rail — ports the prototype `NAV`
 * (Operate / Administer). Icons are ionicons names registered in RailComponent.
 */
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

// Paths are RELATIVE to the shell route, so the same rail works under both the
// production shell (/app) and the dev preview (/__shell).
export const NAV: NavGroup[] = [
  {
    group: 'Operate',
    items: [
      { label: 'Dashboard', path: 'dashboard', icon: 'grid-outline' },
      { label: 'Devices', path: 'devices', icon: 'hardware-chip-outline', badge: '10' },
      { label: 'Monitoring', path: 'monitoring', icon: 'notifications-outline', badge: '4' },
      { label: 'Logs', path: 'logs', icon: 'document-text-outline' },
    ],
  },
  {
    group: 'Administer',
    items: [
      { label: 'Users', path: 'admin', icon: 'people-outline', badge: '2' },
      { label: 'Settings', path: 'settings', icon: 'settings-outline' },
    ],
  },
];
