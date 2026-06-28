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
  IonSpinner,
  IonText,
  IonToggle,
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
  { metricName: 'sensor_temp',   label: 'Sensor Temp',   labelKey: 'metrics.sensor_temp',  unit: '°C', min: -20, max: 80,  step: 1, defaultValue: 8,  operator: 'GREATER_THAN' },
  { metricName: 'battery',       label: 'Battery Low',   labelKey: 'metrics.battery_low',  unit: '%',  min: 0,   max: 100, step: 5, defaultValue: 20, operator: 'LESS_THAN' },
];

/**
 * Per-device alert threshold editor (Alerts tab). Device-scoped only: each metric
 * either uses this device's own override or inherits the tenant default (the global
 * threshold managed in Settings → "Umbrales por defecto", or the built-in default).
 * Toggling "override" off deletes the device's row so it falls back to the global.
 */
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
    IonSpinner,
    IonText,
    IonToggle,
  ],
})
export class ThresholdConfigSheetComponent {
  private readonly svc = inject(DeviceDetailService);
  private readonly toast = inject(ToastService);
  private readonly sheet = viewChild.required(BottomSheetComponent);

  readonly deviceId = input.required<string>();
  readonly deviceType = input<string | undefined>(undefined);

  readonly thresholdsSaved = output<void>();

  /** Per-metric override value (only meaningful when the metric is overridden). */
  protected readonly values = signal<Record<string, number>>({});
  /** Metric names currently overridden for this device. */
  protected readonly overridden = signal<Set<string>>(new Set());
  protected readonly saving = signal(false);

  readonly thresholds = this.svc.thresholds;

  protected readonly activeMetrics = computed(() =>
    hasSystemMetrics(this.deviceType()) ? SYSTEM_METRICS : SENSOR_METRICS,
  );

  private readonly deviceThresholds = computed(() =>
    (this.thresholds.data() ?? []).filter(t => t.deviceId === this.deviceId()),
  );
  private readonly globalThresholds = computed(() =>
    (this.thresholds.data() ?? []).filter(t => t.deviceId == null),
  );

  openSheet(): void {
    void this.svc.thresholds.load();
    this.sheet().open();
  }

  onWillOpen(): void {
    void this.svc.thresholds.load().then(() => this.populateValues());
  }

  protected isOverridden(metricName: string): boolean {
    return this.overridden().has(metricName);
  }

  /** The value inherited when this device has no override: the global row, else the built-in default. */
  protected inheritedValue(metricName: string): number {
    const global = this.globalThresholds().find(t => t.metricName === metricName);
    if (global?.value !== undefined && global.value !== null) return global.value;
    return this.metricConfig(metricName)?.defaultValue ?? 0;
  }

  /** 'global' if a tenant default exists for this metric, otherwise 'default'. */
  protected inheritedSource(metricName: string): 'global' | 'default' {
    return this.globalThresholds().some(t => t.metricName === metricName) ? 'global' : 'default';
  }

  /** Value shown on the slider: the override when set, otherwise the inherited value. */
  protected displayValue(metricName: string): number {
    if (this.isOverridden(metricName)) {
      const v = this.values()[metricName];
      if (v !== undefined) return v;
    }
    return this.inheritedValue(metricName);
  }

  protected toggleOverride(metricName: string, on: boolean): void {
    this.overridden.update(prev => {
      const next = new Set(prev);
      if (on) next.add(metricName); else next.delete(metricName);
      return next;
    });
    if (on && this.values()[metricName] === undefined) {
      this.values.update(prev => ({ ...prev, [metricName]: this.inheritedValue(metricName) }));
    }
  }

  protected setValue(metricName: string, raw: number | { lower: number; upper: number }): void {
    const v = typeof raw === 'number' ? raw : raw.lower;
    this.values.update(prev => ({ ...prev, [metricName]: v }));
  }

  async onSave(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    const metrics = this.activeMetrics();
    const deviceRows = this.deviceThresholds();
    const deviceId = this.deviceId();

    try {
      await Promise.all(metrics.map(async m => {
        const found = deviceRows.find(t => t.metricName === m.metricName);
        const overriding = this.isOverridden(m.metricName);

        if (overriding) {
          const value = this.displayValue(m.metricName);
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
              deviceId,
              name: m.label,
              description: `Per-device ${m.label} threshold`,
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
        } else if (found?.id) {
          // Override turned off → delete the device row so it falls back to the global.
          await this.svc.deleteThreshold(found.id);
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

  private metricConfig(metricName: string): MetricConfig | undefined {
    return [...SYSTEM_METRICS, ...SENSOR_METRICS].find(x => x.metricName === metricName);
  }

  private populateValues(): void {
    const deviceRows = this.deviceThresholds();
    const newValues: Record<string, number> = {};
    const newOverridden = new Set<string>();
    for (const m of this.activeMetrics()) {
      const found = deviceRows.find(t => t.metricName === m.metricName);
      if (found?.value !== undefined && found.value !== null) {
        newOverridden.add(m.metricName);
        newValues[m.metricName] = found.value;
      } else {
        newValues[m.metricName] = this.inheritedValue(m.metricName);
      }
    }
    this.values.set(newValues);
    this.overridden.set(newOverridden);
  }
}
