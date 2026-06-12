import {
  Component, input, signal, computed, HostListener, ElementRef, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { chevronDown, peopleOutline, settingsOutline } from 'ionicons/icons';

addIcons({ chevronDown, peopleOutline, settingsOutline });

/**
 * Tenant block for the rail footer — prototype `TenantMenu`, display-only v1
 * (multi-tenant switching is a deferred backend question). Shows the tenant
 * name + plan · region, with a popover of stats and tenant nav. Tenant data is
 * supplied via inputs (wired to customer data later).
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
          <span class="tenant__meta">{{ plan() }} · {{ region() }}</span>
        </span>
        <ion-icon name="chevron-down" class="tenant__chev" [class.tenant__chev--open]="open()"></ion-icon>
      </button>

      @if (open()) {
        <div class="menu menu--up">
          <div class="menu__sec menu__info">
            <div class="tenant__title">{{ name() }}</div>
            <div class="tenant__tags">
              <span class="badge badge--primary">{{ plan() }}</span>
              <span class="mono dim">{{ region() }}</span>
            </div>
            <div class="tenant__stats">
              <span><b>{{ deviceCount() }}</b> devices</span>
              <span><b>{{ userCount() }}</b> users</span>
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

  readonly name = input('Acme Corp');
  readonly plan = input('Pro');
  readonly region = input('EU-West');
  readonly deviceCount = input(0);
  readonly userCount = input(0);

  protected readonly open = signal(false);
  protected readonly logo = computed(() =>
    this.name().split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'T',
  );

  @HostListener('document:click', ['$event'])
  protected onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }

  protected toggle(): void { this.open.update(o => !o); }
  protected close(): void { this.open.set(false); }
}
