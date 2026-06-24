/**
 * Platform-agnostic BLE access for setup-mode device provisioning.
 *
 * The concrete adapter is chosen by the runtime once fe-ble-claiming P0.1 is
 * decided (Mac Catalyst → `@capacitor-community/bluetooth-le`; Electron →
 * Web Bluetooth). {@link BleProvisioningService} and its tests depend only on
 * this port, mirroring the `SecureStoragePort` pattern in `core/auth`.
 *
 * The GATT contract is the single source of truth:
 * `docs/frontend/fe-ble-claiming/gatt-contract.md`.
 */

/** Setup-mode GATT UUIDs — keep in sync with the firmware and gatt-contract.md. */
export const BLE_SETUP = {
  serviceUuid: '8e9a0001-1b2c-4f3d-9a6b-1f2e3d4c5b6a',
  infoChar: '8e9a0002-1b2c-4f3d-9a6b-1f2e3d4c5b6a',
  provisionChar: '8e9a0003-1b2c-4f3d-9a6b-1f2e3d4c5b6a',
  commandChar: '8e9a0004-1b2c-4f3d-9a6b-1f2e3d4c5b6a',
  statusChar: '8e9a0005-1b2c-4f3d-9a6b-1f2e3d4c5b6a',
} as const;

/** `status` characteristic values (the firmware notifies on every transition). */
export type ProvisioningStatus =
  | 'IDLE'
  | 'RECEIVED'
  | 'WIFI_CONNECTING'
  | 'ACTIVATING'
  | 'ACTIVATED'
  | 'ERR_WIFI'
  | 'ERR_TOKEN'
  | 'ERR_NET'
  | 'ERR_INTERNAL';

/** A peripheral advertising the setup service, as seen during a scan. */
export interface ScanResultLite {
  /** Platform BLE peripheral id (NOT the IoT device id — that comes from device-info). */
  peripheralId: string;
  /** Advertised local name, e.g. `IotPilot-Setup-MP99`. */
  localName?: string;
  rssi?: number;
}

/** The sensor's self-reported identity, read from the `device-info` characteristic. */
export interface DeviceInfo {
  deviceId: string;
  model: string;
  fw: string;
}

export interface WifiCredentials {
  ssid: string;
  password: string;
}

/**
 * The BLE operations the provisioning flow needs. Kept close to
 * `@capacitor-community/bluetooth-le`'s `BleClient` so the Catalyst adapter is a
 * thin wrapper, but generic enough to also back with Web Bluetooth.
 *
 * `value` payloads are UTF-8 strings (adapters handle DataView ↔ string).
 */
export abstract class BlePort {
  abstract initialize(): Promise<void>;
  abstract isAvailable(): Promise<boolean>;
  /** Start scanning; `onDiscover` fires per advertisement matching `serviceUuid`. */
  abstract scan(serviceUuid: string, onDiscover: (r: ScanResultLite) => void): Promise<void>;
  abstract stopScan(): Promise<void>;
  abstract connect(peripheralId: string): Promise<void>;
  abstract disconnect(peripheralId: string): Promise<void>;
  abstract read(peripheralId: string, service: string, characteristic: string): Promise<string>;
  abstract write(peripheralId: string, service: string, characteristic: string, value: string): Promise<void>;
  abstract startNotifications(
    peripheralId: string,
    service: string,
    characteristic: string,
    onValue: (value: string) => void,
  ): Promise<void>;
}
