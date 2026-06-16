import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { IonIcon } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { hardwareChipOutline, peopleOutline, documentTextOutline, serverOutline } from 'ionicons/icons';

addIcons({ hardwareChipOutline, peopleOutline, documentTextOutline, serverOutline });

const TABS = [
  { label: 'Devices', path: '/app/admin/devices', icon: 'hardware-chip-outline' },
  { label: 'Users',   path: '/app/admin/users',   icon: 'people-outline' },
  { label: 'Logs',    path: '/app/admin/logs',     icon: 'document-text-outline' },
  { label: 'System',  path: '/app/admin/system',   icon: 'server-outline' },
];

@Component({
  selector: 'app-admin-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    <nav class="admin-tabs">
      @for (tab of tabs; track tab.path) {
        <button class="atab" [class.atab--active]="isActive(tab.path)" (click)="go(tab.path)">
          <ion-icon [name]="tab.icon"></ion-icon>
          <span>{{ tab.label }}</span>
        </button>
      }
    </nav>
  `,
  styleUrl: './admin-tabs.component.scss',
})
export class AdminTabsComponent {
  private readonly router = inject(Router);

  protected readonly tabs = TABS;

  // Use getCurrentNavigation() for the initial URL so we get the TARGET URL
  // even when the component is created mid-navigation (before NavigationEnd).
  private readonly url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.getCurrentNavigation()?.extractedUrl.toString().split('?')[0] ?? this.router.url },
  );

  protected isActive(path: string): boolean {
    return (this.url() ?? '').startsWith(path);
  }

  protected go(path: string): void {
    if (this.router.url.startsWith(path)) return;
    void this.router.navigateByUrl(path, { replaceUrl: true });
  }
}
