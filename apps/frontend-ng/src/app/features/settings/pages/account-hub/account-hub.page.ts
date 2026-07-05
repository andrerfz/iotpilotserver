import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { UiNavSelectComponent } from '@ng/shared/ui';
import type { NavSelectItem } from '@ng/shared/ui';

const NAV_ITEMS: NavSelectItem[] = [
  { value: 'profile',       label: 'settings.tabs.profile' },
  { value: 'security',      label: 'settings.tabs.security' },
  { value: 'notifications', label: 'settings.tabs.notifications' },
  { value: 'preferences',   label: 'settings.tabs.preferences' },
];

@Component({
  selector: 'app-account-hub',
  templateUrl: 'account-hub.page.html',
  styleUrl: 'account-hub.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, UiNavSelectComponent],
})
export class AccountHubPage {
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
    void this.router.navigate(['/app/settings/account', path]);
  }

  private childPath(): string {
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    // URL shape: /app/settings/account/:child → segments[3] is the child tab
    return segments[3] ?? '';
  }
}
