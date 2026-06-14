import {
  Component, ChangeDetectionStrategy, signal, computed, HostListener, inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IonIcon, ThemeService } from '@ng/shared/ui';
import { AuthService } from '../core/auth/auth.service';
import { addIcons } from 'ionicons';
import {
  gridOutline, hardwareChipOutline, notificationsOutline, settingsOutline,
  ellipsisHorizontal, documentTextOutline, peopleOutline,
  moonOutline, sunnyOutline, logOutOutline,
} from 'ionicons/icons';
import { NAV, NavItem, PRIMARY_PATHS } from './nav';

addIcons({
  gridOutline, hardwareChipOutline, notificationsOutline, settingsOutline,
  ellipsisHorizontal, documentTextOutline, peopleOutline,
  moonOutline, sunnyOutline, logOutOutline,
});

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IonIcon],
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
                routerLinkActive="more-tile--active" (click)="close()">
                <span class="more-tile__icon"><ion-icon [name]="it.icon"></ion-icon></span>
                <span class="more-tile__label">{{ it.label }}</span>
              </a>
            }
          </div>
        </div>
      }
    </div>

    <!-- Bottom bar -->
    <nav class="bnav">
      @for (it of primary; track it.path) {
        <a class="bnav-tab" [routerLink]="it.path" routerLinkActive="bnav-tab--active">
          <ion-icon [name]="it.icon"></ion-icon>
          <span>{{ it.label }}</span>
        </a>
      }
      <button class="bnav-tab" [class.bnav-tab--active]="open()" (click)="toggle()">
        <ion-icon name="ellipsis-horizontal"></ion-icon>
        <span>More</span>
      </button>
    </nav>
  `,
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly open = signal(false);

  private readonly allItems: NavItem[] = NAV.reduce<NavItem[]>((acc, g) => acc.concat(g.items), []);

  protected readonly primary = this.allItems.filter(it => PRIMARY_PATHS.has(it.path));
  protected readonly secondaryNav = this.allItems.filter(
    it => !PRIMARY_PATHS.has(it.path) && !it.adminOnly && it.path !== 'settings',
  );
  protected readonly adminNav = this.allItems.filter(it => it.adminOnly);

  protected readonly role = computed(() => this.auth.role() ?? 'USER');
  protected readonly showAdmin = computed(() => ['ADMIN', 'SUPERADMIN'].includes(this.role()));

  protected readonly themeIcon = computed(() =>
    this.themeService.theme() === 'dark' ? 'sunny-outline' : 'moon-outline',
  );
  protected readonly themeLabel = computed(() =>
    this.themeService.theme() === 'dark' ? 'Light mode' : 'Dark mode',
  );

  @HostListener('document:keydown.escape')
  protected onEsc(): void { if (this.open()) this.close(); }

  protected toggle(): void { this.open.update(o => !o); }
  protected close(): void { this.open.set(false); }

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
