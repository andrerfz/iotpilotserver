import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-org-hub',
  templateUrl: 'org-hub.page.html',
  styleUrl: 'org-hub.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
})
export class OrgHubPage {
  readonly items = [
    { label: 'settings.tabs.thresholds', path: 'thresholds' },
    { label: 'settings.tabs.api_keys',   path: 'api-keys' },
    { label: 'settings.tabs.app_config', path: 'app-config' },
  ] as const;
}
