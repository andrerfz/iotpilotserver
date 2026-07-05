import { Component, DestroyRef, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, skip } from 'rxjs/operators';
import { Router, NavigationEnd } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IonSplitPane, IonMenu, IonContent, IonRouterOutlet, IonModal, IonButton, MaintenanceBannerComponent, NetworkStatusComponent, MenuController } from '@ng/shared/ui';
import { RailComponent } from './rail.component';
import { TopbarComponent } from './topbar.component';
import { UserMenuComponent } from './user-menu.component';
import { TenantMenuComponent } from './tenant-menu.component';
import { BottomNavComponent } from './bottom-nav.component';
import { CommandPaletteComponent, CommandItem } from './command-palette.component';
import { breadcrumbFromSnapshot } from './breadcrumbs';
import { NAV } from './nav';
import { AuthService } from '../core/auth/auth.service';
import { hasRole } from '../core/auth/roles';
import { SplashService } from '../core/native/splash.service';
import { PushNotificationService } from '../core/native/push-notification.service';
import { IdleTimeoutService } from '../core/auth/idle-timeout.service';

/**
 * App shell — `ion-split-pane` with the rail inline ≥1080px and an overlay
 * drawer (hamburger in the topbar) below. The main column hosts the topbar
 * (breadcrumbs follow the active route) and the routed page outlet.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonSplitPane, IonMenu, IonContent, IonRouterOutlet, IonModal, IonButton,
    RailComponent, TopbarComponent, UserMenuComponent, TenantMenuComponent,
    BottomNavComponent, CommandPaletteComponent,
    MaintenanceBannerComponent, NetworkStatusComponent, TranslatePipe,
  ],
  template: `
    <ion-split-pane contentId="shell-main" when="(min-width: 1080px)">
      <!-- swipeGesture=false: below 1080px the rail must stay hidden (mobile has its
           own bottom-nav + right drawer); only the desktop split-pane shows it inline. -->
      <ion-menu menuId="shell-menu" contentId="shell-main" type="overlay" [swipeGesture]="false">
        <ion-content class="rail-host">
          <app-rail>
            @if (showTenantMenu()) {
              <app-tenant-menu tenant></app-tenant-menu>
            }
          </app-rail>
        </ion-content>
      </ion-menu>

      <div class="ion-page main" id="shell-main">
        <app-topbar [breadcrumbs]="breadcrumbs()" (openSearch)="onSearch()">
          <app-user-menu userMenu [base]="base()"></app-user-menu>
        </app-topbar>
        <ui-maintenance-banner [message]="maintenanceMessage()"></ui-maintenance-banner>
        <ui-network-status></ui-network-status>
        <ion-router-outlet [animated]="false"></ion-router-outlet>
        <app-bottom-nav></app-bottom-nav>
      </div>
    </ion-split-pane>

    <app-command-palette [(open)]="paletteOpen" [commands]="commands()"></app-command-palette>

    <ion-modal [isOpen]="idleTimeout.warningVisible()" [backdropDismiss]="false" class="idle-modal">
      <ng-template>
        <div class="idle-modal__content">
          <h2 class="idle-modal__title">{{ 'shell.idle.title' | translate }}</h2>
          <p class="idle-modal__body">{{ 'shell.idle.body' | translate: { seconds: idleTimeout.secondsRemaining() } }}</p>
          <ion-button expand="block" fill="solid" color="primary" (click)="idleTimeout.stayConnected()">
            {{ 'shell.idle.stay_signed_in' | translate }}
          </ion-button>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly menuCtrl = inject(MenuController);
  private readonly auth = inject(AuthService);
  private readonly splash = inject(SplashService);
  private readonly push = inject(PushNotificationService);
  protected readonly idleTimeout = inject(IdleTimeoutService);

  protected readonly isSuperAdmin = computed(() => hasRole(this.auth.role(), 'SUPERADMIN'));
  protected readonly showTenantMenu = computed(() => hasRole(this.auth.role(), 'SUPERADMIN'));

  readonly breadcrumbs = signal<string[]>([]);
  /** Shell base segment (/app or /__shell) so palette commands stay in-tree. */
  protected readonly base = signal('/app');

  protected readonly paletteOpen = signal(false);
  /** Maintenance banner copy; empty hides it. Wired to a system setting later. */
  protected readonly maintenanceMessage = signal('');

  protected readonly commands = computed<CommandItem[]>(() => {
    const b = this.base();
    const out: CommandItem[] = [];
    for (const g of NAV) {
      for (const it of g.items) {
        out.push({ group: 'shell.palette.navigate', label: it.label, icon: it.icon, route: `${b}/${it.path}` });
      }
    }
    return out;
  });

  constructor() {
    // Walk the global router state (always current on NavigationEnd) — the
    // shell's own ActivatedRoute.snapshot.firstChild can lag when sibling
    // children swap under the persistent shell.
    const update = () => {
      this.breadcrumbs.set(breadcrumbFromSnapshot(this.router.routerState.snapshot.root));
      this.base.set('/' + (this.router.url.split('/')[1] || 'app'));
      void this.menuCtrl.close('shell-menu');
    };
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(update);
    update();

    // Hide splash once the shell is constructed (Angular has bootstrapped).
    void this.splash.hide();

    // Idle auto-logout — armed for the lifetime of the authenticated shell,
    // torn down when it's destroyed (logout navigates away from /app).
    void this.idleTimeout.start();
    inject(DestroyRef).onDestroy(() => this.idleTimeout.stop());

    // Request push permission and register on native platforms (T5).
    void this.push.init();

    // Deeplink routing: navigate to the route embedded in a notification tap (T6).
    toObservable(this.push.latestTap)
      .pipe(skip(1), filter(Boolean), takeUntilDestroyed())
      .subscribe(action => {
        const route = (action.notification.data as { route?: string }).route;
        if (route) void this.router.navigateByUrl(route);
      });
  }

  protected onSearch(): void {
    this.paletteOpen.set(true);
  }
}
