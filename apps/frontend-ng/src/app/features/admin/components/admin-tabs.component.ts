import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { IonIcon } from '@ng/shared/ui';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { hardwareChipOutline, peopleOutline, documentTextOutline, serverOutline, businessOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/auth/auth.service';
import { hasRole } from '../../../core/auth/roles';

addIcons({ hardwareChipOutline, peopleOutline, documentTextOutline, serverOutline, businessOutline });

const ALL_TABS = [
  { label: 'nav.devices',   path: '/app/admin/devices',   icon: 'hardware-chip-outline', superAdminOnly: true },
  { label: 'nav.customers', path: '/app/admin/customers', icon: 'business-outline',      superAdminOnly: true },
  { label: 'nav.users',     path: '/app/admin/users',     icon: 'people-outline' },
  { label: 'nav.logs',      path: '/app/admin/logs',      icon: 'document-text-outline' },
  { label: 'nav.system',    path: '/app/admin/system',    icon: 'server-outline' },
];

@Component({
  selector: 'app-admin-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslatePipe],
  template: `
    <nav class="admin-tabs">
      @for (tab of tabs(); track tab.path) {
        <button class="atab" [class.atab--active]="isActive(tab.path)" (click)="go(tab.path)">
          <ion-icon [name]="tab.icon"></ion-icon>
          <span>{{ tab.label | translate }}</span>
        </button>
      }
    </nav>
  `,
  styleUrl: './admin-tabs.component.scss',
})
export class AdminTabsComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly tabs = computed(() => {
    const isSuperAdmin = hasRole(this.auth.role(), 'SUPERADMIN');
    return ALL_TABS.filter(t => !t.superAdminOnly || isSuperAdmin);
  });

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
