import { inject, Injectable, signal } from '@angular/core';
import { DashboardService } from '@ng/features/dashboard/services/dashboard.service';
import {
  BLE_SETUP,
  BlePort,
  DeviceInfo,
  ProvisioningStatus,
  ScanResultLite,
  WifiCredentials,
  WifiNetwork,
} from './ble.port';

/** A discovered setup-mode sensor shown in the scan list. */
export interface DiscoveredSensor {
  peripheralId: string;
  /** Short label from the advertisement, e.g. `IotPilot-Setup-MP99`. */
  name: string;
  rssi?: number;
}

export type ProvisionOutcome =
  | { ok: true; deviceId: string; handedOff: true }
  | { ok: false; status: ProvisioningStatus };

/**
 * Drives BLE setup-mode claiming (fe-ble-claiming C1): scan for sensors, then
 * provision a chosen one by pushing WiFi credentials + a claiming token fetched
 * from the backend. Runtime-agnostic — depends only on {@link BlePort}.
 *
 * Hand-off semantics: the single-radio ESP32-C3 tears its BLE link down to bring
 * up WiFi, so the app does NOT receive a final `ACTIVATED` over BLE. We resolve as
 * "handed off" once the device reports `WIFI_CONNECTING` (or the link drops right
 * after `activate`); the caller (C4) then reconciles via the device list/socket
 * until the sensor shows ONLINE. An `ERR_*` notification resolves as a failure.
 */
@Injectable({ providedIn: 'root' })
export class BleProvisioningService {
  private readonly ble = inject(BlePort);
  private readonly dashboard = inject(DashboardService);

  private readonly _sensors = signal<DiscoveredSensor[]>([]);
  private readonly _status = signal<ProvisioningStatus | null>(null);
  private readonly _scanning = signal(false);

  /** Sensors discovered in the current scan. */
  readonly sensors = this._sensors.asReadonly();
  /** Latest provisioning status reported by the sensor (null before provisioning). */
  readonly status = this._status.asReadonly();
  readonly scanning = this._scanning.asReadonly();

  /** Begin scanning for setup-mode sensors. Results accumulate in {@link sensors}. */
  async startScan(): Promise<void> {
    if (!(await this.ble.isAvailable())) {
      throw new Error('Bluetooth is not available');
    }
    await this.ble.initialize();
    this._sensors.set([]);
    this._scanning.set(true);
    await this.ble.scan(BLE_SETUP.serviceUuid, (r: ScanResultLite) => {
      this._sensors.update((list) =>
        list.some((s) => s.peripheralId === r.peripheralId)
          ? list
          : [...list, { peripheralId: r.peripheralId, name: r.localName ?? r.peripheralId, rssi: r.rssi }],
      );
    });
  }

  async stopScan(): Promise<void> {
    await this.ble.stopScan();
    this._scanning.set(false);
  }

  /** Read the sensor's self-reported identity (after selecting it in the list). */
  async readInfo(peripheralId: string): Promise<DeviceInfo> {
    await this.ble.connect(peripheralId);
    const raw = await this.ble.read(peripheralId, BLE_SETUP.serviceUuid, BLE_SETUP.infoChar);
    return JSON.parse(raw) as DeviceInfo;
  }

  /**
   * Read the WiFi networks the sensor scanned at boot, so the operator picks the
   * exact SSID from a list (no typos). De-dupes by SSID, strongest signal first.
   * Returns [] if unreadable (the UI falls back to manual SSID entry).
   */
  async readNetworks(peripheralId: string): Promise<WifiNetwork[]> {
    try {
      await this.ble.connect(peripheralId);
      const raw = await this.ble.read(peripheralId, BLE_SETUP.serviceUuid, BLE_SETUP.networksChar);
      const list = JSON.parse(raw) as WifiNetwork[];
      const bySsid = new Map<string, WifiNetwork>();
      for (const n of list) {
        if (!n?.ssid) continue;
        const prev = bySsid.get(n.ssid);
        if (!prev || (n.rssi ?? -999) > (prev.rssi ?? -999)) bySsid.set(n.ssid, n);
      }
      return [...bySsid.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
    } catch {
      return [];
    }
  }

  /**
   * Provision a discovered sensor: read its id, claim a token from the backend,
   * push `{ssid,password,claimingToken}`, trigger `activate`, and resolve once the
   * device hands off to WiFi (see class doc). Rejects on an `ERR_*` status.
   */
  async provision(peripheralId: string, wifi: WifiCredentials): Promise<ProvisionOutcome> {
    await this.stopScan();
    this._status.set(null);

    const info = await this.readInfo(peripheralId);

    // C2: reuse POST /devices/claim — mints a one-time token for this deviceId.
    const claim = await this.dashboard.claimDevice(info.deviceId);
    const claimingToken = claim.claimingToken;
    if (!claimingToken) {
      throw new Error('Backend did not return a claiming token');
    }

    return new Promise<ProvisionOutcome>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      void this.ble
        .startNotifications(peripheralId, BLE_SETUP.serviceUuid, BLE_SETUP.statusChar, (value) => {
          const status = value as ProvisioningStatus;
          this._status.set(status);
          if (status === 'WIFI_CONNECTING' || status === 'ACTIVATING' || status === 'ACTIVATED') {
            // Device is committing — handed off to WiFi; reconcile via the dashboard.
            finish(() => resolve({ ok: true, deviceId: info.deviceId, handedOff: true }));
          } else if (status.startsWith('ERR_')) {
            finish(() => resolve({ ok: false, status }));
          }
        })
        .then(() =>
          this.ble.write(
            peripheralId,
            BLE_SETUP.serviceUuid,
            BLE_SETUP.provisionChar,
            JSON.stringify({ ssid: wifi.ssid, password: wifi.password, claimingToken }),
          ),
        )
        .then(() =>
          this.ble.write(peripheralId, BLE_SETUP.serviceUuid, BLE_SETUP.commandChar, 'activate'),
        )
        .catch((err) => finish(() => reject(err)));
    });
  }
}
