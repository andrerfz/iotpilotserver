import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TopbarService } from '@ng/shell/topbar.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { alertCircleOutline, copyOutline, eyeOffOutline, eyeOutline, refreshOutline, trashOutline, warningOutline } from 'ionicons/icons';
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
  IonSkeletonText,
  IonSpinner,
  EmptyStateComponent,
  UiInputComponent,
  UiSwitchComponent,
  UiSelectComponent,
} from '@ng/shared/ui';
import type { SelectOption } from '@ng/shared/ui';
import type { DeviceSettings } from '../../services/device-detail.service';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';
import { hasHeartbeat, hasSSH, hasSystemInfo } from '../../device-capabilities';

addIcons({ alertCircleOutline, copyOutline, eyeOffOutline, eyeOutline, refreshOutline, trashOutline, warningOutline });

const UPDATE_CHANNELS: SelectOption[] = [
  { value: 'stable', label: 'Stable' },
  { value: 'beta', label: 'Beta' },
  { value: 'nightly', label: 'Nightly' },
];

const INTERVAL_PRESETS = [
  { label: '+5m',  seconds: 300   },
  { label: '+10m', seconds: 600   },
  { label: '+30m', seconds: 1800  },
  { label: '+1h',  seconds: 3600  },
];

@Component({
  selector: 'app-device-settings',
  templateUrl: 'device-settings.page.html',
  styleUrls: ['device-settings.page.scss'],
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
    IonSkeletonText,
    IonSpinner,
    EmptyStateComponent,
    UiInputComponent,
    UiSwitchComponent,
    UiSelectComponent,
    TranslatePipe,
  ],
})
export class DeviceSettingsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly topbar = inject(TopbarService);
  private readonly svc = inject(DeviceDetailService);

  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  readonly device = this.svc.device;
  readonly settings = this.svc.deviceSettings;

  readonly deviceId = signal('');
  readonly saving = signal(false);
  readonly rotating = signal(false);
  readonly newKey = signal<string | null>(null);
  readonly keyVisible = signal(false);
  readonly deleting = signal(false);
  readonly deleteConfirm = signal(false);

  readonly updateChannels = UPDATE_CHANNELS;
  readonly intervalPresets = INTERVAL_PRESETS;

  // Capability-based visibility
  readonly showHeartbeat   = computed(() => hasHeartbeat(this.device.data()?.deviceType));
  readonly showSSH         = computed(() => hasSSH(this.device.data()?.deviceType));
  readonly showSystemCards = computed(() => hasSystemInfo(this.device.data()?.deviceType));

  // Reporting interval stepper (seconds, sensor devices only)
  readonly reportingIntervalSec = signal(0);

  // Mutable form model — populated once settings load
  formData: DeviceSettings = {};

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);

    effect(() => {
      const s = this.settings.data();
      if (s) {
        this.formData = { ...s };
        this.reportingIntervalSec.set(Number(s.reportingInterval ?? 0));
      }
    });
  }

  ngOnInit(): void {
    this.topbar.set('nav.settings');
    void this.settings.load({ id: this.deviceId() });
  }

  addInterval(seconds: number): void {
    this.reportingIntervalSec.update(v => v + seconds);
  }

  resetInterval(): void {
    this.reportingIntervalSec.set(0);
  }

  formatInterval(totalSeconds: number): string {
    if (!totalSeconds) return '—';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts: string[] = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s) parts.push(`${s}s`);
    return parts.join(' ');
  }

  async onSave(): Promise<void> {
    if (!this.showHeartbeat() && this.reportingIntervalSec() === 0) {
      void this.toast.error('Set a reporting interval before saving.');
      return;
    }
    this.saving.set(true);
    try {
      // Alert thresholds (cpu/memory/disk/temperature/sensorTemp/battery) are no
      // longer set here — they live in the "Umbrales" modal (Alerts tab), the
      // single source of truth read by the alert evaluator.
      const payload: DeviceSettings = {
        ...this.formData,
        heartbeatInterval:    this.toNum(this.formData.heartbeatInterval),
        reportingInterval:    this.reportingIntervalSec(),
        apiKeyRotationDays:   this.toNum(this.formData.apiKeyRotationDays),
      };
      delete payload.cpuThreshold;
      delete payload.memoryThreshold;
      delete payload.diskThreshold;
      delete payload.temperatureThreshold;
      delete payload.sensorTempThreshold;
      delete payload.batteryThreshold;
      await this.svc.updateSettings(this.deviceId(), payload);
      void this.toast.success(this.t.instant('device_settings.msg_saved'));
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_settings.msg_save_failed'));
    } finally {
      this.saving.set(false);
    }
  }

  private toNum(v: unknown): number | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }

  async onRotateKey(): Promise<void> {
    this.rotating.set(true);
    this.newKey.set(null);
    try {
      const res = await this.svc.rotateKey(this.deviceId());
      this.newKey.set(res.apiKey);
      this.keyVisible.set(false);
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_settings.msg_rotate_failed'));
    } finally {
      this.rotating.set(false);
    }
  }

  async copyKey(): Promise<void> {
    const key = this.newKey();
    if (key) await navigator.clipboard.writeText(key);
  }

  toggleKeyVisible(): void {
    this.keyVisible.update(v => !v);
  }

  maskedKey(): string {
    const key = this.newKey();
    if (!key) return '';
    return this.keyVisible() ? key : `${key.slice(0, 8)}••••••••••••••••`;
  }

  onDeleteClick(): void {
    this.deleteConfirm.set(true);
  }

  onDeleteCancel(): void {
    this.deleteConfirm.set(false);
  }

  async onDeleteConfirm(): Promise<void> {
    this.deleting.set(true);
    try {
      await this.svc.deleteDevice(this.deviceId());
      void this.router.navigate(['/app/devices']);
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : 'Delete failed');
      this.deleteConfirm.set(false);
    } finally {
      this.deleting.set(false);
    }
  }
}
