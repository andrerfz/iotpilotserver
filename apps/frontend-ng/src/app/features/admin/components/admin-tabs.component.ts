import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ng/shared/ui';
import { addIcons } from 'ionicons';
import { hardwareChipOutline, peopleOutline, documentTextOutline, serverOutline } from 'ionicons/icons';

addIcons({ hardwareChipOutline, peopleOutline, documentTextOutline, serverOutline });

@Component({
  selector: 'app-admin-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IonIcon],
  template: `
    <nav class="admin-tabs">
      <a class="atab" routerLink="/app/admin/devices" routerLinkActive="atab--active">
        <ion-icon name="hardware-chip-outline"></ion-icon>
        <span>Devices</span>
      </a>
      <a class="atab" routerLink="/app/admin/users" routerLinkActive="atab--active">
        <ion-icon name="people-outline"></ion-icon>
        <span>Users</span>
      </a>
      <a class="atab" routerLink="/app/admin/logs" routerLinkActive="atab--active">
        <ion-icon name="document-text-outline"></ion-icon>
        <span>Logs</span>
      </a>
      <a class="atab" routerLink="/app/admin/system" routerLinkActive="atab--active">
        <ion-icon name="server-outline"></ion-icon>
        <span>System</span>
      </a>
    </nav>
  `,
  styleUrl: './admin-tabs.component.scss',
})
export class AdminTabsComponent {}
