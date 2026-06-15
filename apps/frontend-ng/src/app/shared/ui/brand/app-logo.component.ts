import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'ui-app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.logo--v]="layout() === 'v'">
      <img class="brand-mark" [src]="logoSrc()" alt="">
      @if (showText()) {
        <span class="brand-sub">{{ sub() }}</span>
      }
    </span>
  `,
  styleUrl: './app-logo.component.scss',
})
export class AppLogoComponent {
  private readonly theme = inject(ThemeService);

  readonly sub = input('ops console');
  readonly showText = input(true);
  readonly layout = input<'h' | 'v'>('h');

  protected logoSrc() {
    return this.theme.theme() === 'dark'
      ? 'assets/logo-night-halo.png'
      : 'assets/logo.png';
  }
}
