import { Component, input, output, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon, IonMenuButton, ThemeService } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { chevronForward, search, sunnyOutline, moonOutline } from 'ionicons/icons';

addIcons({ chevronForward, search, sunnyOutline, moonOutline });

/**
 * Topbar — hamburger (narrow widths), route breadcrumbs, a search button that
 * opens the command palette (T11, via the `search` output), and a theme toggle.
 * A [userMenu] slot hosts the user menu / tenant switcher (T10).
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonMenuButton],
  template: `
    <header class="topbar">
      <ion-menu-button class="topbar__menu" menu="shell-menu"></ion-menu-button>

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

      <button class="iconbtn" (click)="toggleTheme()" title="Toggle theme" aria-label="Toggle theme">
        <ion-icon [name]="themeIcon()"></ion-icon>
      </button>

      <ng-content select="[userMenu]"></ng-content>
    </header>
  `,
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly themeService = inject(ThemeService);

  readonly breadcrumbs = input<string[]>([]);
  readonly openSearch = output<void>();

  protected readonly themeIcon = computed(() =>
    this.themeService.theme() === 'dark' ? 'sunny-outline' : 'moon-outline',
  );

  protected toggleTheme(): void {
    this.themeService.setTheme(this.themeService.theme() === 'dark' ? 'light' : 'dark');
  }
}
