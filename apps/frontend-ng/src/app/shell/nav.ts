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
  /**
   * Hidden for SUPERADMIN even when they satisfy adminOnly. Used to expose items
   * directly in the ADMIN rail that SUPERADMIN reaches through the Overview parent.
   */
  superAdminExclude?: boolean;
  /**
   * Requires a tenant context. Hidden for a SUPERADMIN until they "act as" a
   * customer (these views 400/are empty without a tenant). Always shown to a
   * regular ADMIN/USER (who always have a tenant).
   */
  tenantScoped?: boolean;
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
      { label: 'nav.dashboard', path: 'dashboard', icon: 'grid-outline', tenantScoped: true },
      { label: 'nav.devices', path: 'devices', icon: 'hardware-chip-outline', tenantScoped: true },
      { label: 'nav.monitoring', path: 'monitoring', icon: 'notifications-outline', tenantScoped: true },
      { label: 'nav.logs', path: 'logs', icon: 'document-text-outline', adminOnly: true, tenantScoped: true },
    ],
  },
  {
    group: 'nav.administer',
    items: [
      // SUPERADMIN: platform overview with all sub-pages as children
      {
        label: 'nav.overview', path: 'admin', icon: 'stats-chart-outline', exact: true, adminOnly: true, superAdminOnly: true,
        children: [
          { label: 'nav.customers', path: 'admin/customers', icon: 'business-outline', superAdminOnly: true },
          { label: 'nav.users',     path: 'users',           icon: 'people-outline',   superAdminOnly: true },
          { label: 'nav.system',    path: 'admin/system',    icon: 'server-outline',   superAdminOnly: true },
        ],
      },
      // ADMIN: direct access (no overview — they have their own dashboard)
      { label: 'nav.users',   path: 'users',        icon: 'people-outline', adminOnly: true, superAdminExclude: true },
      { label: 'nav.system',  path: 'admin/system', icon: 'server-outline', adminOnly: true, superAdminExclude: true },
    ],
  },
];

/** Paths shown as primary tabs in the mobile bottom bar (tenant context). */
export const PRIMARY_PATHS = new Set(['dashboard', 'devices', 'monitoring']);

/**
 * Mobile primary tab(s) for a SUPERADMIN in Platform mode (not acting as a tenant).
 * Just the admin overview — the admin sub-pages (devices/customers/users/logs/system)
 * are navigated by the in-page admin-tabs bar, so we don't duplicate them here. The
 * bottom bar adds a tenant switcher tab for SUPERADMIN (see BottomNavComponent).
 */
export const PLATFORM_PRIMARY: NavItem[] = [
  { label: 'nav.overview', path: 'admin', icon: 'stats-chart-outline', exact: true },
];
