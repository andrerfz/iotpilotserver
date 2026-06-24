import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebBluetoothBlePort } from './web-bluetooth.adapter';
import { BLE_SETUP, ScanResultLite } from './ble.port';

function toDataView(s: string): DataView {
  return new DataView(new TextEncoder().encode(s).buffer);
}

/** Fake Web Bluetooth peripheral: device → gatt → service → characteristics. */
function makeFakeBluetooth() {
  let notifyCb: ((ev: Event) => void) | null = null;
  const writeValue = vi.fn(async () => undefined);

  const char = {
    async readValue() {
      return toDataView(JSON.stringify({ deviceId: 'IOT-LHX8-MP99', model: 'C3', fw: '1.2.0' }));
    },
    writeValue,
    async startNotifications() {
      return char;
    },
    addEventListener(_t: 'characteristicvaluechanged', cb: (ev: Event) => void) {
      notifyCb = cb;
    },
  };
  const service = { getCharacteristic: vi.fn(async () => char) };
  const server = {
    connected: false,
    async connect() {
      this.connected = true;
      return this;
    },
    disconnect() {
      this.connected = false;
    },
    getPrimaryService: vi.fn(async () => service),
  };
  const device = { id: 'dev1', name: 'IotPilot-Setup-MP99', gatt: server };
  const bluetooth = {
    getAvailability: vi.fn(async () => true),
    requestDevice: vi.fn(async () => device),
  };
  return {
    bluetooth,
    writeValue,
    fireNotify: (value: string) => notifyCb?.({ target: { value: toDataView(value) } } as unknown as Event),
  };
}

describe('WebBluetoothBlePort', () => {
  let fake: ReturnType<typeof makeFakeBluetooth>;
  let port: WebBluetoothBlePort;

  beforeEach(() => {
    fake = makeFakeBluetooth();
    (navigator as unknown as { bluetooth: unknown }).bluetooth = fake.bluetooth;
    port = new WebBluetoothBlePort();
  });

  afterEach(() => {
    delete (navigator as unknown as { bluetooth?: unknown }).bluetooth;
  });

  it('reports availability from the platform', async () => {
    expect(await port.isAvailable()).toBe(true);
  });

  it('scan opens the chooser and yields the chosen device', async () => {
    const seen: ScanResultLite[] = [];
    await port.scan(BLE_SETUP.serviceUuid, (r) => seen.push(r));
    expect(fake.bluetooth.requestDevice).toHaveBeenCalledOnce();
    expect(seen).toEqual([{ peripheralId: 'dev1', localName: 'IotPilot-Setup-MP99' }]);
  });

  it('reads a characteristic as a decoded string', async () => {
    await port.scan(BLE_SETUP.serviceUuid, () => undefined);
    await port.connect('dev1');
    const info = await port.read('dev1', BLE_SETUP.serviceUuid, BLE_SETUP.infoChar);
    expect(JSON.parse(info).deviceId).toBe('IOT-LHX8-MP99');
  });

  it('writes a characteristic as UTF-8 bytes', async () => {
    await port.scan(BLE_SETUP.serviceUuid, () => undefined);
    await port.write('dev1', BLE_SETUP.serviceUuid, BLE_SETUP.commandChar, 'activate');
    const calls = fake.writeValue.mock.calls as unknown as Array<[Uint8Array]>;
    const bytes = calls[0][0];
    expect(new TextDecoder().decode(bytes)).toBe('activate');
  });

  it('delivers notifications as decoded strings', async () => {
    await port.scan(BLE_SETUP.serviceUuid, () => undefined);
    const got: string[] = [];
    await port.startNotifications('dev1', BLE_SETUP.serviceUuid, BLE_SETUP.statusChar, (v) => got.push(v));
    fake.fireNotify('WIFI_CONNECTING');
    expect(got).toEqual(['WIFI_CONNECTING']);
  });

  it('throws when scanning without Web Bluetooth', async () => {
    delete (navigator as unknown as { bluetooth?: unknown }).bluetooth;
    await expect(port.scan(BLE_SETUP.serviceUuid, () => undefined)).rejects.toThrow(/not available/i);
  });
});
