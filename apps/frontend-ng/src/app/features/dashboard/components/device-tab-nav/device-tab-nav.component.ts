import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { UiNavSelectComponent } from '@ng/shared/ui';
import type { NavSelectItem } from '@ng/shared/ui';
import { hasSSH, hasSystemInfo, hasCommands } from '../../device-capabilities';

@Component({
  selector: 'app-device-tab-nav',
  templateUrl: 'device-tab-nav.component.html',
  styleUrls: ['device-tab-nav.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiNavSelectComponent],
})
export class DeviceTabNavComponent {
  readonly deviceId      = input.required<string>();
  readonly deviceType    = input<string>('');
  readonly openAlertCount = input(0);

  private readonly router = inject(Router);

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.childPath()),
      startWith(this.childPath()),
    ),
    { initialValue: this.childPath() },
  );

  readonly navItems = computed<NavSelectItem[]>(() => {
    const sysInfo    = hasSystemInfo(this.deviceType());
    const ssh        = hasSSH(this.deviceType());
    const cmds       = hasCommands(this.deviceType());
    const alertCount = this.openAlertCount();

    return [
      { value: '',         label: 'nav.overview' },
      { value: 'metrics',  label: 'topbar.metrics' },
      { value: 'alerts',   label: 'topbar.alerts', badge: alertCount > 0 ? alertCount : undefined },
      ...(cmds ? [{ value: 'commands', label: 'topbar.commands' }] : []),
      { value: 'logs',     label: 'nav.logs' },
      ...(ssh ? [{ value: 'terminal', label: 'topbar.terminal' }] : []),
      ...(sysInfo ? [
        { value: 'network',  label: 'device_network.title' },
        { value: 'storage',  label: 'topbar.storage' },
      ] : []),
      { value: 'settings', label: 'nav.settings' },
    ];
  });

  readonly activeValue = computed(() => this.currentPath());

  onTabSelect(path: string): void {
    const id = this.deviceId();
    void this.router.navigate(
      path === '' ? ['/app/devices', id] : ['/app/devices', id, path],
    );
  }

  private childPath(): string {
    // URL shape: /app/devices/:id[/child] → segments[3] is the child (or '' for overview)
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    return segments[3] ?? '';
  }
}
