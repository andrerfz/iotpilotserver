import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
import {
  BottomSheetComponent,
  IonIcon,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
} from '@ng/shared/ui';
import type { Threshold } from '@ng/core/api/generated/models/threshold';
import type { CreateThresholdPayload } from '../../services/device-detail.service';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';
import { hasSystemMetrics } from '../../device-capabilities';

addIcons({ alertCircleOutline });

interface MetricConfig {
  metricName: string;
  label: string;
  /** Translation key for the display label (the plain `label` is reused as backend threshold name/description). */
  labelKey: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  operator: NonNullable<Threshold['operator']>;
}

const SYSTEM_METRICS: MetricConfig[] = [
  { metricName: 'cpu_usage',     label: 'CPU Usage',     labelKey: 'metrics.cpu_usage',    unit: '%',  min: 0,   max: 100, step: 5, defaultValue: 80, operator: 'GREATER_THAN' },
  { metricName: 'memory_usage',  label: 'Memory Usage',  labelKey: 'metrics.memory_usage', unit: '%',  min: 0,   max: 100, step: 5, defaultValue: 85, operator: 'GREATER_THAN' },
  { metricName: 'temperature',   label: 'Temperature',   labelKey: 'metrics.temperature',  unit: '°C', min: 0,   max: 100, step: 5, defaultValue: 70, operator: 'GREATER_THAN' },
  { metricName: 'disk_usage',    label: 'Disk Usage',    labelKey: 'metrics.disk_usage',   unit: '%',  min: 0,   max: 100, step: 5, defaultValue: 90, operator: 'GREATER_THAN' },
];

const SENSOR_METRICS: MetricConfig[] = [
  { metricName: 'sensor_temp',   label: 'Sensor Temp',   labelKey: 'metrics.sensor_temp',  unit: '°C', min: -20, max: 80,  step: 1, defaultValue: 50, operator: 'GREATER_THAN' },
  { metricName: 'battery',       label: 'Battery Low',   labelKey: 'metrics.battery_low',  unit: '%',  min: 0,   max: 100, step: 5, defaultValue: 20, operator: 'LESS_THAN' },
];

@Component({
  selector: 'app-threshold-config-sheet',
  templateUrl: 'threshold-config-sheet.component.html',
  styleUrls: ['threshold-config-sheet.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    BottomSheetComponent,
    IonIcon,
    IonRange,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonText,
  ],
})
export class ThresholdConfigSheetComponent {
  private readonly svc = inject(DeviceDetailService);
  private readonly toast = inject(ToastService);
  private readonly sheet = viewChild.required(BottomSheetComponent);

  readonly deviceId = input.required<string>();
  readonly deviceType = input<string | undefined>(undefined);

  readonly thresholdsSaved = output<void>();

  protected readonly scope = signal<'device' | 'global'>('device');
  protected readonly values = signal<Record<string, number>>({});
  protected readonly saving = signal(false);

  readonly thresholds = this.svc.thresholds;

  protected readonly activeMetrics = computed(() =>
    hasSystemMetrics(this.deviceType()) ? SYSTEM_METRICS : SENSOR_METRICS,
  );

  protected readonly scopedThresholds = computed(() => {
    const all = this.thresholds.data() ?? [];
    const id = this.deviceId();
    return this.scope() === 'device'
      ? all.filter(t => t.deviceId === id)
      : all.filter(t => t.deviceId == null);
  });

  openSheet(): void {
    this.scope.set('device');
    void this.svc.thresholds.load();
    this.sheet().open();
  }

  onWillOpen(): void {
    void this.svc.thresholds.load().then(() => this.populateValues());
  }

  onScopeChange(val: string): void {
    this.scope.set(val as 'device' | 'global');
    this.populateValues();
  }

  protected getValue(metricName: string): number {
    const v = this.values()[metricName];
    if (v !== undefined) return v;
    const m = [...SYSTEM_METRICS, ...SENSOR_METRICS].find(x => x.metricName === metricName);
    return m?.defaultValue ?? 0;
  }

  protected setValue(metricName: string, raw: number | { lower: number; upper: number }): void {
    const v = typeof raw === 'number' ? raw : raw.lower;
    this.values.update(prev => ({ ...prev, [metricName]: v }));
  }

  async onSave(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    const metrics = this.activeMetrics();
    const existing = this.scopedThresholds();
    const scopeDeviceId = this.scope() === 'device' ? this.deviceId() : null;

    try {
      await Promise.all(metrics.map(async m => {
        const value = this.getValue(m.metricName);
        const found = existing.find(t => t.metricName === m.metricName);
        if (found?.id) {
          await this.svc.updateThreshold(found.id, {
            name: found.name ?? m.label,
            description: found.description ?? '',
            metricName: m.metricName,
            operator: m.operator,
            value,
            unit: m.unit,
            severity: found.severity ?? 'HIGH',
            type: 'STATIC',
            cooldownMinutes: found.cooldownMinutes,
            enabled: found.isEnabled ?? true,
          });
        } else {
          const payload: CreateThresholdPayload = {
            deviceId: scopeDeviceId,
            name: m.label,
            description: `Auto-generated ${m.label} threshold`,
            metricName: m.metricName,
            operator: m.operator,
            value,
            unit: m.unit,
            severity: 'HIGH',
            type: 'STATIC',
            cooldownMinutes: 5,
          };
          await this.svc.createThreshold(payload);
        }
      }));
      void this.toast.success('Thresholds saved');
      this.thresholdsSaved.emit();
      void this.svc.thresholds.load();
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : 'Failed to save thresholds');
    } finally {
      this.saving.set(false);
    }
  }

  protected makePinFormatter(unit: string): (v: number) => string {
    return (v: number) => `${v}${unit}`;
  }

  private populateValues(): void {
    const existing = this.scopedThresholds();
    const newValues: Record<string, number> = {};
    for (const m of this.activeMetrics()) {
      const found = existing.find(t => t.metricName === m.metricName);
      newValues[m.metricName] = found?.value ?? m.defaultValue;
    }
    this.values.set(newValues);
  }
}
