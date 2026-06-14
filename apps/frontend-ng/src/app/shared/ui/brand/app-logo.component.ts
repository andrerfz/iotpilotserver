import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'ui-app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class.logo--v]="layout() === 'v'">
      <img class="brand-mark" src="assets/logo.png" alt="">
      @if (showText()) {
        <span class="brand-sub">{{ sub() }}</span>
      }
    </span>
  `,
  styleUrl: './app-logo.component.scss',
})
export class AppLogoComponent {
  readonly sub = input('ops console');
  readonly showText = input(true);
  readonly layout = input<'h' | 'v'>('h');
}
