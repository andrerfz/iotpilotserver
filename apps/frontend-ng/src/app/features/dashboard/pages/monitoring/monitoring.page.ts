import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  settingsOutline,
} from 'ionicons/icons';

import {
  DataTableComponent,
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
  MultiSelectPickerComponent,
  SeverityBadgeComponent,
  StatusBadgeComponent,
  StatusDotComponent,
  UiSearchFieldComponent,
} from '@ng/shared/ui';
import type { ColumnDef, DevicePickerItem, PickerOption } from '@ng/shared/ui';
import type { Alert } from '@ng/core/api/generated/models/alert';
import { DashboardService } from '../../services/dashboard.service';
import { applyAlertFilters, alertState } from '../../filters/alert-filters';

addIcons({ alertCircleOutline, checkmarkCircleOutline, settingsOutline });

const SEVERITY_OPTIONS: PickerOption[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'ERROR', label: 'Error' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'INFO', label: 'Info' },
];

const STATE_OPTIONS: PickerOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
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
    NgxEchartsDirective,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonSkeletonText,
    UiSearchFieldComponent,
    MetricCardComponent,
    DataTableComponent,
    SeverityBadgeComponent,
    StatusBadgeComponent,
    StatusDotComponent,
    EmptyStateComponent,
    DevicePickerComponent,
    MultiSelectPickerComponent,
    DateRangePickerComponent,
  ],
})
export class MonitoringPage implements OnInit, AfterViewInit {
  private readonly dashService = inject(DashboardService);
  private readonly router = inject(Router);

  readonly alertsLoading = this.dashService.alerts.loading;
  readonly alertsError = this.dashService.alerts.error;
  readonly trendLoading = this.dashService.alertsTrend.loading;

  protected readonly _liveAlerts = signal<Alert[]>([]);
  protected readonly _trendData = signal<TrendPoint[]>([]);
  protected readonly _selectedIds = signal<string[]>([]);
  protected readonly _bulkBusy = signal(false);

  readonly search = signal('');
  readonly severityFilter = signal<string[]>([]);
  readonly stateFilter = signal<string[]>([]);
  readonly deviceFilter = signal<string[]>([]);
  readonly period = signal<string>('24h');

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
  readonly selectedCount = computed(() => this._selectedIds().length);

  readonly trendChartOptions = computed<EChartsOption | null>(() => {
    const pts = this._trendData();
    if (!pts.length) return null;
    return {
      grid: { top: 8, right: 8, bottom: 24, left: 36, containLabel: false },
      xAxis: { type: 'category', data: pts.map(p => p.date ?? ''), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar',
        data: pts.map(p => p.count ?? 0),
        itemStyle: { color: 'var(--ion-color-warning)' },
      }],
      tooltip: { trigger: 'axis' },
    };
  });

  readonly devicePickerItems = computed<DevicePickerItem[]>(() =>
    this.dashService.devices.data()?.map(d => ({
      id: d.id ?? '',
      name: d.hostname ?? d.name ?? d.id ?? '',
      status: d.status ?? 'OFFLINE',
      location: d.location ?? undefined,
    })) ?? [],
  );

  @ViewChild('severityCell') private severityCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('deviceCell') private deviceCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('stateCell') private stateCellTpl!: TemplateRef<{ $implicit: Alert }>;
  readonly columns = signal<ColumnDef<Alert>[]>([]);

  constructor() {
    effect(() => {
      const a = this.dashService.alerts.data();
      if (a !== null) this._liveAlerts.set(a);
    });

    effect(() => {
      const t = this.dashService.alertsTrend.data();
      if (t !== null) this._trendData.set(t);
    });
  }

  ngOnInit(): void {
    void this.dashService.alerts.load({});
    void this.dashService.alertsTrend.load({ period: '7d' });
    if (!this.dashService.devices.data()) {
      void this.dashService.devices.load({ limit: 50 });
    }
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'severity', label: 'Severity', sortable: true, cellTemplate: this.severityCellTpl },
      { key: 'title', label: 'Alert', sortable: true },
      { key: 'deviceId', label: 'Device', cellTemplate: this.deviceCellTpl },
      { key: 'status', label: 'State', cellTemplate: this.stateCellTpl },
      { key: 'createdAt', label: 'Triggered', sortable: true },
    ]);
  }

  onPeriodChange(preset: string): void {
    this.period.set(preset);
    void this.dashService.alerts.load(presetToTimeRange(preset));
    const trendPeriod: '7d' | '30d' = preset === '30d' ? '30d' : '7d';
    void this.dashService.alertsTrend.load({ period: trendPeriod });
  }

  onSelectionChange(alerts: Alert[]): void {
    this._selectedIds.set(alerts.map(a => a.id ?? ''));
  }

  async onBulkAcknowledge(): Promise<void> {
    const ids = this._selectedIds();
    if (!ids.length) return;
    this._bulkBusy.set(true);
    try {
      await this.dashService.batchUpdateAlerts('acknowledge', ids);
      this._liveAlerts.update(rows =>
        rows.map(a => ids.includes(a.id ?? '') ? { ...a, acknowledgedAt: new Date().toISOString() } : a),
      );
      this._selectedIds.set([]);
    } finally {
      this._bulkBusy.set(false);
    }
  }

  async onBulkResolve(): Promise<void> {
    const ids = this._selectedIds();
    if (!ids.length) return;
    this._bulkBusy.set(true);
    try {
      await this.dashService.batchUpdateAlerts('resolve', ids);
      this._liveAlerts.update(rows =>
        rows.map(a => ids.includes(a.id ?? '') ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a),
      );
      this._selectedIds.set([]);
    } finally {
      this._bulkBusy.set(false);
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
