import { Injectable } from '@angular/core';
import { BlePort, ScanResultLite } from './ble.port';

/**
 * `BlePort` over the Web Bluetooth API (`navigator.bluetooth`). Used by the
 * Electron desktop build (Chromium) — and works in desktop Chrome for dev too.
 * Chosen runtime for fe-ble-claiming P0.1 (Electron, for cross-OS reach).
 *
 * Web Bluetooth note: the stable API has no multi-device live scan — `scan()`
 * opens the platform/Electron device chooser via `requestDevice()` and yields the
 * single chosen peripheral (the UI then lists that one). A continuous list would
 * need Electron's `select-bluetooth-device` IPC or the experimental `requestLEScan`
 * — tracked as a follow-up. Connect/read/write/notify map directly to GATT.
 */

// Minimal Web Bluetooth surface we use (avoids a global @types/web-bluetooth dep).
interface WbCharacteristic {
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<WbCharacteristic>;
  addEventListener(type: 'characteristicvaluechanged', cb: (ev: Event) => void): void;
  value?: DataView;
}
interface WbService {
  getCharacteristic(uuid: string): Promise<WbCharacteristic>;
}
interface WbGattServer {
  connected: boolean;
  connect(): Promise<WbGattServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<WbService>;
}
interface WbDevice {
  id: string;
  name?: string;
  gatt?: WbGattServer;
}
interface WebBluetooth {
  getAvailability?(): Promise<boolean>;
  requestDevice(options: {
    filters?: Array<{ services?: string[] }>;
    optionalServices?: string[];
  }): Promise<WbDevice>;
}

function getWebBluetooth(): WebBluetooth | undefined {
  return (globalThis as unknown as { navigator?: { bluetooth?: WebBluetooth } }).navigator?.bluetooth;
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

@Injectable()
export class WebBluetoothBlePort extends BlePort {
  private readonly devices = new Map<string, WbDevice>();
  private readonly servers = new Map<string, WbGattServer>();

  async initialize(): Promise<void> {}

  async isAvailable(): Promise<boolean> {
    const bt = getWebBluetooth();
    if (!bt) return false;
    return bt.getAvailability ? bt.getAvailability() : true;
  }

  /** Opens the chooser, filtered to the setup service, and yields the chosen device. */
  async scan(serviceUuid: string, onDiscover: (r: ScanResultLite) => void): Promise<void> {
    const bt = getWebBluetooth();
    if (!bt) throw new Error('Web Bluetooth is not available');
    const device = await bt.requestDevice({
      filters: [{ services: [serviceUuid] }],
      optionalServices: [serviceUuid],
    });
    this.devices.set(device.id, device);
    onDiscover({ peripheralId: device.id, localName: device.name });
  }

  async stopScan(): Promise<void> {
    // requestDevice has no running scan to cancel.
  }

  async connect(peripheralId: string): Promise<void> {
    const gatt = this.deviceGatt(peripheralId);
    const server = await gatt.connect();
    this.servers.set(peripheralId, server);
  }

  async disconnect(peripheralId: string): Promise<void> {
    this.servers.get(peripheralId)?.disconnect();
    this.servers.delete(peripheralId);
  }

  async read(peripheralId: string, service: string, characteristic: string): Promise<string> {
    const ch = await this.characteristic(peripheralId, service, characteristic);
    const view = await ch.readValue();
    return decoder.decode(view);
  }

  async write(peripheralId: string, service: string, characteristic: string, value: string): Promise<void> {
    const ch = await this.characteristic(peripheralId, service, characteristic);
    await ch.writeValue(encoder.encode(value));
  }

  async startNotifications(
    peripheralId: string,
    service: string,
    characteristic: string,
    onValue: (value: string) => void,
  ): Promise<void> {
    const ch = await this.characteristic(peripheralId, service, characteristic);
    await ch.startNotifications();
    ch.addEventListener('characteristicvaluechanged', (ev: Event) => {
      const view = (ev.target as unknown as { value?: DataView }).value;
      if (view) onValue(decoder.decode(view));
    });
  }

  private deviceGatt(peripheralId: string): WbGattServer {
    const device = this.devices.get(peripheralId);
    if (!device?.gatt) throw new Error(`Unknown or unconnectable peripheral: ${peripheralId}`);
    return device.gatt;
  }

  private async characteristic(
    peripheralId: string,
    service: string,
    characteristic: string,
  ): Promise<WbCharacteristic> {
    let server = this.servers.get(peripheralId);
    if (!server?.connected) {
      server = await this.deviceGatt(peripheralId).connect();
      this.servers.set(peripheralId, server);
    }
    const svc = await server.getPrimaryService(service);
    return svc.getCharacteristic(characteristic);
  }
}
