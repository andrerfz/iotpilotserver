import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  cloudDownloadOutline,
  flashOutline,
  hardwareChipOutline,
  wifiOutline,
} from 'ionicons/icons';

import {
  DateRangePickerComponent,
  DataTableComponent,
  DevicePickerComponent,
  EmptyStateComponent,
  IonCard,
  IonContent,
  IonIcon,
  IonSkeletonText,
  MetricCardComponent,
  MultiSelectPickerComponent,
  StatusBadgeComponent,
  StatusDotComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import type { ColumnDef, DevicePickerItem, PickerOption } from '@ng/shared/ui';
import type { Device } from '@ng/core/api/generated/models/device';
import type { Alert } from '@ng/core/api/generated/models/alert';
import { AlertsStream } from '@ng/core/realtime/alerts.stream';
import { SocketService } from '@ng/core/realtime/socket.service';
import { DashboardService } from '../../services/dashboard.service';
import { applyDeviceFilters } from '../../filters/device-filters';
import { RegisterDeviceSheetComponent } from '../../components/register-device-sheet/register-device-sheet.component';
import { TopbarService } from '@ng/shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';

addIcons({
  addOutline,
  cloudDownloadOutline,
  wifiOutline,
  alertCircleOutline,
  hardwareChipOutline,
  flashOutline,
});

const STATUS_OPTIONS: PickerOption[] = [
  { value: 'ONLINE', label: 'Online', dot: 'ONLINE' },
  { value: 'OFFLINE', label: 'Offline', dot: 'OFFLINE' },
  { value: 'MAINTENANCE', label: 'Maintenance', dot: 'MAINTENANCE' },
  { value: 'ERROR', label: 'Error', dot: 'ERROR' },
  { value: 'UNCLAIMED', label: 'Unclaimed', dot: 'UNCLAIMED' },
];

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgxEchartsDirective,
    IonContent,
    IonIcon,
    IonCard,
    IonSkeletonText,
    MetricCardComponent,
    DataTableComponent,
    StatusBadgeComponent,
    StatusDotComponent,
    EmptyStateComponent,
    DevicePickerComponent,
    MultiSelectPickerComponent,
    DateRangePickerComponent,
    RegisterDeviceSheetComponent,
    IonRefresher, IonRefresherContent,
  ],
})
export class DashboardPage implements AfterViewInit, ViewWillEnter {
  private readonly dashService = inject(DashboardService);
  private readonly alertsStream = inject(AlertsStream);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);

  // ── Service surfaces (read-only passthrough) ──────────────────────────────
  readonly devicesLoading = this.dashService.devices.loading;
  readonly devicesError = this.dashService.devices.error;
  readonly alertsLoading = this.dashService.alerts.loading;
  readonly metricsLoading = this.dashService.monitoringMetrics.loading;

  // ── Local mutable copies (real-time updates patch these) ─────────────────
  protected readonly _deviceRows = signal<Device[]>([]);
  protected readonly _liveAlerts = signal<Alert[]>([]);

  // ── Filter state ──────────────────────────────────────────────────────────
  readonly devFilter = signal<string[]>([]);
  readonly statusFilter = signal<string[]>([]);
  readonly period = signal<string>('24h');

  // ── Derived / computed ────────────────────────────────────────────────────
  readonly filteredDevices = computed(() =>
    applyDeviceFilters(this._deviceRows(), {
      deviceIds: this.devFilter(),
      status: this.statusFilter(),
    }),
  );

  readonly devicePickerItems = computed<DevicePickerItem[]>(() =>
    this._deviceRows().map(d => ({
      id: d.id ?? '',
      name: d.hostname ?? d.name ?? d.id ?? '',
      status: d.status ?? 'OFFLINE',
      location: d.location ?? undefined,
    })),
  );

  readonly onlineCount = computed(() => this._deviceRows().filter(d => d.status === 'ONLINE').length);
  readonly totalCount = computed(() => this._deviceRows().length);
  readonly openAlertsCount = computed(() => this._liveAlerts().length);
  readonly avgCpu = computed(() => {
    const m = this.dashService.monitoringMetrics.data();
    const cpuMetrics = (m?.metrics ?? []).filter(x => x.metricName === 'cpu_usage' && !x.deviceId);
    if (!cpuMetrics.length) return null;
    const avg = cpuMetrics.reduce((sum, x) => sum + (x.value ?? 0), 0) / cpuMetrics.length;
    return Math.round(avg);
  });

  readonly cpuChartOptions = computed<EChartsOption | null>(() => {
    const m = this.dashService.monitoringMetrics.data();
    if (!m) return null;
    const cpuSeries = (m.metrics ?? [])
      .filter(x => x.metricName === 'cpu_usage')
      .map(x => [x.timestamp ?? '', x.value ?? 0]);
    if (!cpuSeries.length) return null;
    return {
      grid: { top: 8, right: 8, bottom: 24, left: 36, containLabel: false },
      xAxis: { type: 'time', axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', fontSize: 10 } },
      series: [{ type: 'line', data: cpuSeries, smooth: true, symbol: 'none',
        lineStyle: { color: 'var(--ion-color-primary)', width: 2 },
        areaStyle: { color: 'color-mix(in srgb, var(--ion-color-primary) 12%, transparent)' } }],
      tooltip: { trigger: 'axis' },
    };
  });

  // ── DataTable columns (set after view init) ───────────────────────────────
  @ViewChild('deviceCell') private deviceCellTpl!: TemplateRef<{ $implicit: Device }>;
  @ViewChild('statusCell') private statusCellTpl!: TemplateRef<{ $implicit: Device }>;

  private readonly registerSheet = viewChild(RegisterDeviceSheetComponent);
  readonly columns = signal<ColumnDef<Device>[]>([]);

  constructor() {
    // Sync mutable device rows from service when load completes
    effect(() => {
      const d = this.dashService.devices.data();
      if (d !== null) this._deviceRows.set(d);
    });

    // Sync live alerts from service when load completes
    effect(() => {
      const a = this.dashService.alerts.data();
      if (a !== null) this._liveAlerts.set(a);
    });

    // Real-time alert:new → prepend to feed (cap at 5)
    this.alertsStream.alerts$
      .pipe(takeUntilDestroyed())
      .subscribe(alert => {
        this._liveAlerts.update(current => [alert, ...current].slice(0, 5));
      });

    // Real-time device:update → patch matching row status
    this.socketService
      .on<{ deviceId: string; update: Partial<Device> }>('device:update')
      .pipe(takeUntilDestroyed())
      .subscribe(ev => {
        this._deviceRows.update(rows =>
          rows.map(r => r.id === ev.deviceId ? { ...r, ...ev.update } : r),
        );
      });

    toObservable(this.tenantCtx.customer)
        .pipe(skip(1), takeUntilDestroyed())
        .subscribe(() => void this.loadData());
  }

  ionViewWillEnter(): void {
    this.topbar.set('Dashboard', { icon: 'add-outline', handler: () => this.onRegisterDevice() });
    void this.loadData();
  }

  protected onRefresh(ev: Event): void {
    void this.loadData().finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }

  private async loadData(): Promise<void> {
    await Promise.allSettled([
      this.dashService.devices.load({}),
      this.dashService.alerts.load({ status: 'active', limit: 5 }),
      this.dashService.monitoringMetrics.load({ period: this.period() as '1h' | '6h' | '24h' | '7d' | '30d' }),
    ]);
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'hostname', label: 'Device', sortable: true, cellTemplate: this.deviceCellTpl },
      { key: 'status', label: 'Status', sortable: true, cellTemplate: this.statusCellTpl },
      { key: 'location', label: 'Location' },
      { key: 'cpuUsage', label: 'CPU', sortable: true },
      { key: 'lastSeen', label: 'Last seen' },
      { key: '_nav', label: '', width: '40px' },
    ]);
  }

  onPeriodChange(preset: string): void {
    this.period.set(preset);
    void this.dashService.monitoringMetrics.load({ period: preset as '1h' | '6h' | '24h' | '7d' | '30d' });
  }

  onDeviceRowClick(device: Device): void {
    if (device.id) void this.router.navigate(['/app/devices', device.id]);
  }

  onRegisterDevice(): void {
    this.registerSheet()?.open();
  }

  onDeviceClaimed(): void {
    void this.dashService.devices.load({});
  }

  onRetry(): void {
    void this.dashService.devices.load({});
    void this.dashService.alerts.load({ status: 'active', limit: 5 });
  }

  readonly statusOptions = STATUS_OPTIONS;
}
