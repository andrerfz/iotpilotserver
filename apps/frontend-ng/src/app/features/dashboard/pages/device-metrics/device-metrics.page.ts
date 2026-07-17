import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopbarService } from '@ng/shell/topbar.service';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';
import { SocketService } from '@ng/core/realtime/socket.service';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonSkeletonText,
  MetricCardComponent,
  MetricGridComponent,
  EmptyStateComponent,
  DateRangePickerComponent,
} from '@ng/shared/ui';
import type { MetricPoint } from '@ng/core/api/generated/models/metric-point';
import type { DeviceMetrics } from '@ng/core/api/generated/models/device-metrics';
import type { DateRangePreset, DateRangeValue } from '@ng/shared/ui';
import { DeviceDetailService } from '../../services/device-detail.service';
import { hasSystemMetrics, hasSensorMetrics } from '../../device-capabilities';
import { formatMetric } from '../../metric-format';

addIcons({ refreshOutline });

// Same 1h/6h/24h/7d presets the old fixed segment offered (no 30d — that one's
// Monitoring-specific), now shown inside the shared picker's sheet.
const PERIODS: DateRangePreset[] = [
  { id: '1h', label: 'ui.date_range.last_hour', hint: 'now − 60m' },
  { id: '6h', label: 'ui.date_range.last_6h', hint: 'now − 6h' },
  { id: '24h', label: 'ui.date_range.last_24h', hint: 'now − 24h' },
  { id: '7d', label: 'ui.date_range.last_7d', hint: 'now − 7d' },
];

const PERIOD_SPAN_MS: Record<string, number> = {
  '1h': 3_600_000,
  '6h': 6 * 3_600_000,
  '24h': 24 * 3_600_000,
  '7d': 7 * 86_400_000,
};

/** Custom ranges shorter than this show time-of-day axis labels; longer ones show dates. */
const DATE_LABEL_THRESHOLD_MS = 36 * 3_600_000;

function rangeSpanMs(value: DateRangeValue): number {
  if (typeof value === 'string') return PERIOD_SPAN_MS[value] ?? PERIOD_SPAN_MS['24h'];
  return new Date(value.end).getTime() - new Date(value.start).getTime();
}

function lastValue(series: MetricPoint[] | undefined): number | null {
  if (!series?.length) return null;
  return series[series.length - 1].value ?? null;
}

function formatTs(ts: string, useDateLabels: boolean): string {
  const d = new Date(ts);
  if (useDateLabels) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildLineChart(
  series: MetricPoint[] | undefined,
  useDateLabels: boolean,
  color: string,
  unit: string,
): EChartsOption | null {
  if (!series?.length) return null;
  const data = series.map(p => ({ time: formatTs(p.timestamp!, useDateLabels), value: Math.round((p.value ?? 0) * 10) / 10 }));
  return {
    grid: { top: 8, right: 8, bottom: 24, left: 40, containLabel: false },
    xAxis: { type: 'category', data: data.map(d => d.time), axisLabel: { fontSize: 10 }, boundaryGap: false },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: (v: number) => `${v}${unit}` },
      ...(unit === '%' ? { min: 0, max: 100 } : {}),
    },
    series: [{
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: { color, opacity: 0.08 },
    }],
    tooltip: { trigger: 'axis', formatter: (params: object) => { const p = params as Array<{ axisValue: string; value: number }>; return `${p[0]?.axisValue}<br/>${p[0]?.value}${unit}`; } },
  };
}

function cpuColor(v: number | null): string {
  if (v === null) return 'medium';
  return v > 80 ? 'danger' : v > 60 ? 'warning' : 'success';
}
function memColor(v: number | null): string {
  if (v === null) return 'medium';
  return v > 85 ? 'danger' : v > 70 ? 'warning' : 'success';
}
function diskColor(v: number | null): string {
  if (v === null) return 'medium';
  return v > 90 ? 'danger' : v > 75 ? 'warning' : 'success';
}
function tempColor(v: number | null): string {
  if (v === null) return 'medium';
  return v > 75 ? 'danger' : v > 60 ? 'warning' : 'success';
}
function batteryColor(v: number | null): string {
  if (v === null) return 'medium';
  return v <= 10 ? 'danger' : v <= 20 ? 'warning' : 'success';
}

