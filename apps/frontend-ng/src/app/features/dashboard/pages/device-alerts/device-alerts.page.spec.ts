import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideEchartsCore } from 'ngx-echarts';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceAlertsPage } from './device-alerts.page';
import { DeviceDetailService } from '../../services/device-detail.service';
import { DashboardService } from '../../services/dashboard.service';
import { AlertsStream } from '@ng/core/realtime/alerts.stream';
import { ToastService } from '@ng/core/errors/toast.service';
import type { Alert } from '@ng/core/api/generated/models/alert';

function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

const MOCK_ALERTS: Alert[] = [
  { id: 'a1', title: 'High CPU', message: 'CPU usage above threshold', severity: 'ERROR', type: 'HIGH_CPU', resolved: false, createdAt: new Date(Date.now() - 60_000).toISOString() },
  { id: 'a2', title: 'Low Battery', message: 'Battery critical', severity: 'CRITICAL', type: 'CUSTOM', resolved: false, acknowledgedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 120_000).toISOString() },
  { id: 'a3', title: 'Device offline', message: 'No heartbeat', severity: 'WARNING', type: 'DEVICE_OFFLINE', resolved: true, resolvedAt: new Date().toISOString(), createdAt: new Date(Date.now() - 180_000).toISOString() },
];

const MOCK_TREND = [
  { date: '2026-06-07', count: 2 },
  { date: '2026-06-08', count: 5 },
  { date: '2026-06-09', count: 1 },
];

function buildProviders(overrides: {
  alerts?: ReturnType<typeof makeSurface<Alert[]>>;
  alertStream$?: Subject<Alert>;
  updateAlert?: ReturnType<typeof vi.fn>;
} = {}) {
  const alertStream$ = overrides.alertStream$ ?? new Subject<Alert>();
  const updateAlert = overrides.updateAlert ?? vi.fn().mockResolvedValue(undefined);
  return [
    provideHttpClient(),
    provideEchartsCore({ echarts: () => import('echarts') }),
    {
      provide: DeviceDetailService,
      useValue: {
        device: makeSurface(null),
        deviceAlerts: overrides.alerts ?? makeSurface<Alert[]>(MOCK_ALERTS),
        deviceCommands: makeSurface(null),
        deviceLogs: makeSurface(null),
        thresholds: makeSurface(null),
        sendCommand: vi.fn(),
        updateAlert,
      },
    },
    {
      provide: DashboardService,
      useValue: {
        alertsTrend: makeSurface(MOCK_TREND),
        devices: makeSurface(null),
        alerts: makeSurface(null),
        monitoringMetrics: makeSurface(null),
        claimDevice: vi.fn(),
        batchUpdateAlerts: vi.fn(),
      },
    },
    {
      provide: AlertsStream,
      useValue: { alerts$: alertStream$.asObservable() },
    },
    {
      provide: ToastService,
      useValue: {
        success: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
      },
    },
  ];
}

async function renderPage(overrides: Parameters<typeof buildProviders>[0] = {}) {
  return render(DeviceAlertsPage, {
    imports: [RouterTestingModule],
    providers: buildProviders(overrides),
  });
}

