import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  settingsOutline,
} from 'ionicons/icons';

import {
  AlertTrendChartComponent,
  DateRangePickerComponent,
  DevicePickerComponent,
  EmptyStateComponent,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonSkeletonText,
  MetricCardComponent,
  MetricGridComponent,
  MultiSelectPickerComponent,
  SeverityBadgeComponent,
  UiListRowComponent,
  UiSearchFieldComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
  SwipeListComponent,
} from '@ng/shared/ui';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { DevicePickerItem, PickerOption, SwipeAction, DateRangeValue } from '@ng/shared/ui';
import type { Alert } from '@ng/core/api/generated/models/alert';
import { AlertDetailSheetComponent } from '../../components/alert-detail-sheet/alert-detail-sheet.component';
import { DashboardService } from '../../services/dashboard.service';
import { applyAlertFilters, alertState } from '../../filters/alert-filters';
import { TopbarService } from '../../../../shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { ToastService } from '@ng/core/errors/toast.service';

addIcons({ alertCircleOutline, checkmarkCircleOutline, settingsOutline });

const SEVERITY_OPTIONS: PickerOption[] = [
  { value: 'CRITICAL', label: 'severity.critical' },
  { value: 'ERROR', label: 'severity.error' },
  { value: 'WARNING', label: 'severity.warning' },
  { value: 'INFO', label: 'severity.info' },
];

const STATE_OPTIONS: PickerOption[] = [
  { value: 'active', label: 'fields.active' },
  { value: 'acknowledged', label: 'status.acknowledged' },
  { value: 'resolved', label: 'status.resolved' },
];

type TrendPoint = { date?: string; count?: number };

function presetToTimeRange(preset: string): { startTime?: string; endTime?: string } {
  const now = new Date();
  const end = now.toISOString();
  switch (preset) {
    case '1h':  return { startTime: new Date(now.getTime() - 3_600_000).toISOString(), endTime: end };
    case '24h': return { startTime: new Date(now.getTime() - 86_400_000).toISOString(), endTime: end };
    case '7d':  return { startTime: new Date(now.getTime() - 7 * 86_400_000).toISOString(), endTime: end };
    case '30d': return { startTime: new Date(now.getTime() - 30 * 86_400_000).toISOString(), endTime: end };
    default:    return {};
  }
}

@Component({
  selector: 'app-monitoring',
  templateUrl: 'monitoring.page.html',
  styleUrls: ['monitoring.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertTrendChartComponent,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonSkeletonText,
    UiSearchFieldComponent,
    MetricCardComponent,
    MetricGridComponent,
    SeverityBadgeComponent,
    UiListRowComponent,
    EmptyStateComponent,
    DevicePickerComponent,
    MultiSelectPickerComponent,
    DateRangePickerComponent,
    AlertDetailSheetComponent,
    SwipeListComponent,
    IonRefresher, IonRefresherContent,
    TranslatePipe,
  ],
})
export class MonitoringPage implements ViewWillEnter {
  private readonly dashService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  readonly alertsLoading = this.dashService.alerts.loading;
  readonly alertsError = this.dashService.alerts.error;
  readonly trendLoading = this.dashService.alertsTrend.loading;

  protected readonly _liveAlerts = signal<Alert[]>([]);
  protected readonly _trendData = signal<TrendPoint[]>([]);

  readonly search = signal('');
  readonly severityFilter = signal<string[]>([]);
  readonly stateFilter = signal<string[]>([]);
  readonly deviceFilter = signal<string[]>([]);
  readonly period = signal<DateRangeValue>('24h');

  readonly filteredAlerts = computed(() =>
    applyAlertFilters(this._liveAlerts(), {
      search: this.search(),
      severity: this.severityFilter(),
      state: this.stateFilter(),
      deviceIds: this.deviceFilter(),
    }),
  );

  readonly openCount = computed(() =>
    this._liveAlerts().filter(a => !a.resolved && !a.acknowledgedAt).length,
  );
  readonly ackCount = computed(() =>
    this._liveAlerts().filter(a => !a.resolved && !!a.acknowledgedAt).length,
  );
  readonly resolvedCount = computed(() =>
    this._liveAlerts().filter(a => !!a.resolved).length,
  );
  readonly totalCount = computed(() => this._liveAlerts().length);

