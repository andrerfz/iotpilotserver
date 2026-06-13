import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceStoragePage } from './device-storage.page';
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

type DeviceWithStorage = Device & {
  diskUsage?: number | null;
  diskTotal?: string | null;
  loadAverage?: string | null;
  uptime?: string | null;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  memoryTotal?: number | null;
};

const MOCK_DEVICE: DeviceWithStorage = {
  id: 'dev-1',
  hostname: 'pi-lab',
  status: 'ONLINE',
  diskUsage: 62.5,
  diskTotal: '32 GB',
  cpuUsage: 45.2,
  memoryUsage: 78.0,
  memoryTotal: 4096,
  loadAverage: '0.82 0.75 0.71',
  uptime: '12 days, 4h',
};

function buildProviders(device?: ReturnType<typeof makeSurface<Device>>) {
  return [
    {
      provide: DeviceDetailService,
      useValue: { device: device ?? makeSurface<Device>(MOCK_DEVICE as Device) },
    },
  ];
}

describe('DeviceStoragePage', () => {
  describe('rendering', () => {
    it('renders section headers', async () => {
      await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('Disk Usage')).toBeTruthy();
      expect(screen.getByText('Memory Usage')).toBeTruthy();
      expect(screen.getByText('System Load')).toBeTruthy();
    });

    it('shows disk total', async () => {
      await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('32 GB')).toBeTruthy();
    });

    it('shows load average', async () => {
      await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('0.82 0.75 0.71')).toBeTruthy();
    });

    it('shows uptime', async () => {
      await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('12 days, 4h')).toBeTruthy();
    });

    it('shows loading skeletons while loading', async () => {
      const device = makeSurface<Device>(null);
      device.loading.set(true);
      const { container } = await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(device),
      });
      expect(container.querySelector('ion-skeleton-text')).toBeTruthy();
    });

    it('shows error state when load fails', async () => {
      const device = makeSurface<Device>(null);
      device.error.set({ message: 'Not found', code: 404, errorCode: 'NOT_FOUND' } as never);
      await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(device),
      });
      expect(screen.getByText('Could not load storage info')).toBeTruthy();
    });

    it('shows no-data message when disk data absent', async () => {
      const device = makeSurface<Device>({ id: 'dev-2', hostname: 'bare' } as Device);
      await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(device),
      });
      expect(screen.getAllByText('No disk data available').length).toBeGreaterThan(0);
    });
  });

  describe('barColor', () => {
    it('returns danger color for >= 90%', async () => {
      const { fixture } = await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(fixture.componentInstance.barColor(90)).toBe('var(--danger)');
      expect(fixture.componentInstance.barColor(95)).toBe('var(--danger)');
    });

    it('returns warning color for 75–89%', async () => {
      const { fixture } = await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(fixture.componentInstance.barColor(75)).toBe('var(--warning)');
    });

    it('returns success color below 75%', async () => {
      const { fixture } = await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(fixture.componentInstance.barColor(50)).toBe('var(--success)');
    });
  });

  describe('formatMemory', () => {
    it('formats MB as GB', async () => {
      const { fixture } = await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(fixture.componentInstance.formatMemory(4096)).toBe('4.0 GB');
    });

    it('returns dash for null', async () => {
      const { fixture } = await render(DeviceStoragePage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(fixture.componentInstance.formatMemory(null)).toBe('—');
    });
  });
});
