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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  IonIcon,
  IonSkeletonText,
  MetricCardComponent,
  EmptyStateComponent,
} from '@ng/shared/ui';
import type { MetricPoint } from '@ng/core/api/generated/models/metric-point';
import { DeviceDetailService } from '../../services/device-detail.service';
import { hasSystemMetrics, hasSensorMetrics } from '../../device-capabilities';
import { formatMetric } from '../../metric-format';

addIcons({ refreshOutline });

const PERIODS = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
];

function lastValue(series: MetricPoint[] | undefined): number | null {
  if (!series?.length) return null;
  return series[series.length - 1].value ?? null;
}

function formatTs(ts: string, period: string): string {
  const d = new Date(ts);
  if (period === '7d') return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildLineChart(
  series: MetricPoint[] | undefined,
  period: string,
  color: string,
  unit: string,
): EChartsOption | null {
  if (!series?.length) return null;
  const data = series.map(p => ({ time: formatTs(p.timestamp!, period), value: Math.round((p.value ?? 0) * 10) / 10 }));
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonIcon,
    IonSkeletonText,
    MetricCardComponent,
    EmptyStateComponent,
  ],
})
export class DeviceMetricsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  private readonly svc = inject(DeviceDetailService);
  private readonly socketService = inject(SocketService);

  private readonly deviceId = signal('');
  readonly metrics = this.svc.deviceMetrics;
  readonly period = signal<'1h' | '6h' | '24h' | '7d'>('24h');
  readonly periods = PERIODS;

  readonly showSystem = computed(() => hasSystemMetrics(this.svc.device.data()?.deviceType));
  readonly showSensor = computed(() => hasSensorMetrics(this.svc.device.data()?.deviceType));
  readonly tempLabel  = computed(() => this.showSystem() ? 'CPU Temp' : 'Sensor Temp');

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

  readonly cpuChart     = computed(() => buildLineChart(this.metricData()['cpu'],           this.period(), '#3880ff', '%'));
  readonly memChart     = computed(() => buildLineChart(this.metricData()['memory'],        this.period(), '#7928ca', '%'));
  readonly diskChart    = computed(() => buildLineChart(this.metricData()['disk'],          this.period(), '#f5a623', '%'));
  readonly tempChart    = computed(() => buildLineChart(this.metricData()['temperature'],   this.period(), '#e53e3e', '°C'));
  readonly batteryChart = computed(() => buildLineChart(this.metricData()['battery_level'], this.period(), '#2dd36f', '%'));

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
    this.topbar.set('Metrics');
    void this.metrics.load({ id: this.deviceId(), period: this.period() });
  }

  onPeriodChange(event: CustomEvent): void {
    const p = event.detail.value as '1h' | '6h' | '24h' | '7d';
    this.period.set(p);
    void this.metrics.load({ id: this.deviceId(), period: p });
  }

  onRefresh(): void {
    void this.metrics.reload();
  }

  readonly formatMetric = formatMetric;
}
