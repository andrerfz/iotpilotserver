import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IonSegment, IonSegmentButton, IonLabel } from '@ng/shared/ui';
import { hasSSH, hasSystemInfo, hasCommands } from '../../device-capabilities';

interface Tab {
  path: string;
  label: string;
  alertsBadge?: boolean;
}

interface Group {
  key: string;
  label: string;
  tabs: Tab[];
}

@Component({
  selector: 'app-device-tab-nav',
  templateUrl: 'device-tab-nav.component.html',
  styleUrls: ['device-tab-nav.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IonSegment, IonSegmentButton, IonLabel],
})
export class DeviceTabNavComponent {
  readonly deviceId = input.required<string>();
  readonly deviceType = input<string>('');
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

  readonly groups = computed<Group[]>(() => {
    const sysInfo = hasSystemInfo(this.deviceType());
    const ssh     = hasSSH(this.deviceType());
    const cmds    = hasCommands(this.deviceType());

    return [
      {
        key: 'monitor',
        label: 'Monitor',
        tabs: [
          { path: '', label: 'Overview' },
          { path: 'metrics', label: 'Metrics' },
          { path: 'alerts', label: 'Alerts', alertsBadge: true },
        ],
      },
      {
        key: 'operate',
        label: 'Operate',
        tabs: [
          ...(cmds ? [{ path: 'commands', label: 'Commands' }] : []),
          { path: 'logs', label: 'Logs' },
          ...(ssh ? [{ path: 'terminal', label: 'Terminal' }] : []),
        ],
      },
      {
        key: 'system',
        label: 'System',
        tabs: [
          ...(sysInfo ? [
            { path: 'network', label: 'Network' },
            { path: 'storage', label: 'Storage' },
          ] : []),
          { path: 'settings', label: 'Settings' },
        ],
      },
    ];
  });

  readonly activeGroupKey = computed(() => {
    const path = this.currentPath();
    for (const group of this.groups()) {
      if (group.tabs.some(t => t.path === path)) return group.key;
    }
    return 'monitor';
  });

  readonly activeTabs = computed(() =>
    this.groups().find(g => g.key === this.activeGroupKey())?.tabs ?? [],
  );

  switchGroup(groupKey: string): void {
    if (groupKey === this.activeGroupKey()) return;
    const group = this.groups().find(g => g.key === groupKey);
    if (!group) return;
    const first = group.tabs[0];
    const id = this.deviceId();
    void this.router.navigate(
      first.path === '' ? ['/app/devices', id] : ['/app/devices', id, first.path],
    );
  }

  private childPath(): string {
    // URL shape: /app/devices/:id[/child]
    // Segment positions: 0=app 1=devices 2=:id 3=child
    // No dependency on deviceId() so this is safe to call at construction time.
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    return segments[3] ?? '';
  }
}
