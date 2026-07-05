import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { UiNavSelectComponent } from '@ng/shared/ui';
import type { NavSelectItem } from '@ng/shared/ui';

const NAV_ITEMS: NavSelectItem[] = [
  { value: 'organization', label: 'settings.tabs.organization' },
  { value: 'members',      label: 'settings.tabs.members' },
  { value: 'thresholds',   label: 'settings.tabs.thresholds' },
  { value: 'api-keys',     label: 'settings.tabs.api_keys' },
  { value: 'app-config',   label: 'settings.tabs.app_config' },
];

@Component({
  selector: 'app-org-hub',
  templateUrl: 'org-hub.page.html',
  styleUrl: 'org-hub.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, UiNavSelectComponent],
})
export class OrgHubPage {
  private readonly router = inject(Router);

  readonly navItems = NAV_ITEMS;

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.childPath()),
      startWith(this.childPath()),
    ),
    { initialValue: this.childPath() },
  );

  readonly activeValue = computed(() => this.currentPath());

  onTabSelect(path: string): void {
    void this.router.navigate(['/app/settings/org', path]);
  }

  private childPath(): string {
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    // URL shape: /app/settings/org/:child → segments[3] is the child tab
    return segments[3] ?? '';
  }
}
