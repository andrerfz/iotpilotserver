import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { hasSSH, isSensorDevice } from '../../device-capabilities';

interface Tab {
  path: string;
  label: string;
  alertsBadge?: boolean;
}

const BASE_TABS: Tab[] = [
  { path: '',         label: 'Overview' },
  { path: 'alerts',  label: 'Alerts', alertsBadge: true },
  { path: 'commands', label: 'Commands' },
  { path: 'logs',    label: 'Logs' },
  { path: 'metrics', label: 'Metrics' },
];

const SYSTEM_TABS: Tab[] = [
  { path: 'network', label: 'Network' },
  { path: 'storage', label: 'Storage' },
];

const TERMINAL_TAB: Tab = { path: 'terminal', label: 'Terminal' };
const SETTINGS_TAB: Tab = { path: 'settings', label: 'Settings' };

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

  readonly tabs = computed<Tab[]>(() => {
    const type = this.deviceType();
    const sensor = isSensorDevice(type);
    const ssh = hasSSH(type);

    const result: Tab[] = [...BASE_TABS];

    if (!sensor) {
      result.push(...SYSTEM_TABS);
      if (ssh) result.push(TERMINAL_TAB);
    }

    result.push(SETTINGS_TAB);
    return result;
  });
}
