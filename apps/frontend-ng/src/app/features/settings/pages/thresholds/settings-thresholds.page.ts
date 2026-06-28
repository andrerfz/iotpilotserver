import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonNote,
  IonList,
  IonButton,
  IonIcon,
  IonSpinner,
  UiInputComponent,
} from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { TopbarService } from '@ng/shell/topbar.service';
import { ToastService } from '@ng/core/errors/toast.service';
import { addIcons } from 'ionicons';
import { informationCircleOutline } from 'ionicons/icons';
import { listThresholds } from '@ng/core/api/generated/fn/monitoring/list-thresholds';
import { createThreshold } from '@ng/core/api/generated/fn/monitoring/create-threshold';
import { updateThreshold } from '@ng/core/api/generated/fn/monitoring/update-threshold';
import type { Threshold } from '@ng/core/api/generated/models/threshold';

addIcons({ informationCircleOutline });

interface GlobalMetric {
  metricName: string;
  labelKey: string;
  unit: string;
  operator: NonNullable<Threshold['operator']>;
  name: string;
  defaultValue: number;
}

// Only the metrics the alert evaluator actually uses. These globals apply to every
// device of the tenant that has no per-device override.
const GLOBAL_METRICS: GlobalMetric[] = [
  { metricName: 'sensor_temp', labelKey: 'metrics.sensor_temp', unit: '°C', operator: 'GREATER_THAN', name: 'Sensor Temp', defaultValue: 8 },
  { metricName: 'battery',     labelKey: 'metrics.battery_low', unit: '%',  operator: 'LESS_THAN',    name: 'Battery Low', defaultValue: 20 },
];

/**
 * Tenant-wide default alert thresholds (the global thresholds, deviceId = null).
 * The single, central place to manage the defaults; per-device overrides live in
 * the device's "Umbrales" modal (Alerts tab). ADMIN-only on the backend.
 */
@Component({
  selector: 'app-settings-thresholds',
  templateUrl: 'settings-thresholds.page.html',
  styleUrls: ['settings-thresholds.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonNote,
    IonList,
    IonButton,
    IonIcon,
    IonSpinner,
    UiInputComponent,
    TranslatePipe,
  ],
})
export class SettingsThresholdsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly metrics = GLOBAL_METRICS;
  readonly loading = signal(true);
  readonly saving = signal(false);

  /** Editable value per metric. */
  protected readonly values = signal<Record<string, number>>({});
  /** Existing global threshold row id per metric (for update vs create). */
  private existing: Record<string, Threshold> = {};

  ngOnInit(): void {
    this.topbar.set('settings.tabs.thresholds');
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.invoke(listThresholds, {});
      const all = ((res as { data?: Threshold[] }).data ?? (res as Threshold[]) ?? []);
      const globals = all.filter(t => t.deviceId == null);
      const vals: Record<string, number> = {};
      this.existing = {};
      for (const m of this.metrics) {
        const row = globals.find(t => t.metricName === m.metricName);
        if (row) this.existing[m.metricName] = row;
        vals[m.metricName] = row?.value ?? m.defaultValue;
      }
      this.values.set(vals);
    } finally {
      this.loading.set(false);
    }
  }

  protected getValue(metricName: string): number {
    return this.values()[metricName] ?? 0;
  }

  protected setValue(metricName: string, raw: unknown): void {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    this.values.update(prev => ({ ...prev, [metricName]: n }));
  }

  async onSave(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      for (const m of this.metrics) {
        const value = this.getValue(m.metricName);
        const row = this.existing[m.metricName];
        if (row?.id) {
          await this.api.invoke(updateThreshold, {
            id: row.id,
            body: {
              name: row.name ?? m.name,
              description: row.description ?? '',
              metricName: m.metricName,
              operator: m.operator,
              value,
              unit: m.unit,
              severity: row.severity ?? 'HIGH',
              type: 'STATIC',
              cooldownMinutes: row.cooldownMinutes ?? 5,
              enabled: row.isEnabled ?? true,
            },
          });
        } else {
          await this.api.invoke(createThreshold, {
            body: {
              deviceId: null,
              name: m.name,
              description: `Global ${m.name} threshold`,
              metricName: m.metricName,
              operator: m.operator,
              value,
              unit: m.unit,
              severity: 'HIGH',
              type: 'STATIC',
              cooldownMinutes: 5,
            },
          });
        }
      }
      void this.toast.success(this.t.instant('settings.thresholds.saved'));
      await this.load();
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('settings.thresholds.save_failed'));
    } finally {
      this.saving.set(false);
    }
  }
}
