import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  hardwareChipOutline, peopleOutline, documentTextOutline,
  serverOutline, statsChartOutline,
} from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonSkeletonText,
  MetricCardComponent, EmptyStateComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import { AdminStatsService } from '../../services/admin-stats.service';
import { TopbarService } from '../../../../shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
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
    IonRefresher, IonRefresherContent,
  ],
})
export class AdminOverviewPage implements OnInit, ViewWillEnter {
  protected readonly svc = inject(AdminStatsService);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    toObservable(this.tenantCtx.customer)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => void this.svc.load());
  }

  ngOnInit(): void {
    this.topbar.set('Admin');
  }

  ionViewWillEnter(): void {
    void this.svc.load();
  }

  protected onRefresh(ev: Event): void {
    void this.svc.load().finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }
}
