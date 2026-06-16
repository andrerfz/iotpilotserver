import {
  Component, signal, computed, HostListener, ElementRef, inject,
  ChangeDetectionStrategy, effect,
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { IonIcon } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { chevronDown, peopleOutline, settingsOutline, closeOutline, searchOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@ng/core/auth/auth.service';
import { hasRole } from '@ng/core/auth/roles';
import { AdminStatsService } from '@ng/features/admin/services/admin-stats.service';
import { TenantContextService, CustomerSummary } from '@ng/core/auth/tenant-context.service';
import { Api } from '@ng/core/api/generated/api';
import { listAdminCustomers } from '@ng/core/api/generated/fn/admin/list-admin-customers';

addIcons({ chevronDown, peopleOutline, settingsOutline, closeOutline, searchOutline });

interface Customer { id: string; name: string; status: string; }

@Component({
  selector: 'app-tenant-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, RouterLink],
  template: `
    <div class="tenant-wrap">
      <button class="tenant" [class.tenant--active]="ctx.isActive()" (click)="toggle()" aria-label="Tenant">
        <span class="tenant__logo">{{ logo() }}</span>
        <span class="tenant__main">
          <span class="tenant__name">{{ displayName() }}</span>
          <span class="tenant__meta">{{ isSuperAdmin() ? (ctx.isActive() ? 'Acting as customer' : 'Platform') : 'Tenant' }}</span>
        </span>
        <ion-icon name="chevron-down" class="tenant__chev" [class.tenant__chev--open]="open()"></ion-icon>
      </button>

      @if (open()) {
        <div class="menu menu--up">

          @if (isSuperAdmin() && ctx.isActive()) {
            <div class="menu__sec menu__banner">
              <span class="banner__label">Acting as</span>
              <span class="banner__name">{{ ctx.customer()!.name }}</span>
              <button class="banner__exit" (click)="exitCustomer()">
                <ion-icon name="close-outline"></ion-icon>
                Exit
              </button>
            </div>
          }

          <div class="menu__sec menu__info">
            <div class="tenant__title">{{ displayName() }}</div>
            <div class="tenant__tags">
              <span class="badge badge--primary">{{ isSuperAdmin() ? (ctx.isActive() ? 'Customer' : 'Platform') : 'Tenant' }}</span>
            </div>
            @if (!ctx.isActive()) {
              <div class="tenant__stats">
                <span><b>{{ loading() ? '—' : deviceCount() }}</b> devices</span>
                <span><b>{{ loading() ? '—' : userCount() }}</b> users</span>
              </div>
            }
          </div>

          @if (isSuperAdmin()) {
          <div class="menu__sec menu__picker">
            <div class="picker__label">Switch tenant</div>
            <div class="picker__search">
              <ion-icon name="search-outline" class="picker__search-icon"></ion-icon>
              <input class="picker__input" type="text" placeholder="Search customers…"
                     [value]="search()" (input)="onSearchInput($event)">
            </div>
            <div class="picker__list" (scroll)="onPickerScroll($event)">
              @if (loadingCustomers() && customers().length === 0) {
                <div class="picker__empty">Loading…</div>
              } @else if (customers().length === 0) {
                <div class="picker__empty">No customers found</div>
              } @else {
                @for (c of customers(); track c.id) {
                  <button class="picker__item"
                          [class.picker__item--active]="ctx.customer()?.id === c.id"
                          (click)="selectCustomer(c)">
                    <span class="picker__dot" [class.picker__dot--active]="ctx.customer()?.id === c.id"></span>
                    {{ c.name }}
                  </button>
                }
                @if (loadingCustomers()) {
                  <div class="picker__empty">Loading more…</div>
                }
              }
            </div>
          </div>
          }

          <div class="menu__sec">
            <a class="menu__item" routerLink="admin" (click)="close()"><ion-icon name="people-outline"></ion-icon>Manage users</a>
            <a class="menu__item" routerLink="settings" (click)="close()"><ion-icon name="settings-outline"></ion-icon>Settings</a>
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
  private readonly router = inject(Router);
  private readonly stats = inject(AdminStatsService);
  protected readonly ctx = inject(TenantContextService);
  private readonly api = inject(Api);

  protected readonly open = signal(false);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly loadingCustomers = signal(false);
  protected readonly customersHasMore = signal(false);
  protected readonly search = signal('');
  private customersPage = 1;

  private readonly searchInput$ = new Subject<string>();

  protected readonly displayName = computed(() =>
    this.ctx.customer()?.name ?? this.auth.currentUser()?.username ?? 'Platform',
  );
  protected readonly logo = computed(() =>
    this.displayName().split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'P',
  );
  protected readonly deviceCount = computed(() => this.stats.data()?.deviceCount ?? 0);
  protected readonly userCount = computed(() => this.stats.data()?.userCount ?? 0);
  protected readonly loading = computed(() => this.stats.loading());

  protected readonly isSuperAdmin = computed(() => hasRole(this.auth.role(), 'SUPERADMIN'));

  constructor() {
    effect(() => {
      if (!this.stats.data() && !this.stats.loading()) {
        void this.stats.load();
      }
    });

    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.customersPage = 1;
      this.customers.set([]);
      void this.fetchCustomers();
    });
  }

  protected toggle(): void {
    this.open.update(o => !o);
    if (this.open()) {
      this.search.set('');
      this.customersPage = 1;
      this.customers.set([]);
      this.customersHasMore.set(false);
      void this.fetchCustomers();
    }
  }

  protected close(): void { this.open.set(false); }

  protected onSearchInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.search.set(v);
    this.searchInput$.next(v);
  }

  protected onPickerScroll(e: Event): void {
    const el = e.target as HTMLElement;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 30 &&
      this.customersHasMore() &&
      !this.loadingCustomers()
    ) {
      void this.fetchCustomers();
    }
  }

  private async fetchCustomers(): Promise<void> {
    if (this.loadingCustomers()) return;
    this.loadingCustomers.set(true);
    try {
      const res = await this.api.invoke(listAdminCustomers, {
        limit: 50,
        page: this.customersPage,
        search: this.search() || undefined,
      });
      const body = res as unknown as { data?: Customer[]; pagination?: { total: number } };
      const items: Customer[] = body.data ?? (Array.isArray(res) ? (res as Customer[]) : []);
      const total = body.pagination?.total ?? items.length;
      if (this.customersPage === 1) {
        this.customers.set(items);
      } else {
        this.customers.update(prev => [...prev, ...items]);
      }
      this.customersHasMore.set(this.customers().length < total);
      this.customersPage++;
    } finally {
      this.loadingCustomers.set(false);
    }
  }

  protected selectCustomer(c: Customer): void {
    const summary: CustomerSummary = { id: c.id, name: c.name, status: c.status };
    this.ctx.set(summary);
    this.close();
    // Pages react reactively via toObservable(tenantCtx.customer).pipe(skip(1))
  }

  protected exitCustomer(): void {
    this.ctx.clear();
    this.close();
  }

  @HostListener('document:click', ['$event'])
  protected onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }
}
