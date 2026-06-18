import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { DashboardPage } from './dashboard.page';
import { DashboardService } from '../../services/dashboard.service';
import { AlertsStream } from '@ng/core/realtime/alerts.stream';
import { SocketService } from '@ng/core/realtime/socket.service';
import type { Alert } from '@ng/core/api/generated/models/alert';
import type { Device } from '@ng/core/api/generated/models/device';

// ── Minimal surface mock ──────────────────────────────────────────────────────
function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

const MOCK_DEVICES: Device[] = [
  { id: 'dev-1', hostname: 'pi-kitchen', status: 'ONLINE', deviceType: 'RaspberryPi' },
  { id: 'dev-2', hostname: 'pi-garage', status: 'OFFLINE', deviceType: 'RaspberryPi' },
];

const MOCK_ALERT: Alert = { id: 'a-1', title: 'High CPU', severity: 'WARNING', deviceId: 'dev-1' };

function buildProviders(overrides: {
  devices?: ReturnType<typeof makeSurface<Device[]>>;
  alerts?: ReturnType<typeof makeSurface<Alert[]>>;
  metrics?: ReturnType<typeof makeSurface>;
  alertSubject?: Subject<Alert>;
  socketOn?: ReturnType<typeof vi.fn>;
} = {}) {
  const alertSubject = overrides.alertSubject ?? new Subject<Alert>();
  const socketOn = overrides.socketOn ?? vi.fn().mockReturnValue(new Subject());

  const dashService = {
    devices: overrides.devices ?? makeSurface<Device[]>(MOCK_DEVICES),
    alerts: overrides.alerts ?? makeSurface<Alert[]>([MOCK_ALERT]),
    monitoringMetrics: overrides.metrics ?? makeSurface(null),
  };

  return [
    { provide: DashboardService, useValue: dashService },
    { provide: AlertsStream, useValue: { alerts$: alertSubject.asObservable() } },
    { provide: SocketService, useValue: { on: socketOn } },
  ];
}

describe('DashboardPage', () => {
  describe('rendering', () => {
    it('renders page title', async () => {
      await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText('Fleet overview')).toBeTruthy();
    });

    it('shows device count in subtitle', async () => {
      await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      expect(screen.getByText(/2 device/)).toBeTruthy();
    });

  });

  describe('loading state', () => {
    it('renders skeleton elements when devices are loading', async () => {
      const devices = makeSurface<Device[]>(null);
      devices.loading.set(true);
      const { container } = await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ devices }),
      });
      expect(container.querySelectorAll('.sk').length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows empty state with retry on device error', async () => {
      const devices = makeSurface<Device[]>(null);
      (devices.error as ReturnType<typeof signal>).set({ message: 'Network error' });
      await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ devices }),
      });
      expect(screen.getByText(/Failed to load devices/i)).toBeTruthy();
    });
  });

  describe('ionViewWillEnter', () => {
    it('calls load on all three surfaces when view enters', async () => {
      const devices = makeSurface<Device[]>(MOCK_DEVICES);
      const alerts = makeSurface<Alert[]>([MOCK_ALERT]);
      const metrics = makeSurface(null);

      const { fixture } = await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ devices, alerts, metrics }),
      });

      devices.load.mockClear();
      alerts.load.mockClear();
      metrics.load.mockClear();
      fixture.componentInstance.ionViewWillEnter();

      expect(devices.load).toHaveBeenCalledWith({});
      expect(alerts.load).toHaveBeenCalledWith({ status: 'active', limit: 5 });
      expect(metrics.load).toHaveBeenCalledWith(expect.objectContaining({ period: expect.any(String) }));
    });
  });

  describe('period change', () => {
    it('calls monitoringMetrics.load with the new period', async () => {
      const metrics = makeSurface(null);
      const { fixture } = await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ metrics }),
      });

      fixture.componentInstance.onPeriodChange('7d');
      expect(metrics.load).toHaveBeenCalledWith({ period: '7d' });
    });
  });

  describe('real-time alerts', () => {
    it('prepends a new alert:new event to live alerts', async () => {
      const alertSubject = new Subject<Alert>();
      const initial: Alert[] = [{ id: 'existing', title: 'Old', severity: 'INFO', deviceId: 'dev-1' }];
      const alerts = makeSurface<Alert[]>(initial);

      const { fixture } = await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ alerts, alertSubject }),
      });

      const incoming: Alert = { id: 'live-1', title: 'CPU spike', severity: 'CRITICAL', deviceId: 'dev-1' };
      alertSubject.next(incoming);
      fixture.detectChanges();

      // The new alert should now be in the live feed (checked via component state)
      const comp = fixture.componentInstance as unknown as { _liveAlerts: ReturnType<typeof signal<Alert[]>> };
      expect(comp['_liveAlerts']()[0].id).toBe('live-1');
    });
  });

  describe('device row click', () => {
    it('navigates to /app/devices/{id} on row click', async () => {
      const { fixture } = await render(DashboardPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });

      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      fixture.componentInstance.onDeviceRowClick({ id: 'dev-1', hostname: 'pi-kitchen', status: 'ONLINE' });

      expect(navigateSpy).toHaveBeenCalledWith(['/app/devices', 'dev-1']);
    });
  });
});
