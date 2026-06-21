import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceDetailPage } from './device-detail.page';
import { DeviceDetailService } from '../../services/device-detail.service';
import { SocketService } from '@ng/core/realtime/socket.service';
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
  hostname: 'pi-kitchen',
  status: 'ONLINE',
  deviceType: 'RaspberryPi',
  deviceId: 'ABC-123',
  ipAddress: '192.168.1.10',
  location: 'Kitchen',
  agentVersion: '2.1.0',
};

const UNCLAIMED_DEVICE: Device = {
  id: 'dev-2',
  hostname: 'pi-new',
  status: 'UNCLAIMED',
  deviceType: 'RaspberryPi',
};

function buildProviders(overrides: {
  device?: ReturnType<typeof makeSurface<Device>>;
  socketOn?: ReturnType<typeof vi.fn>;
} = {}) {
  const socketOn = overrides.socketOn ?? vi.fn().mockReturnValue(new Subject());
  // DeviceDetailService is component-scoped (providers: [DeviceDetailService] in @Component),
  // so the mock must go in componentProviders to shadow it at the component injector level.
  return {
    providers: [
      { provide: SocketService, useValue: { on: socketOn } },
    ],
    componentProviders: [
      {
        provide: DeviceDetailService,
        useValue: {
          device: overrides.device ?? makeSurface<Device>(MOCK_DEVICE),
          deviceAlerts: makeSurface(null),
          deviceCommands: makeSurface(null),
          deviceLogs: makeSurface(null),
          thresholds: makeSurface(null),
          regenerateToken: vi.fn(),
        },
      },
    ],
  };
}

describe('DeviceDetailPage', () => {
  describe('rendering', () => {
    it('shows device hostname when loaded', async () => {
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders(),
      });
      expect(screen.getByText('pi-kitchen')).toBeTruthy();
    });

    it('shows device type', async () => {
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders(),
      });
      expect(screen.getByText('RaspberryPi')).toBeTruthy();
    });

    it('shows loading skeleton while loading', async () => {
      const device = makeSurface<Device>(null);
      device.loading.set(true);
      const { container } = await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders({ device }),
      });
      expect(container.querySelector('ion-skeleton-text')).toBeTruthy();
    });

    it('shows error state when device fails to load', async () => {
      const device = makeSurface<Device>(null);
      device.error.set({ message: 'Not found', code: 404, errorCode: 'NOT_FOUND' } as never);
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders({ device }),
      });
      expect(screen.getByText('Device not found')).toBeTruthy();
    });
  });

  describe('PENDING_SETUP banner', () => {
    it('shows banner when status is UNCLAIMED', async () => {
      const device = makeSurface<Device>(UNCLAIMED_DEVICE);
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders({ device }),
      });
      expect(screen.getByText(/pending activation/i)).toBeTruthy();
    });

    it('does not show banner when status is ONLINE', async () => {
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders(),
      });
      expect(screen.queryByText(/pending activation/i)).toBeNull();
    });
  });

  describe('meta row', () => {
    it('shows IP address in meta row', async () => {
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders(),
      });
      expect(screen.getByText(/192\.168\.1\.10/)).toBeTruthy();
    });

    it('shows location in meta row', async () => {
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders(),
      });
      expect(screen.getByText('Kitchen')).toBeTruthy();
    });
  });

  describe('socket subscription', () => {
    it('subscribes to device:update event on init', async () => {
      const socketOn = vi.fn().mockReturnValue(new Subject());
      await render(DeviceDetailPage, {
        imports: [RouterTestingModule],
        ...buildProviders({ socketOn }),
      });
      expect(socketOn).toHaveBeenCalledWith('device:update');
    });
  });
});
