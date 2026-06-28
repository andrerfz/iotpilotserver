import {
  ChangeDetectionStrategy, Component, inject, OnDestroy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { reloadOutline, serverOutline, layersOutline, albumsOutline } from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonProgressBar, IonBadge, IonChip,
  IonList, IonItem, IonLabel, IonSkeletonText,
  EmptyStateComponent,
  ViewWillEnter,
} from '@ng/shared/ui';
import { AdminSystemService } from '../../services/admin-system.service';
import { TopbarService } from '../../../../shell/topbar.service';

addIcons({ reloadOutline, serverOutline, layersOutline, albumsOutline });

@Component({
  selector: 'app-admin-system',
  templateUrl: 'admin-system.page.html',
  styleUrls: ['admin-system.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonProgressBar, IonBadge, IonChip,
    IonList, IonItem, IonLabel, IonSkeletonText,
    EmptyStateComponent,
    TranslatePipe,
  ],
})
export class AdminSystemPage implements OnDestroy, ViewWillEnter {
  protected readonly svc = inject(AdminSystemService);
  private readonly topbar = inject(TopbarService);

  ionViewWillEnter(): void {
    this.topbar.set('nav.system');
    void this.svc.load();
    this.svc.startAutoRefresh(30_000);
  }

  ngOnDestroy(): void {
    this.svc.stopAutoRefresh();
  }

  protected formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  protected formatBytes(bytes: number): string {
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
  }

  protected formatTs(ts: string): string {
    return new Date(ts).toLocaleString();
  }

  protected dbConnPct(db: { connections: { active: number; max: number } }): number {
    return db.connections.max > 0 ? db.connections.active / db.connections.max : 0;
  }

  protected dbColor(db: { connections: { active: number; max: number } }): string {
    const pct = this.dbConnPct(db);
    return pct > 0.8 ? 'danger' : pct > 0.6 ? 'warning' : 'success';
  }

  protected activityIcon(type: string): string {
    const MAP: Record<string, string> = {
      USER_LOGIN: 'person-outline',
      DEVICE_COMMAND: 'hardware-chip-outline',
      ALERT: 'warning-outline',
      SYSTEM: 'server-outline',
    };
    return MAP[type] ?? 'ellipse-outline';
  }
}