@Component({
  selector: 'app-device-metrics',
  templateUrl: 'device-metrics.page.html',
  styleUrls: ['device-metrics.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgxEchartsDirective,
    TranslatePipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
    IonSkeletonText,
    MetricCardComponent,
    MetricGridComponent,
    EmptyStateComponent,
    DateRangePickerComponent,
  ],
})
export class DeviceMetricsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  private readonly svc = inject(DeviceDetailService);
  private readonly socketService = inject(SocketService);

  private readonly deviceId = signal('');
  readonly metrics = this.svc.deviceMetrics;
  readonly period = signal<DateRangeValue>('24h');
  readonly periods = PERIODS;
  readonly useDateLabels = computed(() => rangeSpanMs(this.period()) >= DATE_LABEL_THRESHOLD_MS);

  readonly showSystem = computed(() => hasSystemMetrics(this.svc.device.data()?.deviceType));
  readonly showSensor = computed(() => hasSensorMetrics(this.svc.device.data()?.deviceType));
  readonly tempLabel  = computed(() => this.showSystem() ? 'device_metrics.labels.cpu_temp' : 'device_metrics.labels.sensor_temp');

  readonly metricData = computed(() => this.metrics.data()?.metrics ?? {});

  readonly cpuLast     = computed(() => lastValue(this.metricData()['cpu']));
  readonly memLast     = computed(() => lastValue(this.metricData()['memory']));
  readonly diskLast    = computed(() => lastValue(this.metricData()['disk']));
  readonly tempLast    = computed(() => lastValue(this.metricData()['temperature']));
  readonly batteryLast = computed(() => lastValue(this.metricData()['battery_level']));

  readonly cpuIconColor     = computed(() => `var(--ion-color-${cpuColor(this.cpuLast())})`);
  readonly memIconColor     = computed(() => `var(--ion-color-${memColor(this.memLast())})`);
  readonly diskIconColor    = computed(() => `var(--ion-color-${diskColor(this.diskLast())})`);
  readonly tempIconColor    = computed(() => `var(--ion-color-${tempColor(this.tempLast())})`);
  readonly batteryIconColor = computed(() => `var(--ion-color-${batteryColor(this.batteryLast())})`);
  readonly cpuIconBg        = computed(() => `color-mix(in srgb, var(--ion-color-${cpuColor(this.cpuLast())}) 15%, transparent)`);
  readonly memIconBg        = computed(() => `color-mix(in srgb, var(--ion-color-${memColor(this.memLast())}) 15%, transparent)`);
  readonly diskIconBg       = computed(() => `color-mix(in srgb, var(--ion-color-${diskColor(this.diskLast())}) 15%, transparent)`);
  readonly tempIconBg       = computed(() => `color-mix(in srgb, var(--ion-color-${tempColor(this.tempLast())}) 15%, transparent)`);
  readonly batteryIconBg    = computed(() => `color-mix(in srgb, var(--ion-color-${batteryColor(this.batteryLast())}) 15%, transparent)`);

  readonly cpuChart     = computed(() => buildLineChart(this.metricData()['cpu'],           this.useDateLabels(), '#3880ff', '%'));
  readonly memChart     = computed(() => buildLineChart(this.metricData()['memory'],        this.useDateLabels(), '#7928ca', '%'));
  readonly diskChart    = computed(() => buildLineChart(this.metricData()['disk'],          this.useDateLabels(), '#f5a623', '%'));
  readonly tempChart    = computed(() => buildLineChart(this.metricData()['temperature'],   this.useDateLabels(), '#e53e3e', '°C'));
  readonly batteryChart = computed(() => buildLineChart(this.metricData()['battery_level'], this.useDateLabels(), '#2dd36f', '%'));

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);

    // Auto-reload metrics when the backend pushes a device:update event
    // (fired each time the device successfully delivers a data payload).
    this.socketService
      .on<{ deviceId: string }>('device:update')
      .pipe(takeUntilDestroyed())
      .subscribe((ev) => {
        if (ev.deviceId === this.deviceId()) {
          void this.metrics.reload();
        }
      });
  }

  ngOnInit(): void {
    this.topbar.set('topbar.metrics');
    void this.loadMetrics(this.period());
  }

  onRangeChange(value: DateRangeValue): void {
    this.period.set(value);
    void this.loadMetrics(value);
  }

  private loadMetrics(value: DateRangeValue): Promise<DeviceMetrics | null> {
    return typeof value === 'string'
      ? this.metrics.load({ id: this.deviceId(), period: value })
      : this.metrics.load({ id: this.deviceId(), startTime: value.start, endTime: value.end });
  }

  onRefresh(): void {
    void this.metrics.reload();
  }

  readonly formatMetric = formatMetric;
}
