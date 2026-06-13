import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-settings-hub',
  templateUrl: 'settings-hub.page.html',
  styleUrls: ['settings-hub.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
})
export class SettingsHubPage {
  readonly navItems = [
    { label: 'Profile', path: 'profile' },
    { label: 'Notifications', path: 'notifications' },
    { label: 'Security', path: 'security' },
    { label: 'System', path: 'system' },
  ] as const;
}
