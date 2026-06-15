import {
  Component, signal, computed, HostListener, ElementRef, inject,
  ChangeDetectionStrategy, effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { chevronDown, peopleOutline, settingsOutline } from 'ionicons/icons';
import { AuthService } from '@ng/core/auth/auth.service';
import { AdminStatsService } from '@ng/features/admin/services/admin-stats.service';

addIcons({ chevronDown, peopleOutline, settingsOutline });

/**
 * Tenant block for the rail footer — prototype `TenantMenu`.
 * SUPERADMIN-only: shows platform-wide device/user counts from AdminStatsService.
 */
@Component({
  selector: 'app-tenant-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, RouterLink],
  template: `
    <div class="tenant-wrap">
      <button class="tenant" (click)="toggle()" aria-label="Tenant">
        <span class="tenant__logo">{{ logo() }}</span>
        <span class="tenant__main">
          <span class="tenant__name">{{ name() }}</span>
          <span class="tenant__meta">Platform</span>
        </span>
        <ion-icon name="chevron-down" class="tenant__chev" [class.tenant__chev--open]="open()"></ion-icon>
      </button>

      @if (open()) {
        <div class="menu menu--up">
          <div class="menu__sec menu__info">
            <div class="tenant__title">{{ name() }}</div>
            <div class="tenant__tags">
              <span class="badge badge--primary">Platform</span>
            </div>
            <div class="tenant__stats">
              <span><b>{{ loading() ? '—' : deviceCount() }}</b> devices</span>
              <span><b>{{ loading() ? '—' : userCount() }}</b> users</span>
            </div>
          </div>
          <div class="menu__sec">
            <a class="menu__item" routerLink="admin" (click)="close()"><ion-icon name="people-outline"></ion-icon>Manage users</a>
            <a class="menu__item" routerLink="settings" (click)="close()"><ion-icon name="settings-outline"></ion-icon>Tenant settings</a>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './tenant-menu.component.scss',
})
export class TenantMenuComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly auth = inject(AuthService);
  private readonly stats = inject(AdminStatsService);

  protected readonly open = signal(false);

  protected readonly name = computed(() =>
    this.auth.currentUser()?.username ?? 'Platform',
  );
  protected readonly logo = computed(() =>
    this.name().split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'P',
  );
  protected readonly deviceCount = computed(() => this.stats.data()?.deviceCount ?? 0);
  protected readonly userCount = computed(() => this.stats.data()?.userCount ?? 0);
  protected readonly loading = computed(() => this.stats.loading());

  constructor() {
    effect(() => {
      if (!this.stats.data() && !this.stats.loading()) {
        void this.stats.load();
      }
    });
  }

  @HostListener('document:click', ['$event'])
  protected onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }

  protected toggle(): void { this.open.update(o => !o); }
  protected close(): void { this.open.set(false); }
}
