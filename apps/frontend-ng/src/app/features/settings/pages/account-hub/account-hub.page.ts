import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-account-hub',
  templateUrl: 'account-hub.page.html',
  styleUrl: 'account-hub.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
})
export class AccountHubPage {
  readonly items = [
    { label: 'settings.tabs.profile',       path: 'profile' },
    { label: 'settings.tabs.security',      path: 'security' },
    { label: 'settings.tabs.notifications', path: 'notifications' },
    { label: 'settings.tabs.preferences',   path: 'preferences' },
  ] as const;
}
