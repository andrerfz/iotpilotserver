import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Api } from '@ng/core/api/generated/api';
import { getDevice } from '@ng/core/api/generated/fn/devices/get-device';
import { listDeviceAlerts } from '@ng/core/api/generated/fn/devices/list-device-alerts';
import { listDeviceCommands } from '@ng/core/api/generated/fn/devices/list-device-commands';
import { getDeviceLogs } from '@ng/core/api/generated/fn/devices/get-device-logs';
import { listThresholds } from '@ng/core/api/generated/fn/monitoring/list-thresholds';
import { createDeviceCommand } from '@ng/core/api/generated/fn/devices/create-device-command';
import { updateDeviceAlert } from '@ng/core/api/generated/fn/devices/update-device-alert';
import { getDeviceSettings } from '@ng/core/api/generated/fn/devices/get-device-settings';
import { updateDeviceSettings } from '@ng/core/api/generated/fn/devices/update-device-settings';
import type { Device } from '@ng/core/api/generated/models/device';
import type { DeviceSettings } from '@ng/core/api/generated/models/device-settings';
import type { Alert } from '@ng/core/api/generated/models/alert';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';
import type { DeviceLogEntry } from '@ng/core/api/generated/models/device-log-entry';
import type { Threshold } from '@ng/core/api/generated/models/threshold';
import { DeviceDetailService } from './device-detail.service';
import { ApiError } from '@ng/core/errors/api-error';

const MOCK_DEVICE: Device = {
  id: 'RPI-001',
  hostname: 'pi-kitchen',
  status: 'ONLINE',
  deviceType: 'RaspberryPi',
};

const MOCK_ALERTS: Alert[] = [
  { id: 'alert-1', title: 'High CPU', severity: 'WARNING', deviceId: 'RPI-001' },
];

const MOCK_COMMANDS: DeviceCommand[] = [
  { id: 'cmd-1', command: 'REBOOT', status: 'COMPLETED', createdAt: '2026-06-13T10:00:00Z' },
];

const MOCK_LOGS: DeviceLogEntry[] = [
  { id: 'log-1', level: 'INFO', message: 'Agent started', source: 'agent', timestamp: '2026-06-13T10:00:00Z', deviceId: 'RPI-001' },
];

const MOCK_SETTINGS: DeviceSettings = {
  hostname: 'pi-kitchen',
  location: 'Kitchen shelf',
  description: 'Temp/humidity sensor',
  tags: ['prod', 'sensor-array'],
  reportingInterval: 300,
};

const MOCK_THRESHOLDS: Threshold[] = [
  { id: 'thr-1', name: 'High CPU', metricName: 'cpu_usage', operator: 'GREATER_THAN', value: 80, unit: '%', severity: 'HIGH', type: 'STATIC' },
];

function makeApi() {
  return { invoke: vi.fn() };
}

function setup(api = makeApi()) {
  TestBed.configureTestingModule({
    providers: [DeviceDetailService, { provide: Api, useValue: api }],
  });
  return { service: TestBed.inject(DeviceDetailService), api };
}

