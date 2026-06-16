import {
  Component, ChangeDetectionStrategy, signal, computed, HostListener, inject, viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IonIcon, ThemeService, BottomSheetComponent } from '@ng/shared/ui';
import { IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/angular/standalone';
import { AuthService } from '../core/auth/auth.service';
import { hasRole } from '../core/auth/roles';
import { TenantContextService, CustomerSummary } from '../core/auth/tenant-context.service';
import { Api } from '../core/api/generated/api';
import { listAdminCustomers } from '../core/api/generated/fn/admin/list-admin-customers';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  gridOutline, hardwareChipOutline, notificationsOutline, settingsOutline,
  ellipsisHorizontal, documentTextOutline, peopleOutline,
  moonOutline, sunnyOutline, logOutOutline, closeOutline, searchOutline,
} from 'ionicons/icons';

import { NAV, NavItem, PRIMARY_PATHS } from './nav';

addIcons({
  gridOutline, hardwareChipOutline, notificationsOutline, settingsOutline,
  ellipsisHorizontal, documentTextOutline, peopleOutline,
  moonOutline, sunnyOutline, logOutOutline, closeOutline, searchOutline,
});

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IonIcon, BottomSheetComponent, IonInfiniteScroll, IonInfiniteScrollContent],
  template: `
    <!-- Backdrop -->
    <div class="more-backdrop" [class.more-backdrop--open]="open()"
         role="button" tabindex="-1" aria-label="Close menu"
         (click)="close()" (keydown.escape)="close()"></div>

    <!-- Right drawer -->
    <div class="more-drawer" [class.more-drawer--open]="open()">

      @if (secondaryNav.length) {
        <div class="more-section">
          <div class="more-section__label">Navigate</div>
          <div class="more-grid">
            @for (it of secondaryNav; track it.path) {
              <a class="more-tile" [routerLink]="it.path"
                routerLinkActive="more-tile--active" (click)="close()">
                <span class="more-tile__icon"><ion-icon [name]="it.icon"></ion-icon></span>
                <span class="more-tile__label">{{ it.label }}</span>
              </a>
            }
          </div>
        </div>
        <div class="more-sep"></div>
      }

      <div class="more-section">
        <div class="more-section__label">Account</div>
        <div class="more-grid">
          <a class="more-tile" routerLink="settings" routerLinkActive="more-tile--active" (click)="close()">
            <span class="more-tile__icon"><ion-icon name="settings-outline"></ion-icon></span>
            <span class="more-tile__label">Settings</span>
          </a>
          <button class="more-tile" (click)="toggleTheme()">
            <span class="more-tile__icon"><ion-icon [name]="themeIcon()"></ion-icon></span>
            <span class="more-tile__label">{{ themeLabel() }}</span>
          </button>
          <button class="more-tile more-tile--danger" (click)="signOut()">
            <span class="more-tile__icon"><ion-icon name="log-out-outline"></ion-icon></span>
            <span class="more-tile__label">Sign out</span>
          </button>
        </div>
      </div>

      @if (showAdmin()) {
        <div class="more-sep"></div>
        <div class="more-section">
          <div class="more-section__label">Admin</div>
          <div class="more-grid">
            @for (it of adminNav; track it.path) {
              <a class="more-tile" [routerLink]="it.path"
                routerLinkActive="more-tile--active"
                [routerLinkActiveOptions]="{ exact: it.exact ?? false }"
                (click)="close()">
                <span class="more-tile__icon"><ion-icon [name]="it.icon"></ion-icon></span>
                <span class="more-tile__label">{{ it.label }}</span>
              </a>
            }
          </div>
        </div>
      }

      @if (isSuperAdmin()) {
        <div class="more-sep"></div>
        <div class="more-section">
          <div class="more-section__label">Platform</div>
          <div class="more-grid">
            <button class="more-tile" [class.more-tile--active]="ctx.isActive()" (click)="openTenantSheet()">
              <span class="more-tile__icon"><ion-icon name="people-outline"></ion-icon></span>
              <span class="more-tile__label">{{ ctx.isActive() ? ctx.customer()!.name : 'Switch tenant' }}</span>
            </button>
            @if (ctx.isActive()) {
              <button class="more-tile more-tile--danger" (click)="exitTenant()">
                <span class="more-tile__icon"><ion-icon name="close-outline"></ion-icon></span>
                <span class="more-tile__label">Exit tenant</span>
              </button>
            }
          </div>
        </div>
      }
    </div>

    <!-- Bottom bar -->
    <nav class="bnav">
      @for (it of primary; track it.path) {
        <a class="bnav-tab" [routerLink]="it.path" routerLinkActive="bnav-tab--active" (click)="close()"
           [attr.aria-label]="it.label">
          <ion-icon [name]="it.icon"></ion-icon>
        </a>
      }
      <button class="bnav-tab" [class.bnav-tab--active]="open()" (click)="toggle()" aria-label="More">
        <ion-icon name="ellipsis-horizontal"></ion-icon>
      </button>
    </nav>

    <!-- Tenant switcher sheet (SUPERADMIN only) -->
    @if (isSuperAdmin()) {
      <ui-bottom-sheet #tenantSheet title="Switch Tenant" saveLabel=""
        (willOpen)="onSheetOpen()">
        <div class="tp">
          @if (ctx.isActive()) {
            <div class="tp__banner">
              <span class="tp__banner-label">Acting as</span>
              <span class="tp__banner-name">{{ ctx.customer()!.name }}</span>
              <button class="tp__banner-exit" (click)="exitTenant()">
                <ion-icon name="close-outline"></ion-icon>
                Exit
              </button>
            </div>
          }
          <div class="tp__search">
            <ion-icon name="search-outline" class="tp__search-icon"></ion-icon>
            <input class="tp__input" type="text" placeholder="Search customers…"
                   [value]="tenantSearch()" (input)="onSearchInput($event)">
          </div>
          @if (loadingTenants() && tenants().length === 0) {
            <div class="tp__empty">Loading…</div>
          } @else if (tenants().length === 0) {
            <div class="tp__empty">No customers found</div>
          } @else {
            <div class="tp__list">
              @for (c of tenants(); track c.id) {
                <button class="tp__item" [class.tp__item--active]="ctx.customer()?.id === c.id"
                        (click)="selectTenant(c)">
                  <span class="tp__dot" [class.tp__dot--active]="ctx.customer()?.id === c.id"></span>
                  {{ c.name }}
                </button>
              }
            </div>
            <ion-infinite-scroll [disabled]="!tenantsHasMore()" (ionInfinite)="loadMore($event)">
              <ion-infinite-scroll-content loadingText="Loading more…"></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          }
        </div>
      </ui-bottom-sheet>
    }
  `,
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  protected readonly ctx = inject(TenantContextService);
  private readonly api = inject(Api);

  protected readonly open = signal(false);
  protected readonly tenantSearch = signal('');
  protected readonly tenants = signal<CustomerSummary[]>([]);
  protected readonly loadingTenants = signal(false);
  protected readonly tenantsHasMore = signal(false);
  private tenantsPage = 1;

  private readonly searchInput$ = new Subject<string>();

  private readonly tenantSheetRef = viewChild<BottomSheetComponent>('tenantSheet');

  private readonly allItems: NavItem[] = NAV.reduce<NavItem[]>((acc, g) => acc.concat(g.items), []);

  protected readonly primary = this.allItems.filter(it => PRIMARY_PATHS.has(it.path));
  protected readonly secondaryNav = this.allItems.filter(
    it => !PRIMARY_PATHS.has(it.path) && !it.adminOnly && it.path !== 'settings',
  );
  protected readonly adminNav = this.allItems.filter(it => it.adminOnly);

  protected readonly role = computed(() => this.auth.role() ?? 'USER');
  protected readonly showAdmin = computed(() => hasRole(this.role(), 'ADMIN'));
  protected readonly isSuperAdmin = computed(() => hasRole(this.role(), 'SUPERADMIN'));

  protected readonly themeIcon = computed(() =>
    this.themeService.theme() === 'dark' ? 'sunny-outline' : 'moon-outline',
  );
  protected readonly themeLabel = computed(() =>
    this.themeService.theme() === 'dark' ? 'Light mode' : 'Dark mode',
  );

  constructor() {
    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.tenantsPage = 1;
      this.tenants.set([]);
      void this.fetchTenants();
    });
  }

  @HostListener('document:keydown.escape')
  protected onEsc(): void { if (this.open()) this.close(); }

  protected toggle(): void { this.open.update(o => !o); }
  protected close(): void { this.open.set(false); }

  protected openTenantSheet(): void {
    this.close();
    this.tenantSheetRef()?.open();
  }

  protected onSheetOpen(): void {
    this.tenantSearch.set('');
    this.tenantsPage = 1;
    this.tenants.set([]);
    this.tenantsHasMore.set(false);
    void this.fetchTenants();
  }

  protected onSearchInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.tenantSearch.set(v);
    this.searchInput$.next(v);
  }

  protected loadMore(ev: Event): void {
    void this.fetchTenants(ev);
  }

  private async fetchTenants(infiniteEvent?: Event): Promise<void> {
    if (this.loadingTenants()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (infiniteEvent as any)?.target?.complete();
      return;
    }
    this.loadingTenants.set(true);
    try {
      const res = await this.api.invoke(listAdminCustomers, {
        limit: 50,
        page: this.tenantsPage,
        search: this.tenantSearch() || undefined,
      });
      const body = res as unknown as { data?: CustomerSummary[]; pagination?: { total: number } };
      const items: CustomerSummary[] = body.data ?? (Array.isArray(res) ? (res as CustomerSummary[]) : []);
      const total = body.pagination?.total ?? items.length;
      if (this.tenantsPage === 1) {
        this.tenants.set(items);
      } else {
        this.tenants.update(prev => [...prev, ...items]);
      }
      this.tenantsHasMore.set(this.tenants().length < total);
      this.tenantsPage++;
    } finally {
      this.loadingTenants.set(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (infiniteEvent as any)?.target?.complete();
    }
  }

  protected selectTenant(c: CustomerSummary): void {
    this.ctx.set(c);
    this.tenantSheetRef()?.close();
    this.tenantSearch.set('');
    // Pages react reactively via toObservable(tenantCtx.customer).pipe(skip(1))
  }

  protected exitTenant(): void {
    this.ctx.clear();
    this.tenantSheetRef()?.close();
    this.close();
  }

  protected toggleTheme(): void {
    this.themeService.setTheme(this.themeService.theme() === 'dark' ? 'light' : 'dark');
    this.close();
  }

  protected async signOut(): Promise<void> {
    this.close();
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
