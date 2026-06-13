import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { render, screen } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { DeviceLogsPage } from './device-logs.page';
import { DeviceDetailService } from '../../services/device-detail.service';
import type { DeviceLogEntry } from '@ng/core/api/generated/models/device-log-entry';

function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

const MOCK_LOGS: DeviceLogEntry[] = [
  { id: 'log-1', level: 'INFO', message: 'System started', source: 'kernel', timestamp: '2026-06-13T10:00:00Z' },
  { id: 'log-2', level: 'WARN', message: 'High CPU usage', source: 'monitor', timestamp: '2026-06-13T10:01:00Z' },
  { id: 'log-3', level: 'ERROR', message: 'Connection failed', source: 'agent', timestamp: '2026-06-13T10:02:00Z' },
];

function buildProviders(overrides: {
  logs?: ReturnType<typeof makeSurface<DeviceLogEntry[]>>;
} = {}) {
  return [
    provideHttpClient(),
    {
      provide: DeviceDetailService,
      useValue: {
        device: makeSurface(null),
        deviceCommands: makeSurface<DeviceLogEntry[]>([]),
        deviceAlerts: makeSurface(null),
        deviceLogs: overrides.logs ?? makeSurface<DeviceLogEntry[]>(MOCK_LOGS),
        thresholds: makeSurface(null),
        sendCommand: vi.fn(),
        updateAlert: vi.fn(),
      },
    },
  ];
}

async function renderPage(logs?: ReturnType<typeof makeSurface<DeviceLogEntry[]>>) {
  return render(DeviceLogsPage, {
    imports: [RouterTestingModule],
    providers: buildProviders(logs !== undefined ? { logs } : {}),
  });
}

describe('DeviceLogsPage', () => {
  describe('rendering', () => {
    it('shows log entries', async () => {
      await renderPage();
      expect(screen.getByText('System started')).toBeTruthy();
      expect(screen.getByText('High CPU usage')).toBeTruthy();
      expect(screen.getByText('Connection failed')).toBeTruthy();
    });

    it('shows entry count', async () => {
      await renderPage();
      expect(screen.getByText('3 entries')).toBeTruthy();
    });

    it('shows level values in table', async () => {
      await renderPage();
      expect(screen.getAllByText('INFO').length).toBeGreaterThan(0);
      expect(screen.getAllByText('WARN').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ERROR').length).toBeGreaterThan(0);
    });

    it('shows filter bar and action buttons', async () => {
      await renderPage();
      expect(screen.getByText(/Auto-refresh/i)).toBeTruthy();
      expect(screen.getByText('Refresh')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shows skeleton while loading and no data', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(null);
      logs.loading.set(true);
      const { container } = await renderPage(logs);
      expect(container.querySelector('ion-skeleton-text')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows "No logs found" when data is empty', async () => {
      const logs = makeSurface<DeviceLogEntry[]>([]);
      await renderPage(logs);
      expect(screen.getByText(/No logs found/i)).toBeTruthy();
    });

    it('shows device-has-no-logs message when no filters active', async () => {
      const logs = makeSurface<DeviceLogEntry[]>([]);
      await renderPage(logs);
      expect(screen.getByText(/This device has no log entries yet/i)).toBeTruthy();
    });

    it('shows filter hint when search is active', async () => {
      const logs = makeSurface<DeviceLogEntry[]>([]);
      const { fixture } = await renderPage(logs);
      fixture.componentInstance.search.set('something');
      fixture.detectChanges();
      expect(screen.getByText(/Try adjusting your filters/i)).toBeTruthy();
    });
  });

  describe('data loading', () => {
    it('calls load on init with limit 100', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(MOCK_LOGS);
      await renderPage(logs);
      expect(logs.load).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    });
  });

  describe('filter behavior', () => {
    it('onLevelChange calls load with level param', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(MOCK_LOGS);
      const { fixture } = await renderPage(logs);
      logs.load.mockClear();
      fixture.componentInstance.onLevelChange('ERROR');
      expect(logs.load).toHaveBeenCalledWith(expect.objectContaining({ level: 'ERROR' }));
    });

    it('onLevelChange with ALL omits level param', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(MOCK_LOGS);
      const { fixture } = await renderPage(logs);
      fixture.componentInstance.onLevelChange('WARN');
      logs.load.mockClear();
      fixture.componentInstance.onLevelChange('ALL');
      const callArg = logs.load.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArg['level']).toBeUndefined();
    });

    it('onSearchChange calls load with search param', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(MOCK_LOGS);
      const { fixture } = await renderPage(logs);
      logs.load.mockClear();
      fixture.componentInstance.onSearchChange('kernel');
      expect(logs.load).toHaveBeenCalledWith(expect.objectContaining({ search: 'kernel' }));
    });

    it('onSourceChange calls load with source param', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(MOCK_LOGS);
      const { fixture } = await renderPage(logs);
      logs.load.mockClear();
      fixture.componentInstance.onSourceChange('agent');
      expect(logs.load).toHaveBeenCalledWith(expect.objectContaining({ source: 'agent' }));
    });

    it('onClearFilters resets all signals', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(MOCK_LOGS);
      const { fixture } = await renderPage(logs);
      const comp = fixture.componentInstance;
      comp.levelFilter.set('ERROR');
      comp.search.set('kernel');
      comp.sourceFilter.set('agent');
      comp.onClearFilters();
      expect(comp.levelFilter()).toBe('ALL');
      expect(comp.search()).toBe('');
      expect(comp.sourceFilter()).toBe('');
    });

    it('hasFilters is false by default', async () => {
      const { fixture } = await renderPage();
      expect(fixture.componentInstance.hasFilters()).toBe(false);
    });

    it('hasFilters is true when search is set', async () => {
      const { fixture } = await renderPage();
      fixture.componentInstance.search.set('something');
      expect(fixture.componentInstance.hasFilters()).toBe(true);
    });

    it('hasFilters is true when level is not ALL', async () => {
      const { fixture } = await renderPage();
      fixture.componentInstance.levelFilter.set('ERROR');
      expect(fixture.componentInstance.hasFilters()).toBe(true);
    });

    it('hasFilters is true when source is set', async () => {
      const { fixture } = await renderPage();
      fixture.componentInstance.sourceFilter.set('kernel');
      expect(fixture.componentInstance.hasFilters()).toBe(true);
    });
  });

  describe('auto-refresh', () => {
    it('starts with auto-refresh OFF', async () => {
      const { fixture } = await renderPage();
      expect(fixture.componentInstance.autoRefresh()).toBe(false);
    });

    it('can be toggled on and off', async () => {
      const { fixture } = await renderPage();
      const comp = fixture.componentInstance;
      comp.autoRefresh.set(true);
      expect(comp.autoRefresh()).toBe(true);
      comp.autoRefresh.set(false);
      expect(comp.autoRefresh()).toBe(false);
    });
  });

  describe('manual refresh', () => {
    it('onRefresh calls load with current params', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(MOCK_LOGS);
      const { fixture } = await renderPage(logs);
      logs.load.mockClear();
      fixture.componentInstance.onRefresh();
      expect(logs.load).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    });
  });

  describe('error state', () => {
    it('shows retry button on error', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(null);
      logs.error.set({ message: 'Network error' } as never);
      await renderPage(logs);
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('onRetry calls load', async () => {
      const logs = makeSurface<DeviceLogEntry[]>(null);
      logs.error.set({ message: 'Network error' } as never);
      const { fixture } = await renderPage(logs);
      logs.load.mockClear();
      fixture.componentInstance.onRetry();
      expect(logs.load).toHaveBeenCalled();
    });
  });
});
