import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Tab {
  path: string;
  label: string;
  alertsBadge?: boolean;
}

@Component({
  selector: 'app-device-tab-nav',
  templateUrl: 'device-tab-nav.component.html',
  styleUrls: ['device-tab-nav.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class DeviceTabNavComponent {
  readonly deviceId = input.required<string>();
  readonly openAlertCount = input(0);

  readonly tabs: Tab[] = [
    { path: '', label: 'Overview' },
    { path: 'alerts', label: 'Alerts', alertsBadge: true },
    { path: 'commands', label: 'Commands' },
    { path: 'logs', label: 'Logs' },
    { path: 'network', label: 'Network' },
    { path: 'storage', label: 'Storage' },
  ];
}
