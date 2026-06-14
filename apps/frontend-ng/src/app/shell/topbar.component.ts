import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ng/shared/ui';
import { AppLogoComponent } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { chevronForward, search } from 'ionicons/icons';

addIcons({ chevronForward, search });

/**
 * Topbar — logo (mobile only), route breadcrumbs, a search button that opens
 * the command palette, and a [userMenu] slot for the avatar dropdown (desktop).
 * Theme toggle lives exclusively in the user-menu dropdown.
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

      <button class="searchbtn" (click)="openSearch.emit()">
        <ion-icon name="search"></ion-icon>
        <span class="searchbtn__label">Search devices, alerts, users…</span>
        <kbd>⌘K</kbd>
      </button>

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
}
