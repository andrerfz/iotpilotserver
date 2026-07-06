import {
  ChangeDetectionStrategy,
  Component,
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  cloudDownloadOutline,
  flashOutline,
  hardwareChipOutline,
  qrCodeOutline,
  bluetoothOutline,
  wifiOutline,
} from 'ionicons/icons';

import {
  BottomSheetComponent,
  DateRangePickerComponent,
  DevicePickerComponent,
  EmptyStateComponent,
  IonCard,
  IonContent,
  IonIcon,
  IonSkeletonText,
  MetricCardComponent,
  MetricGridComponent,
  MultiSelectPickerComponent,
  StatusDotComponent,
  SwipeListComponent,
  UiListRowComponent,
  UiNavSelectComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import type { DevicePickerItem, NavSelectItem, PickerOption, ListRowCol } from '@ng/shared/ui';
import { deviceMetricCols as metricCols, deviceMetricMeta as metricMeta } from '../../device-metrics';
import { hasSystemMetrics, deviceTypeLabel } from '../../device-capabilities';
import type { Device } from '@ng/core/api/generated/models/device';
import type { Alert } from '@ng/core/api/generated/models/alert';
import { AlertsStream } from '@ng/core/realtime/alerts.stream';
import { SocketService } from '@ng/core/realtime/socket.service';
import { DashboardService } from '../../services/dashboard.service';
import { applyDeviceFilters } from '../../filters/device-filters';
import { RegisterDeviceSheetComponent } from '../../components/register-device-sheet/register-device-sheet.component';
import { BleClaimSheetComponent } from '../../components/ble-claim-sheet/ble-claim-sheet.component';
import { TopbarService } from '@ng/shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';

addIcons({
  addOutline,
  cloudDownloadOutline,
  wifiOutline,
  alertCircleOutline,
  hardwareChipOutline,
  flashOutline,
  qrCodeOutline,
  bluetoothOutline,
});

const STATUS_OPTIONS: PickerOption[] = [
  { value: 'ONLINE', label: 'status.online', dot: 'ONLINE' },
  { value: 'OFFLINE', label: 'status.offline', dot: 'OFFLINE' },
  { value: 'MAINTENANCE', label: 'status.maintenance', dot: 'MAINTENANCE' },
  { value: 'ERROR', label: 'severity.error', dot: 'ERROR' },
  { value: 'UNCLAIMED', label: 'status.unclaimed', dot: 'UNCLAIMED' },
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
    MetricGridComponent,
    SwipeListComponent,
    UiListRowComponent,
      StatusDotComponent,
    EmptyStateComponent,
    DevicePickerComponent,
    MultiSelectPickerComponent,
    DateRangePickerComponent,
    UiNavSelectComponent,
    RegisterDeviceSheetComponent,
    BleClaimSheetComponent,
    BottomSheetComponent,
    IonRefresher, IonRefresherContent,
    TranslatePipe,
  ],
})
export class DashboardPage implements ViewWillEnter {
  private readonly dashService = inject(DashboardService);
  private readonly alertsStream = inject(AlertsStream);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly t = inject(TranslateService);

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
  /** Which device type the fleet chart charts. Defaults to the first type
   *  present in the fleet once devices load (see the sync effect below) —
   *  a fleet with only sensor devices should never default to the Pi-only
   *  'cpu_usage' metric, which would just show "no data" forever. */
  readonly chartDeviceType = signal<string | null>(null);

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

  /** Distinct device types actually present in the fleet, as nav-select items. */
  readonly availableDeviceTypeItems = computed<NavSelectItem[]>(() => {
    const types = [...new Set(this._deviceRows().map(d => d.deviceType).filter((t): t is string => !!t))];
    return types.map(t => ({ value: t, label: deviceTypeLabel(t) }));
  });

  /** Pi-like types report cpu_usage (via InfluxDB/Telegraf); everything else
   *  (ESP8266/ESP32/Heltec sensors) only ever reports temperature (via the
   *  Postgres DeviceMetric table) — see monitoring.router.ts's /metrics route. */
  readonly chartMetricName = computed(() => hasSystemMetrics(this.chartDeviceType()) ? 'cpu_usage' : 'temperature');

  readonly chartMetricLabel = computed(() =>
    this.chartMetricName() === 'cpu_usage' ? this.t.instant('dashboard.metric_cpu') : this.t.instant('dashboard.metric_temperature'),
  );

