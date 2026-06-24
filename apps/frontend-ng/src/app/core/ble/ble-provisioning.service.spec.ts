import { TestBed } from '@angular/core/testing';
import { DashboardService } from '@ng/features/dashboard/services/dashboard.service';
import { BleProvisioningService } from './ble-provisioning.service';
import { BLE_SETUP, BlePort, ProvisioningStatus, ScanResultLite } from './ble.port';

/** Controllable in-memory BLE peripheral that simulates a setup-mode sensor. */
class FakeBlePort extends BlePort {
  available = true;
  info = { deviceId: 'IOT-LHX8-MP99', model: 'LILYGO-T-OI-PLUS-C3', fw: '1.2.0' };
  readonly writes: Array<{ characteristic: string; value: string }> = [];
  emitOnActivate: ProvisioningStatus = 'WIFI_CONNECTING';

  private statusCb: ((v: string) => void) | null = null;
  private discoverCb: ((r: ScanResultLite) => void) | null = null;

  async initialize(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return this.available;
  }
  async scan(_uuid: string, onDiscover: (r: ScanResultLite) => void): Promise<void> {
    this.discoverCb = onDiscover;
  }
  /** Test hook: simulate an advertisement. */
  discover(r: ScanResultLite): void {
    this.discoverCb?.(r);
  }
  async stopScan(): Promise<void> {}
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async read(): Promise<string> {
    return JSON.stringify(this.info);
  }
  async write(_p: string, _s: string, characteristic: string, value: string): Promise<void> {
    this.writes.push({ characteristic, value });
    if (characteristic === BLE_SETUP.commandChar && value === 'activate') {
      // Simulate the device transitioning right after `activate`.
      queueMicrotask(() => this.statusCb?.(this.emitOnActivate));
    }
  }
  async startNotifications(
    _p: string,
    _s: string,
    _c: string,
    onValue: (value: string) => void,
  ): Promise<void> {
    this.statusCb = onValue;
  }
}

describe('BleProvisioningService', () => {
  let ble: FakeBlePort;
  let claimDevice: ReturnType<typeof vi.fn>;
  let svc: BleProvisioningService;

  beforeEach(() => {
    ble = new FakeBlePort();
    claimDevice = vi.fn(async () => ({
      claimingToken: 'ABCD-2345',
      deviceId: 'IOT-LHX8-MP99',
      expiresAt: '2030-01-01T00:00:00Z',
    }));

    TestBed.configureTestingModule({
      providers: [
        BleProvisioningService,
        { provide: BlePort, useValue: ble },
        { provide: DashboardService, useValue: { claimDevice } },
      ],
    });
    svc = TestBed.inject(BleProvisioningService);
  });

  it('scans and lists discovered sensors, de-duping by peripheral', async () => {
    await svc.startScan();
    ble.discover({ peripheralId: 'p1', localName: 'IotPilot-Setup-MP99', rssi: -50 });
    ble.discover({ peripheralId: 'p1', localName: 'IotPilot-Setup-MP99', rssi: -48 });
    ble.discover({ peripheralId: 'p2', localName: 'IotPilot-Setup-AB12' });

    expect(svc.scanning()).toBe(true);
    expect(svc.sensors().map((s) => s.peripheralId)).toEqual(['p1', 'p2']);
    expect(svc.sensors()[0].name).toBe('IotPilot-Setup-MP99');
  });

  it('startScan throws when Bluetooth is unavailable', async () => {
    ble.available = false;
    await expect(svc.startScan()).rejects.toThrow(/not available/i);
  });

  it('provision claims a token, writes provision + activate, and hands off on WIFI_CONNECTING', async () => {
    const out = await svc.provision('p1', { ssid: 'YUREST', password: 'secret' });

    expect(claimDevice).toHaveBeenCalledWith('IOT-LHX8-MP99');

    const prov = ble.writes.find((w) => w.characteristic === BLE_SETUP.provisionChar);
    expect(JSON.parse(prov!.value)).toEqual({
      ssid: 'YUREST',
      password: 'secret',
      claimingToken: 'ABCD-2345',
    });
    expect(ble.writes.some((w) => w.characteristic === BLE_SETUP.commandChar && w.value === 'activate')).toBe(true);

    expect(out).toEqual({ ok: true, deviceId: 'IOT-LHX8-MP99', handedOff: true });
    expect(svc.status()).toBe('WIFI_CONNECTING');
  });

  it('provision resolves as a failure when the device reports ERR_*', async () => {
    ble.emitOnActivate = 'ERR_WIFI';
    const out = await svc.provision('p1', { ssid: 'YUREST', password: 'wrong' });
    expect(out).toEqual({ ok: false, status: 'ERR_WIFI' });
  });

  it('provision throws when the backend returns no claiming token', async () => {
    claimDevice.mockResolvedValueOnce({ deviceId: 'IOT-LHX8-MP99' });
    await expect(svc.provision('p1', { ssid: 'YUREST', password: 'x' })).rejects.toThrow(/claiming token/i);
  });
});
