import { Component, input, output, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon, AppLogoComponent, UiActionsMenuComponent } from '@ng/shared/ui';
import type { UiAction } from '@ng/shared/ui';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { chevronForward, search } from 'ionicons/icons';
import { TopbarService } from './topbar.service';

addIcons({ chevronForward, search });

/**
 * Topbar — logo (mobile only), route breadcrumbs, a search button that opens
 * the command palette, and a [userMenu] slot for the avatar dropdown (desktop).
 * On mobile: shows a centered page title and an optional contextual action
 * button set by the current page via TopbarService.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, AppLogoComponent, UiActionsMenuComponent, TranslatePipe],
  template: `
    <header class="topbar">
      <ui-app-logo class="topbar__logo" [size]="32" [showText]="false"></ui-app-logo>

      <nav class="crumbs">
        @for (c of breadcrumbs(); track $index; let i = $index) {
          @if (i > 0) {
            <span class="crumbs__sep"><ion-icon name="chevron-forward"></ion-icon></span>
          }
          <span class="crumbs__seg" [class.crumbs__seg--current]="i === breadcrumbs().length - 1">{{ c | translate }}</span>
        }
      </nav>

      @if (topbar.title()) {
        <span class="topbar__title">{{ topbar.title() | translate }}</span>
      }

      <button class="searchbtn" (click)="openSearch.emit()">
        <ion-icon name="search"></ion-icon>
        <span class="searchbtn__label">{{ 'shell.search' | translate }}</span>
        <kbd>⌘K</kbd>
      </button>

      @if (topbar.action() || topbar.overflowActions().length > 0) {
        <ui-actions-menu
          [primary]="primaryUiAction()"
          [actions]="overflowUiActions()"
        ></ui-actions-menu>
      }

      <div class="topbar__user">
        <ng-content select="[userMenu]"></ng-content>
      </div>
    </header>
  `,
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  readonly breadcrumbs = input<string[]>([]);
  readonly openSearch = output<void>();
  protected readonly topbar = inject(TopbarService);

  protected readonly primaryUiAction = computed<UiAction | null>(() => {
    const a = this.topbar.action();
    return a ? { label: a.label ?? '', icon: a.icon, handler: a.handler } : null;
  });

  protected readonly overflowUiActions = computed<UiAction[]>(() =>
    this.topbar.overflowActions().map(a => ({ label: a.label ?? '', icon: a.icon, handler: a.handler })),
  );
}
