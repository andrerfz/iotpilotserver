import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Api } from '@ng/core/api/generated/api';
import { listDevices } from '@ng/core/api/generated/fn/devices/list-devices';
import { listAlerts } from '@ng/core/api/generated/fn/monitoring/list-alerts';
import { getMonitoringMetrics } from '@ng/core/api/generated/fn/monitoring/get-monitoring-metrics';
import type { Device } from '@ng/core/api/generated/models/device';
import type { Alert } from '@ng/core/api/generated/models/alert';
import type { MonitoringMetrics } from '@ng/core/api/generated/models/monitoring-metrics';
import { DashboardService } from './dashboard.service';
import { ApiError } from '@ng/core/errors/api-error';

const MOCK_DEVICES: Device[] = [
  { id: 'dev-1', hostname: 'pi-kitchen', status: 'ONLINE', deviceType: 'RaspberryPi' },
  { id: 'dev-2', hostname: 'pi-garage', status: 'OFFLINE', deviceType: 'RaspberryPi' },
];

const MOCK_ALERTS: Alert[] = [
  { id: 'alert-1', title: 'High CPU', severity: 'WARNING', deviceId: 'dev-1' },
];

const MOCK_METRICS: MonitoringMetrics = {
  metrics: [{ metricName: 'cpu_usage', value: 42, timestamp: '2026-06-12T00:00:00Z' }],
  summary: {},
};

function makeApi() {
  const invoke = vi.fn();
  return { invoke };
}

function setup(api = makeApi()) {
  TestBed.configureTestingModule({
    providers: [{ provide: Api, useValue: api }],
  });
  return { service: TestBed.inject(DashboardService), api };
}

describe('DashboardService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('devices surface', () => {
    it('starts with null data, not loading, no error', () => {
      const { service } = setup();
      expect(service.devices.data()).toBeNull();
      expect(service.devices.loading()).toBe(false);
      expect(service.devices.error()).toBeNull();
    });

    it('load() sets loading true then resolves data', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_DEVICES });
      const { service } = setup(api);

      await service.devices.load({ status: 'ONLINE', limit: 20 });

      expect(api.invoke).toHaveBeenCalledWith(listDevices, { status: 'ONLINE', limit: 20 });
      expect(service.devices.data()).toEqual(MOCK_DEVICES);
      expect(service.devices.loading()).toBe(false);
      expect(service.devices.error()).toBeNull();
    });

    it('load() falls back to empty array when data is absent', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({});
      const { service } = setup(api);

      await service.devices.load();

      expect(service.devices.data()).toEqual([]);
    });

    it('load() sets error signal on API failure', async () => {
      const api = makeApi();
      api.invoke.mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'Oops'));
      const { service } = setup(api);

      const result = await service.devices.load();

      expect(result).toBeNull();
      expect(service.devices.error()).toBeInstanceOf(ApiError);
      expect(service.devices.data()).toBeNull();
    });

    it('reload() re-runs the last load with the same params', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_DEVICES });
      const { service } = setup(api);

      await service.devices.load({ search: 'pi' });
      await service.devices.reload();

      expect(api.invoke).toHaveBeenCalledTimes(2);
      expect(api.invoke.mock.calls[1][1]).toEqual({ search: 'pi' });
    });
  });

  describe('alerts surface', () => {
    it('load() populates alerts.data from API response', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_ALERTS });
      const { service } = setup(api);

      await service.alerts.load({ status: 'active', limit: 5 });

      expect(api.invoke).toHaveBeenCalledWith(listAlerts, { status: 'active', limit: 5 });
      expect(service.alerts.data()).toEqual(MOCK_ALERTS);
    });
  });

  describe('monitoringMetrics surface', () => {
    it('load() populates monitoringMetrics.data from API response', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_METRICS });
      const { service } = setup(api);

      await service.monitoringMetrics.load({ period: '24h' });

      expect(api.invoke).toHaveBeenCalledWith(getMonitoringMetrics, { period: '24h' });
      expect(service.monitoringMetrics.data()).toEqual(MOCK_METRICS);
    });

    it('load() falls back to empty object when data is absent', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({});
      const { service } = setup(api);

      await service.monitoringMetrics.load();

      expect(service.monitoringMetrics.data()).toEqual({});
    });
  });

  describe('alertsTrend surface', () => {
    it('unwraps the { success, data, timestamp } envelope', async () => {
      const trend = [{ date: '2026-06-01', bySeverity: { WARNING: 2 } }];
      const api = makeApi();
      api.invoke.mockResolvedValue({ success: true, data: trend, timestamp: '2026-06-12T00:00:00Z' });
      const { service } = setup(api);

      await service.alertsTrend.load({ days: 7 });

      expect(service.alertsTrend.data()).toEqual(trend);
    });

    it('falls back to an empty array when data is absent', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ success: true, timestamp: '2026-06-12T00:00:00Z' });
      const { service } = setup(api);

      await service.alertsTrend.load({ days: 7 });

      expect(service.alertsTrend.data()).toEqual([]);
    });
  });

  describe('batchUpdateAlerts', () => {
    it('unwraps the envelope to return processed/skipped counts', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ success: true, data: { processed: 3, skipped: 1 }, timestamp: '2026-06-12T00:00:00Z' });
      const { service } = setup(api);

      const result = await service.batchUpdateAlerts('acknowledge', ['a1', 'a2', 'a3', 'a4']);

      expect(result).toEqual({ processed: 3, skipped: 1 });
    });
  });
});
