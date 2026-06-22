import {
  Component, inject, input, signal, computed, output, HostListener, ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon, ThemeService } from '@ng/shared/ui';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from '../core/errors/toast.service';
import { addIcons } from 'ionicons';
import {
  personOutline, shieldOutline, settingsOutline, sunnyOutline, moonOutline,
  terminalOutline, barChartOutline, serverOutline, bugOutline, logOutOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth/auth.service';
import { HOST_IS_LOCAL } from './host';

addIcons({
  personOutline, shieldOutline, settingsOutline, sunnyOutline, moonOutline,
  terminalOutline, barChartOutline, serverOutline, bugOutline, logOutOutline,
});

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
            <button class="menu__item" (click)="go('settings/profile')"><ion-icon name="person-outline"></ion-icon>{{ 'shell.user_menu.profile' | translate }}</button>
            <button class="menu__item" (click)="go('settings/system')"><ion-icon name="settings-outline"></ion-icon>{{ 'shell.user_menu.settings' | translate }}</button>
          </div>

          <div class="menu__sec">
            <button class="menu__item" (click)="toggleTheme()">
              <ion-icon [name]="themeIcon()"></ion-icon>{{ themeLabel() | translate }}
            </button>
            <button class="menu__item" (click)="openPalette.emit(); close()">
              <ion-icon name="terminal-outline"></ion-icon>{{ 'shell.user_menu.command_palette' | translate }}<span class="mono">⌘K</span>
            </button>
          </div>

          @if (showInfra()) {
            <div class="menu__sec">
              <a class="menu__item" [href]="grafanaUrl()" target="_blank" rel="noopener noreferrer">
                <ion-icon name="bar-chart-outline"></ion-icon>{{ 'shell.user_menu.grafana' | translate }}
              </a>
              <a class="menu__item" [href]="influxUrl()" target="_blank" rel="noopener noreferrer">
                <ion-icon name="server-outline"></ion-icon>{{ 'shell.user_menu.influxdb' | translate }}
              </a>
              <button class="menu__item" (click)="debug()">
                <ion-icon name="bug-outline"></ion-icon>{{ 'shell.user_menu.debug' | translate }}
              </button>
            </div>
          }

          @if (showAdmin()) {
            <div class="menu__sec">
              <button class="menu__item" (click)="go('admin')"><ion-icon name="shield-outline"></ion-icon>{{ 'shell.user_menu.admin' | translate }}</button>
            </div>
          }

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
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly hostIsLocal = inject(HOST_IS_LOCAL);

  /** Shell base segment — /app in production, /__shell in dev preview. */
  readonly base = input('/app');

  /** Localhost service URLs (only surfaced on localhost anyway). */
  readonly grafanaUrl = input('http://localhost:3000');
  readonly influxUrl = input('http://localhost:8086');

  readonly openPalette = output<void>();

  protected readonly open = signal(false);

  protected readonly name = computed(() => this.auth.currentUser()?.username ?? 'User');
  protected readonly email = computed(() => this.auth.currentUser()?.email ?? '');
  protected readonly role = computed(() => this.auth.role() ?? 'USER');

  protected readonly showInfra = computed(() => this.role() === 'SUPERADMIN' && this.hostIsLocal);
  protected readonly showAdmin = computed(() => this.role() === 'ADMIN' || this.role() === 'SUPERADMIN');

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

  protected readonly themeIcon = computed(() => this.themeService.theme() === 'dark' ? 'sunny-outline' : 'moon-outline');
  protected readonly themeLabel = computed(() => this.themeService.theme() === 'dark' ? 'shell.theme.light' : 'shell.theme.dark');

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
    this.themeService.setTheme(this.themeService.theme() === 'dark' ? 'light' : 'dark');
  }

  protected debug(): void {
    const u = this.auth.currentUser();
    this.toast.success(`${u?.email ?? 'anon'} · ${this.role()} · localhost`);
    this.close();
  }

  protected async signOut(): Promise<void> {
    this.close();
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