describe('DeviceDetailService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('device surface', () => {
    it('starts with null data, not loading, no error', () => {
      const { service } = setup();
      expect(service.device.data()).toBeNull();
      expect(service.device.loading()).toBe(false);
      expect(service.device.error()).toBeNull();
    });

    it('load() invokes getDevice with id and populates data', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue(MOCK_DEVICE);
      const { service } = setup(api);

      await service.device.load({ id: 'RPI-001' });

      expect(api.invoke).toHaveBeenCalledWith(getDevice, { id: 'RPI-001' });
      expect(service.device.data()).toEqual(MOCK_DEVICE);
      expect(service.device.loading()).toBe(false);
      expect(service.device.error()).toBeNull();
    });

    it('load() sets error signal on API failure', async () => {
      const api = makeApi();
      api.invoke.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Device not found'));
      const { service } = setup(api);

      const result = await service.device.load({ id: 'MISSING' });

      expect(result).toBeNull();
      expect(service.device.error()).toBeInstanceOf(ApiError);
    });

    it('reload() re-runs the last load with the same params', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue(MOCK_DEVICE);
      const { service } = setup(api);

      await service.device.load({ id: 'RPI-001' });
      await service.device.reload();

      expect(api.invoke).toHaveBeenCalledTimes(2);
      expect(api.invoke.mock.calls[1][1]).toEqual({ id: 'RPI-001' });
    });
  });

  describe('deviceAlerts surface', () => {
    it('load() invokes listDeviceAlerts and populates data from response.data', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_ALERTS });
      const { service } = setup(api);

      await service.deviceAlerts.load({ id: 'RPI-001', severity: 'WARNING' });

      expect(api.invoke).toHaveBeenCalledWith(listDeviceAlerts, { id: 'RPI-001', severity: 'WARNING' });
      expect(service.deviceAlerts.data()).toEqual(MOCK_ALERTS);
    });

    it('load() falls back to empty array when data is absent', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({});
      const { service } = setup(api);

      await service.deviceAlerts.load({ id: 'RPI-001' });

      expect(service.deviceAlerts.data()).toEqual([]);
    });
  });

  describe('deviceCommands surface', () => {
    it('load() invokes listDeviceCommands and populates data from response.data', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_COMMANDS });
      const { service } = setup(api);

      await service.deviceCommands.load({ id: 'RPI-001', limit: 50 });

      expect(api.invoke).toHaveBeenCalledWith(listDeviceCommands, { id: 'RPI-001', limit: 50 });
      expect(service.deviceCommands.data()).toEqual(MOCK_COMMANDS);
    });
  });

  describe('deviceLogs surface', () => {
    it('load() invokes getDeviceLogs with filter params and populates data', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_LOGS });
      const { service } = setup(api);

      await service.deviceLogs.load({ id: 'RPI-001', level: 'INFO', limit: 100 });

      expect(api.invoke).toHaveBeenCalledWith(getDeviceLogs, { id: 'RPI-001', level: 'INFO', limit: 100 });
      expect(service.deviceLogs.data()).toEqual(MOCK_LOGS);
    });
  });

  describe('thresholds surface', () => {
    it('load() invokes listThresholds with deviceId and populates data', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_THRESHOLDS });
      const { service } = setup(api);

      await service.thresholds.load({ deviceId: 'RPI-001' });

      expect(api.invoke).toHaveBeenCalledWith(listThresholds, { deviceId: 'RPI-001' });
      expect(service.thresholds.data()).toEqual(MOCK_THRESHOLDS);
    });
  });

  describe('rotateKey', () => {
    it('unwraps the { success, data, timestamp } envelope (regression: always threw "No API key returned")', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({
        success: true,
        data: { message: 'rotated', apiKey: 'iotp_sensor_abc123', deviceId: 'RPI-001', rotatedAt: '2026-06-12T00:00:00Z' },
        timestamp: '2026-06-12T00:00:00Z',
      });
      const { service } = setup(api);

      const result = await service.rotateKey('RPI-001');

      expect(result).toEqual({ apiKey: 'iotp_sensor_abc123', deviceId: 'RPI-001', rotatedAt: '2026-06-12T00:00:00Z' });
    });

    it('throws when the envelope has no apiKey', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ success: true, data: {}, timestamp: '2026-06-12T00:00:00Z' });
      const { service } = setup(api);

      await expect(service.rotateKey('RPI-001')).rejects.toThrow('No API key returned');
    });
  });

  describe('sendCommand', () => {
    it('dispatches createDeviceCommand with correct payload', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue(MOCK_COMMANDS[0]);
      const { service } = setup(api);

      const result = await service.sendCommand('RPI-001', 'REBOOT');

      expect(api.invoke).toHaveBeenCalledWith(createDeviceCommand, {
        id: 'RPI-001',
        body: { command: 'REBOOT', arguments: undefined },
      });
      expect(result).toEqual(MOCK_COMMANDS[0]);
    });

    it('sends CUSTOM command with arguments', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ ...MOCK_COMMANDS[0], command: 'CUSTOM' });
      const { service } = setup(api);

      await service.sendCommand('RPI-001', 'CUSTOM', 'ls -la /tmp');

      expect(api.invoke).toHaveBeenCalledWith(createDeviceCommand, {
        id: 'RPI-001',
        body: { command: 'CUSTOM', arguments: 'ls -la /tmp' },
      });
    });

    it('triggers deviceCommands reload after successful dispatch', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue(MOCK_COMMANDS[0]);
      const { service } = setup(api);
      const reloadSpy = vi.spyOn(service.deviceCommands, 'reload').mockResolvedValue(null);

      await service.sendCommand('RPI-001', 'REBOOT');

      expect(reloadSpy).toHaveBeenCalledOnce();
    });

    it('throws on API failure', async () => {
      const api = makeApi();
      api.invoke.mockRejectedValue(new ApiError(400, 'BAD_REQUEST', 'Device offline'));
      const { service } = setup(api);

      await expect(service.sendCommand('RPI-001', 'REBOOT')).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('deviceSettings surface', () => {
    it('load() invokes getDeviceSettings and populates hostname/location/description/tags', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue({ data: MOCK_SETTINGS });
      const { service } = setup(api);

      await service.deviceSettings.load({ id: 'RPI-001' });

      expect(api.invoke).toHaveBeenCalledWith(getDeviceSettings, { id: 'RPI-001' });
      expect(service.deviceSettings.data()).toEqual(MOCK_SETTINGS);
    });
  });

  describe('updateSettings', () => {
    it('dispatches updateDeviceSettings with hostname/location/description/tags and reloads', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue(undefined);
      const { service } = setup(api);
      const reloadSpy = vi.spyOn(service.deviceSettings, 'reload').mockResolvedValue(null);

      await service.updateSettings('RPI-001', {
        hostname: 'pi-kitchen-2',
        location: 'Kitchen shelf',
        description: 'Temp/humidity sensor',
        tags: ['prod'],
      });

      expect(api.invoke).toHaveBeenCalledWith(updateDeviceSettings, {
        id: 'RPI-001',
        body: {
          hostname: 'pi-kitchen-2',
          location: 'Kitchen shelf',
          description: 'Temp/humidity sensor',
          tags: ['prod'],
        },
      });
      expect(reloadSpy).toHaveBeenCalledOnce();
    });
  });

  describe('updateAlert', () => {
    it('dispatches updateDeviceAlert with acknowledge action', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue(undefined);
      const { service } = setup(api);

      await service.updateAlert('RPI-001', 'alert-1', 'acknowledge', 'Investigating');

      expect(api.invoke).toHaveBeenCalledWith(updateDeviceAlert, {
        id: 'RPI-001',
        alertId: 'alert-1',
        body: { action: 'acknowledge', note: 'Investigating' },
      });
    });

    it('triggers deviceAlerts reload after success', async () => {
      const api = makeApi();
      api.invoke.mockResolvedValue(undefined);
      const { service } = setup(api);
      const reloadSpy = vi.spyOn(service.deviceAlerts, 'reload').mockResolvedValue(null);

      await service.updateAlert('RPI-001', 'alert-1', 'resolve');

      expect(reloadSpy).toHaveBeenCalledOnce();
    });
  });

  describe('error handling', () => {
    it('wraps non-ApiError in ApiError with UNKNOWN code', async () => {
      const api = makeApi();
      api.invoke.mockRejectedValue(new Error('Network error'));
      const { service } = setup(api);

      await service.device.load({ id: 'RPI-001' });

      const err = service.device.error();
      expect(err).toBeInstanceOf(ApiError);
      expect(err?.message).toBe('Network error');
    });
  });
});
