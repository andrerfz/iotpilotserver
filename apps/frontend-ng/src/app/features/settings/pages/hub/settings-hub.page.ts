import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@ng/core/auth/auth.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { hasRole } from '@ng/core/auth/roles';

interface SettingsItem {
  label: string;
  path: string;
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

  readonly accountItems: readonly SettingsItem[] = [
    { label: 'settings.tabs.profile', path: 'profile' },
    { label: 'settings.tabs.security', path: 'security' },
    { label: 'settings.tabs.notifications', path: 'notifications' },
    { label: 'settings.tabs.preferences', path: 'preferences' },
  ];

  readonly orgItems: readonly SettingsItem[] = [
    { label: 'settings.tabs.thresholds', path: 'thresholds' },
    { label: 'settings.tabs.api_keys', path: 'api-keys' },
    { label: 'settings.tabs.org', path: 'org' },
  ];

  /** Org section requires ADMIN role + an active tenant context. */
  readonly showOrg = computed(
    () => hasRole(this.auth.role(), 'ADMIN') && this.tenant.isActive(),
  );
}
