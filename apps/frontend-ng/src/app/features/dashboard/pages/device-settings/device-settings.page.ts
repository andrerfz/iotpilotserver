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
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { copyOutline, eyeOffOutline, eyeOutline, refreshOutline } from 'ionicons/icons';
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
import { isSensorDevice, hasSSH } from '../../device-capabilities';

addIcons({ copyOutline, eyeOffOutline, eyeOutline, refreshOutline });

const UPDATE_CHANNELS: SelectOption[] = [
  { value: 'stable', label: 'Stable' },
  { value: 'beta', label: 'Beta' },
  { value: 'nightly', label: 'Nightly' },
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
  ],
})
export class DeviceSettingsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(DeviceDetailService);

  readonly device = this.svc.device;
  readonly settings = this.svc.deviceSettings;

  readonly deviceId = signal('');
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly rotating = signal(false);
  readonly newKey = signal<string | null>(null);
  readonly keyVisible = signal(false);

  readonly updateChannels = UPDATE_CHANNELS;
  readonly isSensor = computed(() => isSensorDevice(this.device.data()?.deviceType));
  readonly showSSH = computed(() => hasSSH(this.device.data()?.deviceType));

  // Mutable form model — populated once settings load
  formData: DeviceSettings = {};

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);

    effect(() => {
      const s = this.settings.data();
      if (s) this.formData = { ...s };
    });
  }

  ngOnInit(): void {
    void this.settings.load({ id: this.deviceId() });
  }

  async onSave(): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      const payload: DeviceSettings = {
        ...this.formData,
        heartbeatInterval: this.toNum(this.formData.heartbeatInterval),
        reportingInterval: this.toNum(this.formData.reportingInterval),
        cpuThreshold: this.toNum(this.formData.cpuThreshold),
        memoryThreshold: this.toNum(this.formData.memoryThreshold),
        diskThreshold: this.toNum(this.formData.diskThreshold),
        temperatureThreshold: this.toNum(this.formData.temperatureThreshold),
        sensorTempThreshold: this.toNum(this.formData.sensorTempThreshold),
        batteryThreshold: this.toNum(this.formData.batteryThreshold),
        apiKeyRotationDays: this.toNum(this.formData.apiKeyRotationDays),
      };
      await this.svc.updateSettings(this.deviceId(), payload);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (e) {
      this.saveError.set(e instanceof Error ? e.message : 'Save failed');
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
      this.saveError.set(e instanceof Error ? e.message : 'Rotate failed');
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
}
