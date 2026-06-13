import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceOverviewPage } from './device-overview.page';
import { DeviceDetailService } from '../../services/device-detail.service';
import type { Device } from '@ng/core/api/generated/models/device';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';

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
  hostname: 'pi-kitchen',
  status: 'ONLINE',
  deviceType: 'RaspberryPi',
  deviceId: 'ABC-123',
  ipAddress: '192.168.1.10',
  location: 'Kitchen',
  agentVersion: '2.1.0',
  tailscaleIp: '100.64.0.1',
  lastSeen: '2026-06-13T10:00:00Z',
};

const MOCK_COMMANDS: DeviceCommand[] = [
  { id: 'cmd-1', command: 'REBOOT', status: 'COMPLETED', createdAt: '2026-06-13T09:00:00Z' },
  { id: 'cmd-2', command: 'UPDATE', status: 'PENDING', createdAt: '2026-06-13T09:30:00Z' },
];

function buildProviders(overrides: {
  device?: ReturnType<typeof makeSurface<Device>>;
  commands?: ReturnType<typeof makeSurface<DeviceCommand[]>>;
} = {}) {
  return [
    {
      provide: DeviceDetailService,
      useValue: {
        device: overrides.device ?? makeSurface<Device>(MOCK_DEVICE),
        deviceCommands: overrides.commands ?? makeSurface<DeviceCommand[]>(MOCK_COMMANDS),
        deviceAlerts: makeSurface(null),
        deviceLogs: makeSurface(null),
        thresholds: makeSurface(null),
      },
    },
  ];
}

describe('DeviceOverviewPage', () => {
  describe('metric cards', () => {
    it('shows 4 metric cards', async () => {
      const { container } = await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      const cards = container.querySelectorAll('ui-metric-card');
      expect(cards.length).toBe(4);
    });

    it('shows -- when cpu data is not available', async () => {
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getAllByText('--').length).toBeGreaterThan(0);
    });
  });

  describe('loading state', () => {
    it('shows skeleton cards while loading', async () => {
      const device = makeSurface<Device>(null);
      device.loading.set(true);
      const { container } = await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ device }),
      });
      expect(container.querySelector('ion-skeleton-text')).toBeTruthy();
    });
  });

  describe('device info card', () => {
    it('shows hardware ID in info grid', async () => {
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('ABC-123')).toBeTruthy();
    });

    it('shows IP address in info grid', async () => {
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('192.168.1.10')).toBeTruthy();
    });

    it('shows Tailscale IP when present', async () => {
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('100.64.0.1')).toBeTruthy();
    });

    it('shows device type', async () => {
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('RaspberryPi')).toBeTruthy();
    });
  });

  describe('commands section', () => {
    it('shows commands in data table', async () => {
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('REBOOT')).toBeTruthy();
    });

    it('shows empty state when no commands', async () => {
      const commands = makeSurface<DeviceCommand[]>([]);
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ commands }),
      });
      expect(screen.getByText('No commands yet')).toBeTruthy();
    });
  });

  describe('data loading', () => {
    it('calls load on init with parent device id', async () => {
      const commands = makeSurface<DeviceCommand[]>(MOCK_COMMANDS);
      await render(DeviceOverviewPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ commands }),
      });
      expect(commands.load).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
    });
  });
});