  readonly devicePickerItems = computed<DevicePickerItem[]>(() =>
    this.dashService.devices.data()?.map(d => ({
      id: d.id ?? '',
      name: d.hostname ?? d.name ?? d.id ?? '',
      status: d.status ?? 'OFFLINE',
      location: d.location ?? undefined,
    })) ?? [],
  );


  constructor() {
    effect(() => {
      const a = this.dashService.alerts.data();
      if (a !== null) this._liveAlerts.set(a);
    });

    effect(() => {
      const t = this.dashService.alertsTrend.data();
      if (t !== null) this._trendData.set(t);
    });

    toObservable(this.tenantCtx.customer)
        .pipe(skip(1), takeUntilDestroyed())
        .subscribe(() => void this.loadData());
  }

  ionViewWillEnter(): void {
    this.topbar.set('nav.monitoring');
    void this.loadData();
  }

  protected onRefresh(ev: Event): void {
    void this.loadData().finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }

  private async loadData(): Promise<void> {
    await Promise.allSettled([
      this.dashService.alerts.load({}),
      this.dashService.alertsTrend.load({ period: '7d' }),
      this.dashService.devices.load({ limit: 50 }),
    ]);
  }

  onPeriodChange(value: DateRangeValue): void {
    this.period.set(value);
    if (typeof value === 'string') {
      void this.dashService.alerts.load(presetToTimeRange(value));
      const trendPeriod: '7d' | '30d' = value === '30d' ? '30d' : '7d';
      void this.dashService.alertsTrend.load({ period: trendPeriod });
      return;
    }
    // Custom range — the alerts endpoint already accepts arbitrary startTime/endTime.
    // The trend chart backend only takes fixed 7d/30d presets, so fall back to 30d
    // as a best-effort approximation for a custom window (not in scope to extend).
    void this.dashService.alerts.load({ startTime: value.start, endTime: value.end });
    void this.dashService.alertsTrend.load({ period: '30d' });
  }

  private readonly detailSheet = viewChild<AlertDetailSheetComponent>('detailSheet');
  readonly actionBusy = signal(false);

  // Swipe actions for per-row acknowledge/resolve.
  protected readonly alertActions: SwipeAction<Alert>[] = [
    { key: 'acknowledge', label: 'alerts.acknowledge', color: 'warning', show: (a) => !a.resolved && !a.acknowledgedAt },
    { key: 'resolve', label: 'alerts.resolve', color: 'success', show: (a) => !a.resolved },
  ];

  onSwipeAction(ev: { key: string; item: Alert }): void {
    void this.onAlertAction(ev.item, ev.key as 'acknowledge' | 'resolve');
  }

  openDetail(alert: Alert): void {
    this.detailSheet()?.open(alert);
  }

  async onAlertAction(alert: Alert, action: 'acknowledge' | 'resolve'): Promise<void> {
    const id = alert.id;
    if (!id) return;
    this.actionBusy.set(true);
    try {
      await this.dashService.batchUpdateAlerts(action, [id]);
      this._liveAlerts.update(rows =>
        rows.map(a => a.id === id
          ? (action === 'resolve'
              ? { ...a, resolved: true, resolvedAt: new Date().toISOString() }
              : { ...a, acknowledgedAt: new Date().toISOString() })
          : a),
      );
      this.detailSheet()?.close();
      void this.toast.success(
        this.t.instant(action === 'resolve' ? 'alerts.msg_resolved' : 'alerts.msg_acknowledged'),
      );
    } catch (e) {
      void this.toast.error(
        e instanceof Error
          ? e.message
          : this.t.instant(action === 'resolve' ? 'alerts.msg_resolve_failed' : 'alerts.msg_ack_failed'),
      );
    } finally {
      this.actionBusy.set(false);
    }
  }

  onRetry(): void {
    void this.dashService.alerts.load({});
  }

  alertStateOf(a: Alert): string {
    return alertState(a);
  }

  deviceName(deviceId: string): string {
    const device = this.dashService.devices.data()?.find(d => d.id === deviceId);
    return device?.hostname ?? device?.name ?? deviceId;
  }

  deviceStatus(deviceId: string): string {
    const device = this.dashService.devices.data()?.find(d => d.id === deviceId);
    return device?.status ?? 'OFFLINE';
  }

  readonly severityOptions = SEVERITY_OPTIONS;
  readonly stateOptions = STATE_OPTIONS;
}
