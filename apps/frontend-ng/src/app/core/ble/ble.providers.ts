import { Provider } from '@angular/core';
import { BlePort } from './ble.port';

/**
 * Default web `BlePort`: reports BLE unavailable and refuses operations. The web
 * (WKWebView/normal browser) has no native BLE here, so the claim UI degrades to
 * manual entry. The real adapter is wired by the desktop runtime once
 * fe-ble-claiming P0.1 is decided (Mac Catalyst → `@capacitor-community/bluetooth-le`,
 * Electron → Web Bluetooth), overriding this provider — mirroring how fe-mobile
 * overrides the web TokenStorage with SecureStorage.
 */
export class UnavailableBlePort extends BlePort {
  async initialize(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return false;
  }
  async scan(): Promise<void> {
    throw new Error('Bluetooth is not available on this platform');
  }
  async stopScan(): Promise<void> {}
  async connect(): Promise<void> {
    throw new Error('Bluetooth is not available on this platform');
  }
  async disconnect(): Promise<void> {}
  async read(): Promise<string> {
    throw new Error('Bluetooth is not available on this platform');
  }
  async write(): Promise<void> {
    throw new Error('Bluetooth is not available on this platform');
  }
  async startNotifications(): Promise<void> {
    throw new Error('Bluetooth is not available on this platform');
  }
}

/** Default (web) BLE provider. Desktop runtimes override `BlePort` with a real adapter. */
export function provideBle(): Provider {
  return { provide: BlePort, useClass: UnavailableBlePort };
}
