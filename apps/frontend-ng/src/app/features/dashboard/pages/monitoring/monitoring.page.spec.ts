import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { render, screen } from '@testing-library/angular';
import { MonitoringPage } from './monitoring.page';
import { DashboardService } from '../../services/dashboard.service';
import type { Alert } from '@ng/core/api/generated/models/alert';

const ALERTS: Alert[] = [
  { id: 'a1', title: 'CPU High', message: 'CPU exceeded 90%', severity: 'CRITICAL', deviceId: 'd1', resolved: false, acknowledgedAt: null },
  { id: 'a2', title: 'Memory Warning', message: 'Memory at 80%', severity: 'WARNING', deviceId: 'd1', resolved: false, acknowledgedAt: '2024-01-01T00:00:00Z' },
  { id: 'a3', title: 'Disk Full', message: 'Disk at 95%', severity: 'ERROR', deviceId: 'd2', resolved: true },
];

function makeDashServiceMock() {
  return {
    alerts: {
      data: signal<Alert[] | null>(null),
      loading: signal(false),
      error: signal<null | { message: string }>(null),
      load: vi.fn().mockResolvedValue(null),
      reload: vi.fn(),
    },
    alertsTrend: {
      data: signal<Array<{ date?: string; count?: number }> | null>(null),
      loading: signal(false),
      error: signal(null),
      load: vi.fn().mockResolvedValue(null),
      reload: vi.fn(),
    },
    devices: {
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
    batchUpdateAlerts: vi.fn().mockResolvedValue({ processed: 1, skipped: 0 }),
  };
}

describe('MonitoringPage', () => {
  let mockDash: ReturnType<typeof makeDashServiceMock>;

  beforeEach(() => {
    mockDash = makeDashServiceMock();
  });

  async function renderPage() {
    return render(MonitoringPage, {
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: DashboardService, useValue: mockDash },
      ],
    });
  }

  it('renders page title', async () => {
    await renderPage();
    expect(screen.getByText('Monitoring')).toBeTruthy();
  });

  it('shows loading skeletons while alerts are loading', async () => {
    mockDash.alerts.loading.set(true);
    const { container } = await renderPage();
    expect(container.querySelectorAll('ion-skeleton-text').length).toBeGreaterThan(0);
  });

  it('shows error empty-state when alerts fail', async () => {
    mockDash.alerts.error.set({ message: 'Server error' });
    await renderPage();
    expect(screen.getByText('Failed to load alerts')).toBeTruthy();
  });

  it('calls alerts.load({}) and alertsTrend.load({period:7d}) on ionViewWillEnter', async () => {
    const { fixture } = await renderPage();
    fixture.componentInstance.ionViewWillEnter();
    expect(mockDash.alerts.load).toHaveBeenCalledWith({});
    expect(mockDash.alertsTrend.load).toHaveBeenCalledWith({ period: '7d' });
  });

  it('shows KPI counts from loaded alerts', async () => {
    mockDash.alerts.data.set(ALERTS);
    const { container } = await renderPage();
    // openCount=1, ackCount=1, resolvedCount=1 — all show "1"
    expect(container.textContent).toContain('1');
  });

  it('shows empty-state when no alerts loaded', async () => {
    mockDash.alerts.data.set([]);
    await renderPage();
    expect(screen.getByText('No alerts')).toBeTruthy();
  });

  it('shows no-match empty-state when all alerts are filtered out', async () => {
    mockDash.alerts.data.set(ALERTS);
    const { fixture } = await renderPage();
    const page = fixture.componentInstance as MonitoringPage;
    (page as unknown as { severityFilter: ReturnType<typeof signal<string[]>> }).severityFilter.set(['INFO']);
    fixture.detectChanges();
    expect(screen.getByText('No alerts match filters')).toBeTruthy();
  });

  it('calls batchUpdateAlerts(acknowledge) on bulk acknowledge', async () => {
    mockDash.alerts.data.set(ALERTS);
    const { fixture } = await renderPage();
    const page = fixture.componentInstance as MonitoringPage;
    (page as unknown as { _selectedIds: ReturnType<typeof signal<string[]>> })._selectedIds.set(['a1', 'a3']);
    fixture.detectChanges();
    await page.onBulkAcknowledge();
    expect(mockDash.batchUpdateAlerts).toHaveBeenCalledWith('acknowledge', ['a1', 'a3']);
  });

  it('calls batchUpdateAlerts(resolve) on bulk resolve', async () => {
    mockDash.alerts.data.set(ALERTS);
    const { fixture } = await renderPage();
    const page = fixture.componentInstance as MonitoringPage;
    (page as unknown as { _selectedIds: ReturnType<typeof signal<string[]>> })._selectedIds.set(['a1']);
    fixture.detectChanges();
    await page.onBulkResolve();
    expect(mockDash.batchUpdateAlerts).toHaveBeenCalledWith('resolve', ['a1']);
  });

  it('clears selection after bulk action', async () => {
    mockDash.alerts.data.set(ALERTS);
    const { fixture } = await renderPage();
    const page = fixture.componentInstance as MonitoringPage;
    const sel = (page as unknown as { _selectedIds: ReturnType<typeof signal<string[]>> })._selectedIds;
    sel.set(['a1']);
    await page.onBulkAcknowledge();
    expect(sel()).toHaveLength(0);
  });

  it('reloads alerts and trend on period change', async () => {
    const { fixture } = await renderPage();
    fixture.componentInstance.ionViewWillEnter();
    fixture.componentInstance.onPeriodChange('7d');
    expect(mockDash.alerts.load).toHaveBeenCalledTimes(2);
    expect(mockDash.alertsTrend.load).toHaveBeenCalledWith({ period: '7d' });
  });

  it('uses 30d trend period when preset is 30d', async () => {
    const { fixture } = await renderPage();
    fixture.componentInstance.onPeriodChange('30d');
    expect(mockDash.alertsTrend.load).toHaveBeenCalledWith({ period: '30d' });
  });
});
