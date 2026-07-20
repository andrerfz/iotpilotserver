import {
  Component, inject, input, signal, computed, HostListener, ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, ThemeService } from '@ng/shared/ui';
import type { Theme } from '@ng/shared/ui/theme/theme.service';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  personOutline, sunnyOutline, moonOutline, contrastOutline, logOutOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth/auth.service';

addIcons({ personOutline, sunnyOutline, moonOutline, contrastOutline, logOutOutline });

/** light -> dark -> system -> light. Matches the 3-way selector in Settings ▸ Preferences. */
const NEXT_THEME: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
const THEME_ICON: Record<Theme, string> = { light: 'sunny-outline', dark: 'moon-outline', system: 'contrast-outline' };

/**
 * User menu — prototype `UserMenu` merged with legacy `user-menu.tsx` behavior.
 * Grafana / InfluxDB / Debug appear ONLY for SUPERADMIN on localhost (acceptance
 * parity). Admin Panel for ADMIN+. Avatar opens an absolute popover (click-out
 * closes). Hosts in the topbar [userMenu] slot.
 */
@Component({
  selector: 'app-user-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslatePipe],
  template: `
    <div class="usermenu">
      <button class="avatar" [style.background]="avatarBg()" [style.color]="avatarFg()"
        [style.borderColor]="avatarBorder()" (click)="toggle()" [attr.aria-label]="'shell.user_menu.aria' | translate">
        {{ initials() }}
      </button>

      @if (open()) {
        <div class="menu">
          <div class="menu__head">
            <span class="av-sm" [style.background]="avatarBg()" [style.color]="avatarFg()"
              [style.borderColor]="avatarBorder()">{{ initials() }}</span>
            <div style="min-width:0">
              <div class="menu__name">{{ name() }}</div>
              <div class="menu__mail">{{ email() }}</div>
            </div>
          </div>

          <div class="menu__sec">
            <button class="menu__item" (click)="go('settings/account/profile')"><ion-icon name="person-outline"></ion-icon>{{ 'shell.user_menu.profile' | translate }}</button>
          </div>

          <div class="menu__sec">
            <button class="menu__item" (click)="toggleTheme()">
              <ion-icon [name]="themeIcon()"></ion-icon>{{ themeLabel() | translate }}
            </button>
          </div>

          <div class="menu__sec">
            <button class="menu__item menu__item--danger" (click)="signOut()">
              <ion-icon name="log-out-outline"></ion-icon>{{ 'shell.user_menu.sign_out' | translate }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Shell base segment — /app in production, /__shell in dev preview. */
  readonly base = input('/app');

  protected readonly open = signal(false);

  protected readonly name = computed(() => this.auth.currentUser()?.username ?? 'User');
  protected readonly email = computed(() => this.auth.currentUser()?.email ?? '');
  protected readonly role = computed(() => this.auth.role() ?? 'USER');

  protected readonly initials = computed(() =>
    this.name().split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'U',
  );
  private readonly hue = computed(() => {
    const n = this.name();
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
    return h;
  });
  protected readonly avatarBg = computed(() => `hsl(${this.hue()} 55% 50% / 0.2)`);
  protected readonly avatarFg = computed(() => `hsl(${this.hue()} 65% 64%)`);
  protected readonly avatarBorder = computed(() => `hsl(${this.hue()} 55% 50% / 0.35)`);

  // Icon/label describe what clicking will switch TO next (light → dark → system → light).
  private readonly nextTheme = computed(() => NEXT_THEME[this.themeService.theme()]);
  protected readonly themeIcon = computed(() => THEME_ICON[this.nextTheme()]);
  protected readonly themeLabel = computed(() => `shell.theme.${this.nextTheme()}`);

  @HostListener('document:click', ['$event'])
  protected onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }

  protected toggle(): void { this.open.update(o => !o); }
  protected close(): void { this.open.set(false); }

  protected go(segment: string): void {
    this.router.navigateByUrl(`${this.base()}/${segment}`);
    this.close();
  }

  protected toggleTheme(): void {
    this.themeService.setTheme(this.nextTheme());
  }

  protected async signOut(): Promise<void> {
    this.close();
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
