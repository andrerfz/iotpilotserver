import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { createAnimation } from '@ionic/angular';
import { IonSplitPane, IonMenu, IonContent, IonRouterOutlet, MaintenanceBannerComponent, NetworkStatusComponent } from '@ng/shared/ui';
import { RailComponent } from './rail.component';
import { TopbarComponent } from './topbar.component';
import { UserMenuComponent } from './user-menu.component';
import { TenantMenuComponent } from './tenant-menu.component';
import { BottomNavComponent } from './bottom-nav.component';
import { CommandPaletteComponent, CommandItem } from './command-palette.component';
import { breadcrumbFromSnapshot } from './breadcrumbs';
import { NAV } from './nav';

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
    IonSplitPane, IonMenu, IonContent, IonRouterOutlet,
    RailComponent, TopbarComponent, UserMenuComponent, TenantMenuComponent,
    BottomNavComponent, CommandPaletteComponent,
    MaintenanceBannerComponent, NetworkStatusComponent,
  ],
  template: `
    <ion-split-pane contentId="shell-main" when="(min-width: 1080px)">
      <ion-menu menuId="shell-menu" contentId="shell-main" type="overlay">
        <ion-content class="rail-host">
          <app-rail>
            <app-tenant-menu tenant></app-tenant-menu>
          </app-rail>
        </ion-content>
      </ion-menu>

      <div class="ion-page main" id="shell-main">
        <app-topbar [breadcrumbs]="breadcrumbs()" (openSearch)="onSearch()">
          <app-user-menu userMenu [base]="base()" (openPalette)="onSearch()"></app-user-menu>
        </app-topbar>
        <ui-maintenance-banner [message]="maintenanceMessage()"></ui-maintenance-banner>
        <ui-network-status></ui-network-status>
        <ion-router-outlet [animation]="fadeAnimation"></ion-router-outlet>
        <app-bottom-nav></app-bottom-nav>
      </div>
    </ion-split-pane>

    <app-command-palette [(open)]="paletteOpen" [commands]="commands()"></app-command-palette>
  `,
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);

  readonly breadcrumbs = signal<string[]>([]);
  /** Shell base segment (/app or /__shell) so palette commands stay in-tree. */
  protected readonly base = signal('/app');

  protected readonly fadeAnimation = (
    _baseEl: HTMLElement,
    opts: { enteringEl: HTMLElement; leavingEl: HTMLElement },
  ) => {
    const enter = createAnimation().addElement(opts.enteringEl).duration(180).easing('ease-out').fromTo('opacity', '0', '1');
    const leave = createAnimation().addElement(opts.leavingEl).duration(180).easing('ease-out').fromTo('opacity', '1', '0');
    return createAnimation().addAnimation([enter, leave]);
  };
  protected readonly paletteOpen = signal(false);
  /** Maintenance banner copy; empty hides it. Wired to a system setting later. */
  protected readonly maintenanceMessage = signal('');

  protected readonly commands = computed<CommandItem[]>(() => {
    const b = this.base();
    const out: CommandItem[] = [];
    for (const g of NAV) {
      for (const it of g.items) {
        out.push({ group: 'Navigate', label: it.label, icon: it.icon, route: `${b}/${it.path}` });
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
    };
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(update);
    update();
  }

  protected onSearch(): void {
    this.paletteOpen.set(true);
  }
}
