import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { hasSSH } from '../../device-capabilities';

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
  readonly deviceType = input<string>('');
  readonly openAlertCount = input(0);

  readonly showTerminal = computed(() => hasSSH(this.deviceType()));

  readonly tabs: Tab[] = [
    { path: '', label: 'Overview' },
    { path: 'alerts', label: 'Alerts', alertsBadge: true },
    { path: 'commands', label: 'Commands' },
    { path: 'logs', label: 'Logs' },
    { path: 'network', label: 'Network' },
    { path: 'storage', label: 'Storage' },
    { path: 'metrics', label: 'Metrics' },
    { path: 'settings', label: 'Settings' },
  ];

  readonly terminalTab: Tab = { path: 'terminal', label: 'Terminal' };
}
