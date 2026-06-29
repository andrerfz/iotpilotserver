import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@ng/core/auth/auth.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { hasRole } from '@ng/core/auth/roles';

interface SettingsTab {
  label: string;
  path: string;
  /** When true, hide while a SUPERADMIN is in platform mode (no active customer). */
  tenantScoped?: boolean;
}

@Component({
  selector: 'app-settings-hub',
  templateUrl: 'settings-hub.page.html',
  styleUrls: ['settings-hub.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
})
export class SettingsHubPage {
  private readonly auth = inject(AuthService);
  private readonly tenant = inject(TenantContextService);

  private readonly allTabs: readonly SettingsTab[] = [
    { label: 'settings.tabs.profile', path: 'profile' },
    { label: 'settings.tabs.notifications', path: 'notifications' },
    { label: 'settings.tabs.security', path: 'security' },
    { label: 'settings.tabs.system', path: 'system' },
    { label: 'settings.tabs.api_keys', path: 'api-keys' },
    { label: 'settings.tabs.thresholds', path: 'thresholds', tenantScoped: true },
  ];

  /** Platform-mode SUPERADMIN (no active customer) has no tenant-scoped settings. */
  private readonly platformSuperadmin = computed(
    () => hasRole(this.auth.role(), 'SUPERADMIN') && !this.tenant.isActive(),
  );

  readonly navItems = computed(() =>
    this.allTabs.filter((t) => !(t.tenantScoped && this.platformSuperadmin())),
  );
}
