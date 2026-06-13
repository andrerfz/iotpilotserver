import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceCommandsPage } from './device-commands.page';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';
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

const MOCK_DEVICE: Device = { id: 'dev-1', hostname: 'pi-kitchen', status: 'ONLINE', deviceType: 'RaspberryPi' };
const MOCK_COMMANDS: DeviceCommand[] = [
  { id: 'cmd-1', command: 'REBOOT', status: 'COMPLETED', createdAt: '2026-06-13T09:00:00Z' },
  { id: 'cmd-2', command: 'UPDATE', status: 'PENDING', createdAt: '2026-06-13T09:30:00Z' },
];

function buildProviders(overrides: {
  device?: ReturnType<typeof makeSurface<Device>>;
  commands?: ReturnType<typeof makeSurface<DeviceCommand[]>>;
  sendCommand?: ReturnType<typeof vi.fn>;
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
        sendCommand: overrides.sendCommand ?? vi.fn().mockResolvedValue(MOCK_COMMANDS[0]),
      },
    },
    {
      provide: ToastService,
      useValue: { success: vi.fn().mockResolvedValue(undefined), error: vi.fn().mockResolvedValue(undefined) },
    },
  ];
}

describe('DeviceCommandsPage', () => {
  describe('rendering', () => {
    it('shows Quick Actions panel', async () => {
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('Quick Actions')).toBeTruthy();
    });

    it('renders all 4 quick action buttons', async () => {
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('Reboot')).toBeTruthy();
      expect(screen.getByText('Shutdown')).toBeTruthy();
      expect(screen.getByText('Update System')).toBeTruthy();
      expect(screen.getByText('Restart Services')).toBeTruthy();
    });

    it('shows Issue Command button', async () => {
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText(/Issue Command/i)).toBeTruthy();
    });

    it('shows commands in table', async () => {
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('REBOOT')).toBeTruthy();
      expect(screen.getByText('UPDATE')).toBeTruthy();
    });

    it('shows empty state when no commands', async () => {
      const commands = makeSurface<DeviceCommand[]>([]);
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ commands }),
      });
      expect(screen.getByText(/No commands yet/i)).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shows skeleton while loading', async () => {
      const commands = makeSurface<DeviceCommand[]>(null);
      commands.loading.set(true);
      const { container } = await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ commands }),
      });
      expect(container.querySelector('ion-skeleton-text')).toBeTruthy();
    });
  });

  describe('offline banner', () => {
    it('shows offline banner when device is OFFLINE', async () => {
      const device = makeSurface<Device>({ ...MOCK_DEVICE, status: 'OFFLINE' });
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ device }),
      });
      expect(screen.getByText(/offline/i)).toBeTruthy();
    });

    it('does not show offline banner when device is ONLINE', async () => {
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.queryByText(/device is offline/i)).toBeNull();
    });
  });

  describe('confirmation flow', () => {
    it('shows confirmation when clicking Reboot', async () => {
      const { fixture } = await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      const component = fixture.componentInstance;
      component.onQuickAction({ id: 'REBOOT', label: 'Reboot', description: 'Restart', icon: '', color: 'warning', requiresConfirmation: true });
      fixture.detectChanges();
      expect(screen.getByText('Confirm')).toBeTruthy();
    });

    it('dispatches command immediately for non-confirmation actions', async () => {
      const sendCommand = vi.fn().mockResolvedValue(MOCK_COMMANDS[0]);
      const { fixture } = await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ sendCommand }),
      });
      const component = fixture.componentInstance;
      component.onQuickAction({ id: 'RESTART', label: 'Restart', description: 'Restart services', icon: '', color: 'secondary', requiresConfirmation: false });
      await new Promise(r => setTimeout(r, 10));
      expect(sendCommand).toHaveBeenCalledWith(expect.any(String), 'RESTART');
    });

    it('cancels confirmation on Cancel click', async () => {
      const { fixture } = await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      const component = fixture.componentInstance;
      component.onQuickAction({ id: 'REBOOT', label: 'Reboot', description: 'Restart', icon: '', color: 'warning', requiresConfirmation: true });
      fixture.detectChanges();
      component.onCancelAction();
      fixture.detectChanges();
      expect(screen.queryByText('Confirm')).toBeNull();
    });
  });

  describe('data loading', () => {
    it('calls load on init', async () => {
      const commands = makeSurface<DeviceCommand[]>(MOCK_COMMANDS);
      await render(DeviceCommandsPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ commands }),
      });
      expect(commands.load).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    });
  });
});
