import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { render } from '@testing-library/angular';
import { BleClaimSheetComponent } from './ble-claim-sheet.component';
import { DashboardService } from '../../services/dashboard.service';
import { BlePort, BLE_SETUP, ProvisioningStatus, ScanResultLite } from '@ng/core/ble/ble.port';

/** Controllable fake setup-mode peripheral (shared shape with the service spec). */
class FakeBlePort extends BlePort {
  available = true;
  info = { deviceId: 'IOT-LHX8-MP99', model: 'LILYGO-T-OI-PLUS-C3', fw: '1.2.0' };
  emitOnActivate: ProvisioningStatus = 'WIFI_CONNECTING';
  private statusCb: ((v: string) => void) | null = null;
  private discoverCb: ((r: ScanResultLite) => void) | null = null;

  async initialize(): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return this.available;
  }
  async scan(_u: string, onDiscover: (r: ScanResultLite) => void): Promise<void> {
    if (!this.available) throw new Error('unavailable');
    this.discoverCb = onDiscover;
  }
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
    if (characteristic === BLE_SETUP.commandChar && value === 'activate') {
      queueMicrotask(() => this.statusCb?.(this.emitOnActivate));
    }
  }
  async startNotifications(_p: string, _s: string, _c: string, onValue: (v: string) => void): Promise<void> {
    this.statusCb = onValue;
  }
}

interface Priv {
  step: ReturnType<typeof signal<string>>;
  errorKey: ReturnType<typeof signal<string>>;
  picked: ReturnType<typeof signal<unknown>>;
  ssid: ReturnType<typeof signal<string>>;
  selectSensor: (s: { peripheralId: string; name: string }) => void;
  rescan: () => Promise<void>;
  claim: () => Promise<void>;
  sensors: () => Array<{ peripheralId: string }>;
}

describe('BleClaimSheetComponent', () => {
  let ble: FakeBlePort;
  let claimDevice: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ble = new FakeBlePort();
    claimDevice = vi.fn().mockResolvedValue({
      claimingToken: 'ABCD-2345',
      deviceId: 'IOT-LHX8-MP99',
      expiresAt: '2030-01-01T00:00:00Z',
    });
  });

  async function renderComponent() {
    const r = await render(BleClaimSheetComponent, {
      providers: [
        provideHttpClient(),
        { provide: BlePort, useValue: ble },
        { provide: DashboardService, useValue: { claimDevice } },
      ],
    });
    return r.fixture.componentInstance as unknown as Priv & BleClaimSheetComponent;
  }

  it('lists discovered sensors after a scan', async () => {
    const comp = await renderComponent();
    await comp.rescan();
    ble.discover({ peripheralId: 'p1', localName: 'IotPilot-Setup-MP99', rssi: -50 });
    expect(comp.sensors().map((s) => s.peripheralId)).toEqual(['p1']);
    expect(comp.step()).toBe('scan');
  });

  it('goes to the error step when Bluetooth is unavailable', async () => {
    ble.available = false;
    const comp = await renderComponent();
    await comp.rescan();
    expect(comp.step()).toBe('error');
    expect(comp.errorKey()).toBe('components.ble_claim.unavailable');
  });

  it('selecting a sensor moves to the wifi step', async () => {
    const comp = await renderComponent();
    comp.selectSensor({ peripheralId: 'p1', name: 'IotPilot-Setup-MP99' });
    expect(comp.step()).toBe('wifi');
  });

  it('claim provisions and lands on the done step (handed off)', async () => {
    const comp = await renderComponent();
    comp.selectSensor({ peripheralId: 'p1', name: 'IotPilot-Setup-MP99' });
    comp.ssid.set('YUREST');
    await comp.claim();
    expect(claimDevice).toHaveBeenCalledWith('IOT-LHX8-MP99');
    expect(comp.step()).toBe('done');
  });

  it('claim surfaces a device ERR_* as an error step', async () => {
    ble.emitOnActivate = 'ERR_WIFI';
    const comp = await renderComponent();
    comp.selectSensor({ peripheralId: 'p1', name: 'IotPilot-Setup-MP99' });
    comp.ssid.set('YUREST');
    await comp.claim();
    expect(comp.step()).toBe('error');
    expect(comp.errorKey()).toBe('components.ble_claim.err_wifi');
  });
});
