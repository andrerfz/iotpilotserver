import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
} from '@ng/shared/ui';
import {
  BleProvisioningService,
  DiscoveredSensor,
} from '@ng/core/ble/ble-provisioning.service';
import type { ProvisioningStatus } from '@ng/core/ble/ble.port';

addIcons({ bluetoothOutline, checkmarkOutline, hardwareChipOutline });

type Step = 'scan' | 'wifi' | 'provisioning' | 'done' | 'error';

/**
 * BLE claiming sheet (fe-ble-claiming C3): scan setup-mode sensors → pick one →
 * enter WiFi → provision. Isolated from the manual register-device sheet so the
 * existing flow is untouched. With the default web `UnavailableBlePort`, opening
 * this lands on the `error` step ("Bluetooth not available") and the operator uses
 * manual entry; a real adapter (P0.1) makes it functional.
 */
@Component({
  selector: 'app-ble-claim-sheet',
  templateUrl: 'ble-claim-sheet.component.html',
  styleUrls: ['ble-claim-sheet.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    BottomSheetComponent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
  ],
})
export class BleClaimSheetComponent {
  private readonly ble = inject(BleProvisioningService);

  protected readonly sheetRef = viewChild.required(BottomSheetComponent);

  protected readonly step = signal<Step>('scan');
  protected readonly errorKey = signal<string>('components.ble_claim.err_other');
  protected readonly picked = signal<DiscoveredSensor | null>(null);
  protected readonly ssid = signal('');
  protected readonly password = signal('');

  /** Live scan results + provisioning status straight from the service. */
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

  protected selectSensor(s: DiscoveredSensor): void {
    this.picked.set(s);
    this.step.set('wifi');
    void this.ble.stopScan();
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
    if (!sensor || !this.ssid().trim()) return;
    this.step.set('provisioning');
    try {
      const out = await this.ble.provision(sensor.peripheralId, {
        ssid: this.ssid().trim(),
        password: this.password(),
      });
      if (out.ok) {
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

  /** Human-readable label for the in-flight provisioning status. */
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
    this.ssid.set('');
    this.password.set('');
    this.errorKey.set('components.ble_claim.err_other');
  }
}
