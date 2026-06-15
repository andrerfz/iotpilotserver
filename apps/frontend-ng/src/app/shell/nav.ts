/**
 * Grouped navigation for the shell rail — ports the prototype `NAV`
 * (Operate / Administer). Icons are ionicons names registered in RailComponent.
 */
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: string;
  /** When true, routerLinkActive uses exact matching (for prefix-free paths). */
  exact?: boolean;
  /** Visible only to ADMIN and SUPERADMIN roles. */
  adminOnly?: boolean;
  /** Sub-items always rendered indented below this item. */
  children?: NavItem[];
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
      {
        label: 'Overview', path: 'admin', icon: 'stats-chart-outline', exact: true, adminOnly: true,
        children: [
          { label: 'Devices', path: 'admin/devices', icon: 'hardware-chip-outline', adminOnly: true },
          { label: 'Users',   path: 'admin/users',   icon: 'people-outline', badge: '2', adminOnly: true },
          { label: 'Logs',    path: 'admin/logs',    icon: 'document-text-outline', adminOnly: true },
          { label: 'System',  path: 'admin/system',  icon: 'server-outline', adminOnly: true },
        ],
      },
    ],
  },
];

/** Paths shown as primary tabs in the mobile bottom bar. */
export const PRIMARY_PATHS = new Set(['dashboard', 'devices', 'monitoring']);
