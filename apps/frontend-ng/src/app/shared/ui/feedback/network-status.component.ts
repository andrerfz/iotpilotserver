import { Component, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline } from 'ionicons/icons';

addIcons({ cloudOfflineOutline });

/**
 * Online/offline indicator — shows a banner while the browser reports offline
 * (navigator.onLine + window online/offline events). Renders nothing online.
 */
@Component({
  selector: 'ui-network-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslatePipe],
  template: `
    @if (!online()) {
      <div class="netbar" role="status">
        <ion-icon name="cloud-offline-outline"></ion-icon>
        <span>{{ 'ui.network.offline' | translate }}</span>
      </div>
    }
  `,
  styleUrl: './network-status.component.scss',
})
export class NetworkStatusComponent {
  protected readonly online = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);

  @HostListener('window:online')
  protected onOnline(): void { this.online.set(true); }

  @HostListener('window:offline')
  protected onOffline(): void { this.online.set(false); }
}
