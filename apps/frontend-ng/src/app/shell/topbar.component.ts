import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ng/shared/ui';
import { AppLogoComponent } from '@ng/shared/ui';
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
  imports: [IonIcon, AppLogoComponent],
  template: `
    <header class="topbar">
      <ui-app-logo class="topbar__logo"></ui-app-logo>

      <nav class="crumbs">
        @for (c of breadcrumbs(); track $index; let i = $index) {
          @if (i > 0) {
            <span class="crumbs__sep"><ion-icon name="chevron-forward"></ion-icon></span>
          }
          <span class="crumbs__seg" [class.crumbs__seg--current]="i === breadcrumbs().length - 1">{{ c }}</span>
        }
      </nav>

      @if (topbar.title()) {
        <span class="topbar__title">{{ topbar.title() }}</span>
      }

      <button class="searchbtn" (click)="openSearch.emit()">
        <ion-icon name="search"></ion-icon>
        <span class="searchbtn__label">Search devices, alerts, users…</span>
        <kbd>⌘K</kbd>
      </button>

      @if (topbar.action()) {
        <button class="topbar__action" (click)="topbar.action()!.handler()">
          <ion-icon [name]="topbar.action()!.icon"></ion-icon>
        </button>
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
}
