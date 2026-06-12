import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonSplitPane, IonMenu, IonContent, IonRouterOutlet } from '@ng/shared/ui';
import { RailComponent } from './rail.component';
import { TopbarComponent } from './topbar.component';
import { UserMenuComponent } from './user-menu.component';
import { TenantMenuComponent } from './tenant-menu.component';
import { breadcrumbFromSnapshot } from './breadcrumbs';

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
          <app-user-menu userMenu (openPalette)="onSearch()"></app-user-menu>
        </app-topbar>
        <!-- maintenance banner slot — wired in T12 -->
        <ion-router-outlet></ion-router-outlet>
      </div>
    </ion-split-pane>
  `,
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);

  readonly breadcrumbs = signal<string[]>([]);

  constructor() {
    // Walk the global router state (always current on NavigationEnd) — the
    // shell's own ActivatedRoute.snapshot.firstChild can lag when sibling
    // children swap under the persistent shell.
    const update = () => this.breadcrumbs.set(breadcrumbFromSnapshot(this.router.routerState.snapshot.root));
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(update);
    update();
  }

  protected onSearch(): void {
    // Command palette opens here in T11.
  }
}
