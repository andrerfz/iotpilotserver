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
  /** Visible only to SUPERADMIN role. */
  superAdminOnly?: boolean;
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
    group: 'nav.operate',
    items: [
      { label: 'nav.dashboard', path: 'dashboard', icon: 'grid-outline' },
      { label: 'nav.devices', path: 'devices', icon: 'hardware-chip-outline' },
      { label: 'nav.monitoring', path: 'monitoring', icon: 'notifications-outline' },
      { label: 'nav.logs', path: 'logs', icon: 'document-text-outline', adminOnly: true },
    ],
  },
  {
    group: 'nav.administer',
    items: [
      {
        label: 'nav.overview', path: 'admin', icon: 'stats-chart-outline', exact: true, adminOnly: true,
        children: [
          { label: 'nav.devices', path: 'admin/devices', icon: 'hardware-chip-outline', adminOnly: true, superAdminOnly: true },
          { label: 'nav.users',   path: 'admin/users',   icon: 'people-outline', adminOnly: true },
          { label: 'nav.logs',    path: 'admin/logs',    icon: 'document-text-outline', adminOnly: true },
          { label: 'nav.system',  path: 'admin/system',  icon: 'server-outline', adminOnly: true },
        ],
      },
    ],
  },
];

/** Paths shown as primary tabs in the mobile bottom bar. */
export const PRIMARY_PATHS = new Set(['dashboard', 'devices', 'monitoring']);
