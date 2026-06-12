import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { constructOutline } from 'ionicons/icons';

addIcons({ constructOutline });

/**
 * Maintenance banner — visibility is driven by `message`: empty hides it, a
 * non-empty string shows the warning bar. The app sets the message from a
 * feature flag / system setting (parity with the legacy banner's condition).
 */
@Component({
  selector: 'ui-maintenance-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    @if (message()) {
      <div class="maint" role="status">
        <ion-icon name="construct-outline"></ion-icon>
        <span>{{ message() }}</span>
      </div>
    }
  `,
  styleUrl: './maintenance-banner.component.scss',
})
export class MaintenanceBannerComponent {
  readonly message = input('');
}
