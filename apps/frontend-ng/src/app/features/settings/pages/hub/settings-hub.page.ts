import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-hub',
  templateUrl: 'settings-hub.page.html',
  styleUrls: ['settings-hub.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
})
export class SettingsHubPage {
  readonly navItems = [
    { label: 'settings.tabs.profile', path: 'profile' },
    { label: 'settings.tabs.notifications', path: 'notifications' },
    { label: 'settings.tabs.security', path: 'security' },
    { label: 'settings.tabs.system', path: 'system' },
    { label: 'settings.tabs.api_keys', path: 'api-keys' },
    { label: 'settings.tabs.thresholds', path: 'thresholds' },
  ] as const;
}
