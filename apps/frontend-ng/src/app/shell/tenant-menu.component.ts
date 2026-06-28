import {
  Component, signal, computed, HostListener, ElementRef, inject,
  ChangeDetectionStrategy, viewChild, effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon, BottomSheetComponent } from '@ng/shared/ui';
import { TranslatePipe } from '@ngx-translate/core';
import { IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronDown, peopleOutline, settingsOutline, closeOutline,
  searchOutline, swapHorizontalOutline, eyeOutline,
} from 'ionicons/icons';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@ng/core/auth/auth.service';
import { hasRole } from '@ng/core/auth/roles';
import { AdminStatsService } from '@ng/features/admin/services/admin-stats.service';
import { TenantContextService, CustomerSummary } from '@ng/core/auth/tenant-context.service';
import { Api } from '@ng/core/api/generated/api';
import { listAdminCustomers } from '@ng/core/api/generated/fn/admin/list-admin-customers';

addIcons({ chevronDown, peopleOutline, settingsOutline, closeOutline, searchOutline, swapHorizontalOutline, eyeOutline });

interface Customer { id: string; name: string; status: string; }

@Component({
  selector: 'app-tenant-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, RouterLink, BottomSheetComponent, IonInfiniteScroll, IonInfiniteScrollContent, TranslatePipe],
  template: `
    <div class="tenant-wrap">
      <button class="tenant" [class.tenant--active]="ctx.isActive()" (click)="toggle()" aria-label="Tenant">
        <span class="tenant__logo">{{ logo() }}</span>
        <span class="tenant__main">
          <span class="tenant__name">{{ displayName() }}</span>
          <span class="tenant__meta">
            @if (isSuperAdmin() && ctx.isActive()) {
              <ion-icon name="eye-outline" class="tenant__meta-eye"></ion-icon>{{ 'shell.tenant.acting_as' | translate }}
            } @else {
              {{ isSuperAdmin() ? ('shell.tenant.platform' | translate) : ('shell.tenant.tenant' | translate) }}
            }
          </span>
        </span>
        <ion-icon name="chevron-down" class="tenant__chev" [class.tenant__chev--open]="open()"></ion-icon>
      </button>

      @if (open()) {
        <div class="menu menu--up">

          @if (isSuperAdmin() && ctx.isActive()) {
            <div class="menu__sec menu__banner">
              <span class="banner__label">{{ 'shell.tenant.acting_as' | translate }}</span>
              <span class="banner__name">{{ ctx.customer()!.name }}</span>
              <button class="banner__exit" (click)="exitCustomer()">
                <ion-icon name="close-outline"></ion-icon>
                {{ 'shell.tenant.exit_short' | translate }}
              </button>
            </div>
          }

          <div class="menu__sec menu__info">
            <div class="tenant__title">{{ displayName() }}</div>
            <div class="tenant__tags">
              <span class="badge badge--primary">{{ isSuperAdmin() ? (ctx.isActive() ? ('shell.tenant.customer' | translate) : ('shell.tenant.platform' | translate)) : ('shell.tenant.tenant' | translate) }}</span>
            </div>
            @if (!ctx.isActive()) {
              <div class="tenant__stats">
                <span><b>{{ loading() ? '—' : deviceCount() }}</b> {{ 'shell.tenant.devices' | translate }}</span>
                <span><b>{{ loading() ? '—' : userCount() }}</b> {{ 'shell.tenant.users' | translate }}</span>
              </div>
            }
          </div>

          @if (isSuperAdmin()) {
            <div class="menu__sec">
              <button class="menu__item" (click)="openTenantSheet()">
                <ion-icon name="swap-horizontal-outline"></ion-icon>{{ 'shell.tenant.switch' | translate }}
              </button>
            </div>
          }

          <div class="menu__sec">
            <a class="menu__item" routerLink="admin" (click)="close()"><ion-icon name="people-outline"></ion-icon>{{ 'shell.tenant.manage_users' | translate }}</a>
            <a class="menu__item" routerLink="settings" (click)="close()"><ion-icon name="settings-outline"></ion-icon>{{ 'nav.settings' | translate }}</a>
          </div>
        </div>
      }
    </div>

    @if (isSuperAdmin()) {
      <ui-bottom-sheet #tenantSheet [title]="'shell.tenant.title' | translate" saveLabel="" (willOpen)="onSheetOpen()">
        <div class="tp">
          @if (ctx.isActive()) {
            <div class="tp__banner">
              <span class="tp__banner-label">{{ 'shell.tenant.acting_as' | translate }}</span>
              <span class="tp__banner-name">{{ ctx.customer()!.name }}</span>
              <button class="tp__banner-exit" (click)="exitCustomer()">
                <ion-icon name="close-outline"></ion-icon>
                {{ 'shell.tenant.exit_short' | translate }}
              </button>
            </div>
          }
          <div class="tp__search">
            <ion-icon name="search-outline" class="tp__search-icon"></ion-icon>
            <input class="tp__input" type="text" [placeholder]="'shell.tenant.search_ph' | translate"
                   [value]="tenantSearch()" (input)="onSearchInput($event)">
          </div>
          @if (loadingCustomers() && customers().length === 0) {
            <div class="tp__empty">{{ 'shell.tenant.loading' | translate }}</div>
          } @else if (customers().length === 0) {
            <div class="tp__empty">{{ 'shell.tenant.none' | translate }}</div>
          } @else {
            <div class="tp__list">
              @for (c of customers(); track c.id) {
                <button class="tp__item" [class.tp__item--active]="ctx.customer()?.id === c.id"
                        (click)="selectCustomer(c)">
                  <span class="tp__dot" [class.tp__dot--active]="ctx.customer()?.id === c.id"></span>
                  {{ c.name }}
                </button>
              }
            </div>
            <ion-infinite-scroll [disabled]="!customersHasMore()" (ionInfinite)="loadMore($event)">
              <ion-infinite-scroll-content [loadingText]="'shell.tenant.loading_more' | translate"></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          }
        </div>
      </ui-bottom-sheet>
    }
  `,
  styleUrl: './tenant-menu.component.scss',
})
export class TenantMenuComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly auth = inject(AuthService);
  private readonly stats = inject(AdminStatsService);
  protected readonly ctx = inject(TenantContextService);
  private readonly api = inject(Api);

  protected readonly open = signal(false);
  protected readonly tenantSearch = signal('');
  protected readonly customers = signal<Customer[]>([]);
  protected readonly loadingCustomers = signal(false);
  protected readonly customersHasMore = signal(false);
  private customersPage = 1;

  private readonly tenantSheetRef = viewChild<BottomSheetComponent>('tenantSheet');
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
    if (this.isSuperAdmin()) {
      void this.ctx.hydrate();
    }

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

  protected toggle(): void { this.open.update(o => !o); }
  protected close(): void { this.open.set(false); }

  protected openTenantSheet(): void {
    this.close();
    this.tenantSheetRef()?.open();
  }

  protected onSheetOpen(): void {
    this.tenantSearch.set('');
    this.customersPage = 1;
    this.customers.set([]);
    this.customersHasMore.set(false);
    void this.fetchCustomers();
  }

  protected onSearchInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.tenantSearch.set(v);
    this.searchInput$.next(v);
  }

  protected loadMore(ev: Event): void {
    void this.fetchCustomers(ev);
  }

  private async fetchCustomers(infiniteEvent?: Event): Promise<void> {
    if (this.loadingCustomers()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (infiniteEvent as any)?.target?.complete();
      return;
    }
    this.loadingCustomers.set(true);
    try {
      const raw = await this.api.invoke(listAdminCustomers, {
        limit: 50,
        page: this.customersPage,
        search: this.tenantSearch() || undefined,
      }) as unknown;
      const body = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { data?: Customer[]; pagination?: { total: number } };
      const items: Customer[] = body.data ?? [];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (infiniteEvent as any)?.target?.complete();
    }
  }

  protected async selectCustomer(c: Customer): Promise<void> {
    const summary: CustomerSummary = { id: c.id, name: c.name, status: c.status };
    await this.ctx.set(summary);
    this.tenantSheetRef()?.close();
    this.tenantSearch.set('');
  }

  protected async exitCustomer(): Promise<void> {
    await this.ctx.clear();
    this.close();
    this.tenantSheetRef()?.close();
  }

  @HostListener('document:click', ['$event'])
  protected onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }
}
