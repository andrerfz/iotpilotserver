import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { render } from '@testing-library/angular';
import { RegisterDeviceSheetComponent } from './register-device-sheet.component';
import { DashboardService } from '../../services/dashboard.service';
import type { ClaimResult } from '@ng/core/api/generated/models/claim-result';

const CLAIM_RESULT: ClaimResult = {
  deviceId: 'RPI-001',
  claimingToken: 'ABC123',
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  instructions: 'Connect to IoT-Setup hotspot and enter the token.',
};

function makeDashServiceMock() {
  return {
    claimDevice: vi.fn().mockResolvedValue(CLAIM_RESULT),
    devices: {
      data: signal(null),
      loading: signal(false),
      error: signal(null),
      load: vi.fn().mockResolvedValue(null),
      reload: vi.fn().mockResolvedValue(null),
    },
    alerts: {
      data: signal(null),
      loading: signal(false),
      error: signal(null),
      load: vi.fn().mockResolvedValue(null),
      reload: vi.fn(),
    },
    alertsTrend: {
      data: signal(null),
      loading: signal(false),
      error: signal(null),
      load: vi.fn().mockResolvedValue(null),
      reload: vi.fn(),
    },
    monitoringMetrics: {
      data: signal(null),
      loading: signal(false),
      error: signal(null),
      load: vi.fn().mockResolvedValue(null),
      reload: vi.fn(),
    },
    batchUpdateAlerts: vi.fn().mockResolvedValue({ processed: 0, skipped: 0 }),
  };
}

describe('RegisterDeviceSheetComponent', () => {
  let mockDash: ReturnType<typeof makeDashServiceMock>;

  beforeEach(() => {
    mockDash = makeDashServiceMock();
  });

  async function renderComponent() {
    return render(RegisterDeviceSheetComponent, {
      providers: [
        provideHttpClient(),
        { provide: DashboardService, useValue: mockDash },
      ],
    });
  }

  it('starts in form step by default', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    type Priv = { step: ReturnType<typeof signal<string>> };
    const priv = comp as unknown as Priv;
    expect(priv.step()).toBe('form');
  });

  it('sets error when deviceId is empty on claim', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    const priv = comp as unknown as { error: ReturnType<typeof signal<string | null>> };
    comp.deviceId.set('');
    await comp.onClaim();
    expect(priv.error()).toBe('Device ID is required');
  });

  it('uppercases deviceId before calling claimDevice', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    comp.deviceId.set('rpi-001');
    await comp.onClaim();
    expect(mockDash.claimDevice).toHaveBeenCalledWith('RPI-001', undefined);
  });

  it('passes deviceName when provided', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    comp.deviceId.set('RPI-001');
    comp.deviceName.set('Kitchen Pi');
    await comp.onClaim();
    expect(mockDash.claimDevice).toHaveBeenCalledWith('RPI-001', 'Kitchen Pi');
  });

  it('omits name when deviceName is blank', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    comp.deviceId.set('RPI-001');
    comp.deviceName.set('   ');
    await comp.onClaim();
    expect(mockDash.claimDevice).toHaveBeenCalledWith('RPI-001', undefined);
  });

  it('transitions to success step on successful claim', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    type Priv = { step: ReturnType<typeof signal<string>>; claimResult: ReturnType<typeof signal<ClaimResult | null>> };
    const priv = comp as unknown as Priv;
    comp.deviceId.set('RPI-001');
    await comp.onClaim();
    expect(priv.step()).toBe('success');
    expect(priv.claimResult()).toEqual(CLAIM_RESULT);
  });

  it('sets error string on claim failure', async () => {
    mockDash.claimDevice.mockRejectedValue(new Error('Device already claimed'));
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    type Priv = { step: ReturnType<typeof signal<string>>; error: ReturnType<typeof signal<string | null>> };
    const priv = comp as unknown as Priv;
    comp.deviceId.set('RPI-001');
    await comp.onClaim();
    expect(priv.step()).toBe('form');
    expect(priv.error()).toBe('Device already claimed');
  });

  it('emits deviceClaimed with result on dismiss when claim succeeded', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    const emitted: ClaimResult[] = [];
    comp.deviceClaimed.subscribe((r: ClaimResult) => emitted.push(r));
    comp.deviceId.set('RPI-001');
    await comp.onClaim();
    comp.onSheetDismiss();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(CLAIM_RESULT);
  });

  it('does NOT emit deviceClaimed when dismissed before a successful claim', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    const emitted: ClaimResult[] = [];
    comp.deviceClaimed.subscribe((r: ClaimResult) => emitted.push(r));
    comp.onSheetDismiss();
    expect(emitted).toHaveLength(0);
  });

  it('resets state after dismiss', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    type Priv = { step: ReturnType<typeof signal<string>>; claimResult: ReturnType<typeof signal<ClaimResult | null>> };
    const priv = comp as unknown as Priv;
    comp.deviceId.set('RPI-001');
    await comp.onClaim();
    comp.onSheetDismiss();
    expect(priv.step()).toBe('form');
    expect(comp.deviceId()).toBe('');
    expect(priv.claimResult()).toBeNull();
  });

  it('computes minutesLeft from expiresAt', async () => {
    const { fixture } = await renderComponent();
    const comp = fixture.componentInstance;
    comp.deviceId.set('RPI-001');
    await comp.onClaim();
    expect(comp.minutesLeft()).toBeGreaterThan(0);
    expect(comp.minutesLeft()).toBeLessThanOrEqual(30);
  });
});
