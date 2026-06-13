import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceNetworkPage } from './device-network.page';
import { DeviceDetailService } from '../../services/device-detail.service';
import type { Device } from '@ng/core/api/generated/models/device';

function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

const MOCK_DEVICE: Device = {
  id: 'dev-1',
  hostname: 'pi-lab',
  status: 'ONLINE',
  deviceType: 'RASPBERRY_PI',
  ipAddress: '10.0.0.5',
  tailscaleIp: '100.100.0.1',
  macAddress: 'AA:BB:CC:DD:EE:FF',
  location: 'Lab',
  agentVersion: '2.0.0',
  lastSeen: new Date().toISOString(),
};

function buildProviders(device?: ReturnType<typeof makeSurface<Device>>) {
  return [
    {
      provide: DeviceDetailService,
      useValue: { device: device ?? makeSurface<Device>(MOCK_DEVICE) },
    },
  ];
}

describe('DeviceNetworkPage', () => {
  describe('rendering', () => {
    it('renders section headers', async () => {
      await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('Connectivity')).toBeTruthy();
      expect(screen.getByText('IP Addresses')).toBeTruthy();
      expect(screen.getByText('Device Identity')).toBeTruthy();
    });

    it('shows IP address', async () => {
      await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('10.0.0.5')).toBeTruthy();
    });

    it('shows MAC address', async () => {
      await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeTruthy();
    });

    it('shows Tailscale IP', async () => {
      await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('100.100.0.1')).toBeTruthy();
    });

    it('shows hostname', async () => {
      await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('pi-lab')).toBeTruthy();
    });

    it('shows loading skeletons while loading', async () => {
      const device = makeSurface<Device>(null);
      device.loading.set(true);
      const { container } = await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(device),
      });
      expect(container.querySelector('ion-skeleton-text')).toBeTruthy();
    });

    it('shows error state when load fails', async () => {
      const device = makeSurface<Device>(null);
      device.error.set({ message: 'Not found', code: 404, errorCode: 'NOT_FOUND' } as never);
      await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(device),
      });
      expect(screen.getByText('Could not load network info')).toBeTruthy();
    });
  });

  describe('auto-refresh', () => {
    it('starts interval when auto-refresh enabled', async () => {
      const device = makeSurface<Device>(MOCK_DEVICE);
      const { fixture } = await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(device),
      });
      fixture.componentInstance.onAutoRefreshToggle(true);
      expect(fixture.componentInstance['autoRefresh']()).toBe(true);
      fixture.componentInstance.onAutoRefreshToggle(false);
    });

    it('stops interval when auto-refresh disabled', async () => {
      const { fixture } = await render(DeviceNetworkPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      fixture.componentInstance.onAutoRefreshToggle(true);
      fixture.componentInstance.onAutoRefreshToggle(false);
      expect(fixture.componentInstance['autoRefresh']()).toBe(false);
    });
  });
});