describe('DeviceAlertsPage', () => {
  describe('rendering', () => {
    it('shows alert titles in table', async () => {
      await renderPage();
      expect(screen.getByText('High CPU')).toBeTruthy();
      expect(screen.getByText('Low Battery')).toBeTruthy();
    });

    it('shows stats row', async () => {
      await renderPage();
      expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Acknowledged').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
    });

    it('shows trend chart when trend data is present', async () => {
      const { container } = await renderPage();
      expect(container.querySelector('.trend-chart')).toBeTruthy();
    });
  });

  describe('stats counts', () => {
    it('computes OPEN, ACK, RESOLVED counts correctly', async () => {
      const { fixture } = await renderPage();
      const comp = fixture.componentInstance;
      expect(comp.openCount()).toBe(1);
      expect(comp.ackCount()).toBe(1);
      expect(comp.resolvedCount()).toBe(1);
    });
  });

  describe('loading state', () => {
    it('shows skeleton while loading and no data', async () => {
      const alerts = makeSurface<Alert[]>(null);
      alerts.loading.set(true);
      const { container } = await renderPage({ alerts });
      expect(container.querySelector('ion-skeleton-text')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows "No alerts" when no data and not loading', async () => {
      const alerts = makeSurface<Alert[]>([]);
      await renderPage({ alerts });
      expect(screen.getAllByText(/No alerts/i).length).toBeGreaterThan(0);
    });

    it('shows filter hint when filters are active and result is empty', async () => {
      const { fixture } = await renderPage();
      const comp = fixture.componentInstance;
      comp.localAlerts.set([]);
      comp.severityFilter.set(['CRITICAL']);
      fixture.detectChanges();
      expect(screen.getByText(/Try adjusting your filters/i)).toBeTruthy();
    });
  });

  describe('data loading', () => {
    it('calls deviceAlerts.load on init', async () => {
      const alerts = makeSurface<Alert[]>(MOCK_ALERTS);
      await renderPage({ alerts });
      expect(alerts.load).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
    });

    it('calls alertsTrend.load on init', async () => {
      const { fixture } = await renderPage();
      const dashSvc = fixture.debugElement.injector.get(DashboardService);
      expect(dashSvc.alertsTrend.load).toHaveBeenCalledWith(
        expect.objectContaining({ period: '7d' }),
      );
    });
  });

  describe('severity filter', () => {
    it('filters alerts by severity', async () => {
      const { fixture } = await renderPage();
      const comp = fixture.componentInstance;
      comp.severityFilter.set(['CRITICAL']);
      const filtered = comp.filteredAlerts();
      expect(filtered.every(a => a.severity === 'CRITICAL')).toBe(true);
    });
  });

  describe('state filter', () => {
    it('filters alerts by state OPEN', async () => {
      const { fixture } = await renderPage();
      const comp = fixture.componentInstance;
      comp.stateFilter.set(['OPEN']);
      const filtered = comp.filteredAlerts();
      expect(filtered.every(a => !a.resolved && !a.acknowledgedAt)).toBe(true);
    });

    it('filters alerts by state RESOLVED', async () => {
      const { fixture } = await renderPage();
      const comp = fixture.componentInstance;
      comp.stateFilter.set(['RESOLVED']);
      const filtered = comp.filteredAlerts();
      expect(filtered.every(a => a.resolved)).toBe(true);
    });
  });

  describe('acknowledge action', () => {
    it('calls updateAlert with acknowledge for the correct alertId', async () => {
      const updateAlert = vi.fn().mockResolvedValue(undefined);
      const { fixture } = await renderPage({ updateAlert });
      await fixture.componentInstance.onAcknowledge(MOCK_ALERTS[0]);
      expect(updateAlert).toHaveBeenCalledWith(expect.any(String), 'a1', 'acknowledge');
    });

    it('optimistically sets acknowledgedAt on the local alert', async () => {
      const updateAlert = vi.fn().mockResolvedValue(undefined);
      const { fixture } = await renderPage({ updateAlert });
      const comp = fixture.componentInstance;
      await comp.onAcknowledge(MOCK_ALERTS[0]);
      const updated = comp.localAlerts().find(a => a.id === 'a1');
      expect(updated?.acknowledgedAt).toBeTruthy();
    });
  });

  describe('resolve action', () => {
    it('calls updateAlert with resolve for the correct alertId', async () => {
      const updateAlert = vi.fn().mockResolvedValue(undefined);
      const { fixture } = await renderPage({ updateAlert });
      await fixture.componentInstance.onResolve(MOCK_ALERTS[0]);
      expect(updateAlert).toHaveBeenCalledWith(expect.any(String), 'a1', 'resolve');
    });

    it('optimistically sets resolved=true on the local alert', async () => {
      const updateAlert = vi.fn().mockResolvedValue(undefined);
      const { fixture } = await renderPage({ updateAlert });
      const comp = fixture.componentInstance;
      await comp.onResolve(MOCK_ALERTS[0]);
      const updated = comp.localAlerts().find(a => a.id === 'a1');
      expect(updated?.resolved).toBe(true);
    });
  });

  describe('bulk actions', () => {
    it('onBulkAcknowledge calls updateAlert for each unacknowledged open alert', async () => {
      const updateAlert = vi.fn().mockResolvedValue(undefined);
      const { fixture } = await renderPage({ updateAlert });
      const comp = fixture.componentInstance;
      comp.selectedAlerts.set([MOCK_ALERTS[0], MOCK_ALERTS[2]]);
      await comp.onBulkAcknowledge();
      expect(updateAlert).toHaveBeenCalledWith(expect.any(String), 'a1', 'acknowledge');
      expect(updateAlert).not.toHaveBeenCalledWith(expect.any(String), 'a3', 'acknowledge');
    });

    it('onBulkResolve calls updateAlert for each unresolved alert', async () => {
      const updateAlert = vi.fn().mockResolvedValue(undefined);
      const { fixture } = await renderPage({ updateAlert });
      const comp = fixture.componentInstance;
      comp.selectedAlerts.set([MOCK_ALERTS[0], MOCK_ALERTS[1]]);
      await comp.onBulkResolve();
      expect(updateAlert).toHaveBeenCalledWith(expect.any(String), 'a1', 'resolve');
      expect(updateAlert).toHaveBeenCalledWith(expect.any(String), 'a2', 'resolve');
    });

    it('bulk action bar shows when alerts are selected', async () => {
      const { fixture } = await renderPage();
      fixture.componentInstance.selectedAlerts.set([MOCK_ALERTS[0]]);
      fixture.detectChanges();
      expect(screen.getByText('Acknowledge selected')).toBeTruthy();
      expect(screen.getByText('Resolve selected')).toBeTruthy();
    });
  });

  describe('real-time alerts', () => {
    it('prepends new alerts from alertsStream that match the device', async () => {
      const alertStream$ = new Subject<Alert>();
      const { fixture } = await renderPage({ alertStream$ });
      const comp = fixture.componentInstance;
      const deviceId = comp['deviceId']();
      const newAlert: Alert = { id: 'a-new', title: 'Realtime alert', severity: 'CRITICAL', deviceId, resolved: false };
      alertStream$.next(newAlert);
      expect(comp.localAlerts()[0].id).toBe('a-new');
    });

    it('ignores alerts from other devices', async () => {
      const alertStream$ = new Subject<Alert>();
      const { fixture } = await renderPage({ alertStream$ });
      const comp = fixture.componentInstance;
      const initialCount = comp.localAlerts().length;
      const foreignAlert: Alert = { id: 'a-foreign', title: 'Other device', severity: 'INFO', deviceId: 'other-device', resolved: false };
      alertStream$.next(foreignAlert);
      expect(comp.localAlerts().length).toBe(initialCount);
    });
  });

  describe('computed helpers', () => {
    it('hasFilters is false by default', async () => {
      const { fixture } = await renderPage();
      expect(fixture.componentInstance.hasFilters()).toBe(false);
    });

    it('hasFilters is true when severity filter is set', async () => {
      const { fixture } = await renderPage();
      fixture.componentInstance.severityFilter.set(['ERROR']);
      expect(fixture.componentInstance.hasFilters()).toBe(true);
    });

    it('formatAge returns sensible string', async () => {
      const { fixture } = await renderPage();
      const result = fixture.componentInstance.formatAge(new Date(Date.now() - 5 * 60_000).toISOString());
      expect(result).toBe('5m ago');
    });

    it('formatAge returns "—" for undefined', async () => {
      const { fixture } = await renderPage();
      expect(fixture.componentInstance.formatAge(undefined)).toBe('—');
    });
  });
});
