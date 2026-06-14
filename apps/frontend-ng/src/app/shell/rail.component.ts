import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon, AppLogoComponent } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import {
  gridOutline, hardwareChipOutline, notificationsOutline,
  documentTextOutline, peopleOutline, settingsOutline,
} from 'ionicons/icons';
import { NAV } from './nav';

addIcons({
  gridOutline, hardwareChipOutline, notificationsOutline,
  documentTextOutline, peopleOutline, settingsOutline,
});

/**
 * Left rail — brand mark, grouped nav (Operate / Administer) with active state
 * via routerLinkActive and count badges, plus a tenant footer slot ([tenant],
 * filled by T10). Ported from the prototype `.rail`.
 */
@Component({
  selector: 'app-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IonIcon, AppLogoComponent],
  template: `
    <div class="rail">
      <div class="rail__brand">
        <ui-app-logo layout="v"></ui-app-logo>
      </div>

      <div class="rail__scroll">
        @for (g of nav; track g.group) {
          <div class="nav-group">
            <div class="nav-group__label">{{ g.group }}</div>
            @for (it of g.items; track it.path) {
              <a class="nav-item" [routerLink]="it.path" routerLinkActive="nav-item--active">
                <ion-icon [name]="it.icon"></ion-icon>
                <span>{{ it.label }}</span>
                @if (it.badge) {
                  <span class="nav-item__badge">{{ it.badge }}</span>
                }
              </a>
            }
          </div>
        }
      </div>

      <div class="rail__foot">
        <ng-content select="[tenant]"></ng-content>
      </div>
    </div>
  `,
  styleUrl: './rail.component.scss',
})
export class RailComponent {
  protected readonly nav = NAV;
}
