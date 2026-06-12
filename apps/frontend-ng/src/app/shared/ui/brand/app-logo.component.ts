import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { flash } from 'ionicons/icons';

addIcons({ flash });

/**
 * Brand mark — the prototype's logo (primary square + bolt) with optional
 * wordmark. Used in the rail and on auth pages. `showText=false` renders just
 * the mark.
 */
@Component({
  selector: 'ui-app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    <span class="logo">
      <span class="brand-mark"><ion-icon name="flash"></ion-icon></span>
      @if (showText()) {
        <span class="logo__text">
          <span class="brand-name">{{ name() }}</span>
          <span class="brand-sub">{{ sub() }}</span>
        </span>
      }
    </span>
  `,
  styleUrl: './app-logo.component.scss',
})
export class AppLogoComponent {
  readonly name = input('IoT Pilot');
  readonly sub = input('ops console');
  readonly showText = input(true);
}
