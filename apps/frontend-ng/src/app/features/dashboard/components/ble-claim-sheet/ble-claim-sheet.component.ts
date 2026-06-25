import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { bluetoothOutline, checkmarkOutline, hardwareChipOutline } from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';
import {
  BottomSheetComponent,
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  UiSelectComponent,
} from '@ng/shared/ui';
import type { SelectOption } from '@ng/shared/ui';
import {
  BleProvisioningService,
  DiscoveredSensor,
} from '@ng/core/ble/ble-provisioning.service';
import type { ProvisioningStatus, WifiNetwork } from '@ng/core/ble/ble.port';

addIcons({ bluetoothOutline, checkmarkOutline, hardwareChipOutline });

type Step = 'scan' | 'wifi' | 'provisioning' | 'done' | 'error';

const LAST_SSID_KEY = 'iotpilot.ble.last_ssid';
// Session-only password memory (in-memory, never persisted) so claiming a batch of
// sensors on the same WiFi doesn't require retyping. Cleared on reload.
let rememberedPassword = '';

/**
 * BLE claiming sheet (fe-ble-claiming C3): scan setup-mode sensors → pick one →
 * choose WiFi (from the list the sensor scanned, so no SSID typos) → provision.
 * Isolated from the manual register-device sheet. With the web `UnavailableBlePort`
 * it lands on the `error` step and the operator uses manual entry.
 */
@Component({
  selector: 'app-ble-claim-sheet',
  templateUrl: 'ble-claim-sheet.component.html',
  styleUrls: ['ble-claim-sheet.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    BottomSheetComponent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    UiSelectComponent,
  ],
})
export class BleClaimSheetComponent {
  private readonly ble = inject(BleProvisioningService);

  protected readonly sheetRef = viewChild.required(BottomSheetComponent);

  protected readonly step = signal<Step>('scan');
  protected readonly errorKey = signal<string>('components.ble_claim.err_other');
  protected readonly picked = signal<DiscoveredSensor | null>(null);

  /** WiFi the sensor scanned (for the SSID picker). */
  protected readonly networks = signal<WifiNetwork[]>([]);
  /** SSID chosen from the picker. */
  protected readonly ssidCtrl = new FormControl('', { nonNullable: true });
  /** Manual SSID entry (hidden network, or nothing scanned). */
  protected readonly manualSsid = signal(false);
  protected readonly ssid = signal('');
  protected readonly password = signal('');

  protected readonly ssidOptions = computed<SelectOption[]>(() =>
    this.networks().map((n) => ({
      label: n.rssi != null ? `${n.ssid}  (${n.rssi} dBm)` : n.ssid,
      value: n.ssid,
    })),
  );

  /** Show the picker when the sensor reported networks and the operator hasn't opted into manual. */
  protected readonly usePicker = computed(() => this.networks().length > 0 && !this.manualSsid());

  protected readonly sensors = this.ble.sensors;
  protected readonly scanning = this.ble.scanning;
  protected readonly status = this.ble.status;

  async open(): Promise<void> {
    this.reset();
    this.sheetRef().open();
    try {
      await this.ble.startScan();
    } catch {
      this.errorKey.set('components.ble_claim.unavailable');
      this.step.set('error');
    }
  }

  protected async selectSensor(s: DiscoveredSensor): Promise<void> {
    this.picked.set(s);
    this.step.set('wifi');
    void this.ble.stopScan();
    this.password.set(rememberedPassword);
    const nets = await this.ble.readNetworks(s.peripheralId);
    this.networks.set(nets);
    // Pre-select the last-used SSID if the sensor can see it.
    const last = localStorage.getItem(LAST_SSID_KEY) ?? '';
    if (last && nets.some((n) => n.ssid === last)) {
      this.ssidCtrl.setValue(last);
    } else if (last) {
      this.ssid.set(last);
    }
    this.manualSsid.set(nets.length === 0);
  }

  protected effectiveSsid(): string {
    return (this.usePicker() ? this.ssidCtrl.value : this.ssid()).trim();
  }

  protected enableManualSsid(): void {
    this.manualSsid.set(true);
    this.ssid.set(this.ssidCtrl.value);
  }

  protected async rescan(): Promise<void> {
    this.step.set('scan');
    try {
      await this.ble.startScan();
    } catch {
      this.errorKey.set('components.ble_claim.unavailable');
      this.step.set('error');
    }
  }

  protected async claim(): Promise<void> {
    const sensor = this.picked();
    const ssid = this.effectiveSsid();
    if (!sensor || !ssid) return;
    this.step.set('provisioning');
    try {
      const out = await this.ble.provision(sensor.peripheralId, { ssid, password: this.password() });
      if (out.ok) {
        localStorage.setItem(LAST_SSID_KEY, ssid);
        rememberedPassword = this.password();
        this.step.set('done');
      } else {
        this.errorKey.set(this.statusToErrorKey(out.status));
        this.step.set('error');
      }
    } catch {
      this.errorKey.set('components.ble_claim.err_other');
      this.step.set('error');
    }
  }

  protected statusKey(): string {
    switch (this.status()) {
      case 'WIFI_CONNECTING':
        return 'components.ble_claim.st_wifi';
      case 'ACTIVATING':
        return 'components.ble_claim.st_activating';
      default:
        return 'components.ble_claim.claiming';
    }
  }

  private statusToErrorKey(status: ProvisioningStatus): string {
    if (status === 'ERR_WIFI') return 'components.ble_claim.err_wifi';
    if (status === 'ERR_TOKEN') return 'components.ble_claim.err_token';
    return 'components.ble_claim.err_other';
  }

  protected onSheetDismiss(): void {
    void this.ble.stopScan();
    this.reset();
  }

  private reset(): void {
    this.step.set('scan');
    this.picked.set(null);
    this.networks.set([]);
    this.manualSsid.set(false);
    this.ssidCtrl.setValue('');
    this.ssid.set('');
    this.password.set('');
    this.errorKey.set('components.ble_claim.err_other');
  }
}
