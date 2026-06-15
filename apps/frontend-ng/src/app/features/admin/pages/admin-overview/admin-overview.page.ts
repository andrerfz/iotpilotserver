import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  hardwareChipOutline, peopleOutline, documentTextOutline,
  serverOutline, statsChartOutline,
} from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonSkeletonText,
  MetricCardComponent, EmptyStateComponent,
} from '@ng/shared/ui';
import { AdminStatsService } from '../../services/admin-stats.service';
import { TopbarService } from '../../../../shell/topbar.service';
import { AdminTabsComponent } from '../../components/admin-tabs.component';

addIcons({ hardwareChipOutline, peopleOutline, documentTextOutline, serverOutline, statsChartOutline });

@Component({
  selector: 'app-admin-overview',
  templateUrl: 'admin-overview.page.html',
  styleUrls: ['admin-overview.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonSkeletonText,
    MetricCardComponent, EmptyStateComponent,
    AdminTabsComponent,
  ],
})
export class AdminOverviewPage implements OnInit {
  protected readonly svc = inject(AdminStatsService);
  private readonly topbar = inject(TopbarService);
  private readonly destroy = inject(DestroyRef);

  ngOnInit(): void {
    this.topbar.set('Admin');
    void this.svc.load();
  }
}