  readonly cpuChartOptions = computed<EChartsOption | null>(() => {
    const m = this.dashService.monitoringMetrics.data();
    if (!m) return null;
    const metricName = this.chartMetricName();
    const series = (m.metrics ?? [])
      .filter(x => x.metricName === metricName)
      .map(x => [x.timestamp ?? '', x.value ?? 0]);
    if (!series.length) return null;
    const isTemperature = metricName === 'temperature';
    return {
      grid: { top: 8, right: 8, bottom: 24, left: 36, containLabel: false },
      xAxis: { type: 'time', axisLabel: { fontSize: 10 } },
      yAxis: isTemperature
        ? { type: 'value', axisLabel: { formatter: '{value}°C', fontSize: 10 } }
        : { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', fontSize: 10 } },
      series: [{ type: 'line', data: series, smooth: true, symbol: 'none',
        lineStyle: { color: 'var(--ion-color-primary)', width: 2 },
        areaStyle: { color: 'color-mix(in srgb, var(--ion-color-primary) 12%, transparent)' } }],
      tooltip: { trigger: 'axis' },
    };
  });

  private readonly registerSheet = viewChild(RegisterDeviceSheetComponent);
  private readonly bleClaimSheet = viewChild(BleClaimSheetComponent);
  private readonly addSheet = viewChild<BottomSheetComponent>('addSheet');

  /** Web Bluetooth present (desktop Chrome/Edge / Electron) → offer the BLE option. */
  protected readonly bleAvailable = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  /** Which add-flow the operator picked; opened after the chooser dismisses. */
  private readonly pendingAdd = signal<'manual' | 'ble' | null>(null);

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

    // Default the fleet chart's device-type filter to the first type present
    // in the fleet (and re-pick if the previously-selected type disappears —
    // e.g. that device was removed) instead of leaving it unset/Pi-only.
    effect(() => {
      const items = this.availableDeviceTypeItems();
      const current = this.chartDeviceType();
      if (items.length === 0) {
        if (current !== null) this.chartDeviceType.set(null);
        return;
      }
      if (!current || !items.some(i => i.value === current)) {
        this.chartDeviceType.set(items[0].value);
      }
    });

    // Re-fetch the fleet chart whenever the selected device type changes.
    effect(() => {
      const type = this.chartDeviceType();
      void this.dashService.monitoringMetrics.load({
        period: this.period() as '1h' | '6h' | '24h' | '7d' | '30d',
        deviceType: type ?? undefined,
      });
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
        .subscribe(() => {
          void this.loadData();
          // Force a metrics reload even if the new tenant happens to share the
          // same selected device-type string — the underlying fleet changed.
          void this.dashService.monitoringMetrics.load({
            period: this.period() as '1h' | '6h' | '24h' | '7d' | '30d',
            deviceType: this.chartDeviceType() ?? undefined,
          });
        });
  }

  ionViewWillEnter(): void {
    this.topbar.set('nav.dashboard', { icon: 'add-outline', handler: () => this.onRegisterDevice() });
    void this.loadData();
  }

  protected onRefresh(ev: Event): void {
    void this.loadData().finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }

  private async loadData(): Promise<void> {
    // monitoringMetrics reloads reactively (see the constructor effect) once
    // devices load and the fleet chart's device-type default is resolved.
    await Promise.allSettled([
      this.dashService.devices.load({}),
      this.dashService.alerts.load({ status: 'active', limit: 5 }),
    ]);
  }

  /** Per-device metrics (shared with the devices list); see device-metrics.ts. */
  protected deviceMetricCols(d: Device): ListRowCol[] {
    return metricCols(d, this.t);
  }

  /** Same metrics flattened for the mobile meta row. */
  protected deviceMeta(d: Device): string[] {
    return metricMeta(d, this.t);
  }

  onPeriodChange(preset: string): void {
    this.period.set(preset);
  }

  onChartDeviceTypeChange(type: string): void {
    this.chartDeviceType.set(type);
  }

  onDeviceRowClick(device: Device): void {
    if (device.id) void this.router.navigate(['/app/devices', device.id]);
  }

  onRegisterDevice(): void {
    this.pendingAdd.set(null);
    this.addSheet()?.open();
  }

  protected chooseManual(): void {
    this.pendingAdd.set('manual');
    this.addSheet()?.close();
  }

  protected chooseBle(): void {
    this.pendingAdd.set('ble');
    this.addSheet()?.close();
  }

  /** After the chooser dismisses, open the picked flow (avoids stacked modals). */
  protected onAddSheetDismiss(): void {
    const choice = this.pendingAdd();
    this.pendingAdd.set(null);
    if (choice === 'manual') this.registerSheet()?.open();
    else if (choice === 'ble') void this.bleClaimSheet()?.open();
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
