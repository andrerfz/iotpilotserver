import { inject, Injectable, signal, Signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { getDevice } from '@ng/core/api/generated/fn/devices/get-device';
import { deleteDevice } from '@ng/core/api/generated/fn/devices/delete-device';
import { deleteDeviceAlert as deleteDeviceAlertFn } from '@ng/core/api/generated/fn/devices/delete-device-alert';
import { listDeviceAlerts } from '@ng/core/api/generated/fn/devices/list-device-alerts';
import { listDeviceCommands } from '@ng/core/api/generated/fn/devices/list-device-commands';
import { getDeviceLogs } from '@ng/core/api/generated/fn/devices/get-device-logs';
import { getDeviceMetrics } from '@ng/core/api/generated/fn/devices/get-device-metrics';
import { getDeviceSettings } from '@ng/core/api/generated/fn/devices/get-device-settings';
import { updateDeviceSettings } from '@ng/core/api/generated/fn/devices/update-device-settings';
import { executeDeviceSsh } from '@ng/core/api/generated/fn/devices/execute-device-ssh';
import { rotateDeviceKey } from '@ng/core/api/generated/fn/devices/rotate-device-key';
import { listThresholds } from '@ng/core/api/generated/fn/monitoring/list-thresholds';
import { createDeviceCommand } from '@ng/core/api/generated/fn/devices/create-device-command';
import { updateDeviceAlert } from '@ng/core/api/generated/fn/devices/update-device-alert';
import { createThreshold } from '@ng/core/api/generated/fn/monitoring/create-threshold';
import { updateThreshold } from '@ng/core/api/generated/fn/monitoring/update-threshold';
import { deleteThreshold } from '@ng/core/api/generated/fn/monitoring/delete-threshold';
import { claimDevice as claimDeviceFn } from '@ng/core/api/generated/fn/devices/claim-device';
import { updateDevice as updateDeviceFn } from '@ng/core/api/generated/fn/devices/update-device';
import type { ListDeviceAlerts$Params } from '@ng/core/api/generated/fn/devices/list-device-alerts';
import type { ListDeviceCommands$Params } from '@ng/core/api/generated/fn/devices/list-device-commands';
import type { GetDeviceLogs$Params } from '@ng/core/api/generated/fn/devices/get-device-logs';
import type { GetDeviceMetrics$Params } from '@ng/core/api/generated/fn/devices/get-device-metrics';
import type { ListThresholds$Params } from '@ng/core/api/generated/fn/monitoring/list-thresholds';
import type { CreateThreshold$Params } from '@ng/core/api/generated/fn/monitoring/create-threshold';
import type { UpdateThreshold$Params } from '@ng/core/api/generated/fn/monitoring/update-threshold';
import type { Device } from '@ng/core/api/generated/models/device';
import type { Alert } from '@ng/core/api/generated/models/alert';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';
import type { DeviceLogEntry } from '@ng/core/api/generated/models/device-log-entry';
import type { DeviceMetrics } from '@ng/core/api/generated/models/device-metrics';
import type { DeviceSettings } from '@ng/core/api/generated/models/device-settings';
import type { SshResult } from '@ng/core/api/generated/models/ssh-result';
import type { Threshold } from '@ng/core/api/generated/models/threshold';
import type { ClaimResult } from '@ng/core/api/generated/models/claim-result';
import { ApiError } from '@ng/core/errors/api-error';

export interface QuerySurface<T, P> {
  readonly data: Signal<T | null>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<ApiError | null>;
  load(params?: P): Promise<T | null>;
  reload(): Promise<T | null>;
}

function makeSurface<T, P>(
  fetcher: (params?: P) => Promise<T>,
): QuerySurface<T, P> {
  const data = signal<T | null>(null);
  const loading = signal(false);
  const error = signal<ApiError | null>(null);
  let lastParams: P | undefined;

  async function load(params?: P): Promise<T | null> {
    lastParams = params;
    loading.set(true);
    error.set(null);
    try {
      const result = await fetcher(params);
      data.set(result);
      return result;
    } catch (e) {
      error.set(
        e instanceof ApiError
          ? e
          : new ApiError(0, 'UNKNOWN', e instanceof Error ? e.message : String(e)),
      );
      return null;
    } finally {
      loading.set(false);
    }
  }

  return {
    data: data.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    load,
    reload: () => load(lastParams),
  };
}

export type CreateThresholdPayload = CreateThreshold$Params['body'];
export type UpdateThresholdPayload = UpdateThreshold$Params['body'];
export type UpdateDevicePayload = { hostname?: string; location?: string; description?: string; tags?: string[] };
export type { DeviceMetrics, DeviceSettings, SshResult };

@Injectable()
export class DeviceDetailService {
  private readonly api = inject(Api);

  readonly device = makeSurface<Device, { id: string }>(
    async (params) => {
      const res = await this.api.invoke(getDevice, { id: params!.id });
      // The endpoint wraps the device in { success, data, timestamp } just like
      // the list endpoints below — unwrap it. (This surface previously returned
      // the raw envelope, so every field — hostname, status, metrics — read as
      // undefined and the detail header/cards rendered empty.)
      const d = (res as { data?: Device }).data ?? (res as Device);
      // Detail serializes connectivity as `rawStatus` (ONLINE/OFFLINE/…) while
      // `status` carries a lifecycle value ("active"); the UI/StatusBadge expect
      // the enum, so prefer rawStatus when present (matches the list endpoint).
      return d.rawStatus ? { ...d, status: d.rawStatus } : d;
    },
  );

  readonly deviceAlerts = makeSurface<Alert[], ListDeviceAlerts$Params>(
    async (params) => {
      const res = await this.api.invoke(listDeviceAlerts, params!);
      return (res as { data?: Alert[] }).data ?? [];
    },
  );

  readonly deviceCommands = makeSurface<DeviceCommand[], ListDeviceCommands$Params>(
    async (params) => {
      const res = await this.api.invoke(listDeviceCommands, params!);
      return (res as { data?: DeviceCommand[] }).data ?? [];
    },
  );

  readonly deviceLogs = makeSurface<DeviceLogEntry[], GetDeviceLogs$Params>(
    async (params) => {
      const res = await this.api.invoke(getDeviceLogs, params!);
      return (res as { data?: DeviceLogEntry[] }).data ?? [];
    },
  );

  readonly thresholds = makeSurface<Threshold[], ListThresholds$Params>(
    async (params) => {
      const res = await this.api.invoke(listThresholds, params);
      // Backend wraps the list under data.thresholds ({ thresholds, filters,
      // summary }). Tolerate a bare array too, in case the contract is later
      // normalised — otherwise `.data` is an object and `.filter` blows up.
      const payload = (res as { data?: unknown }).data;
      return Array.isArray(payload)
        ? (payload as Threshold[])
        : ((payload as { thresholds?: Threshold[] })?.thresholds ?? []);
    },
  );

  readonly deviceMetrics = makeSurface<DeviceMetrics, GetDeviceMetrics$Params>(
    async (params) => {
      const res = await this.api.invoke(getDeviceMetrics, params!);
      return (res as { data?: DeviceMetrics }).data ?? { metrics: {}, period: '24h', resolution: 'auto', total_points: 0, processed_points: 0 };
    },
  );

  readonly deviceSettings = makeSurface<DeviceSettings, { id: string }>(
    async (params) => {
      const res = await this.api.invoke(getDeviceSettings, { id: params!.id });
      return (res as { data?: DeviceSettings }).data ?? (res as DeviceSettings);
    },
  );

  async sendCommand(
    deviceId: string,
    command: 'REBOOT' | 'SHUTDOWN' | 'UPDATE' | 'RESTART' | 'CUSTOM',
    args?: string,
  ): Promise<DeviceCommand> {
    const res = await this.api.invoke(createDeviceCommand, {
      id: deviceId,
      body: { command, arguments: args },
    });
    void this.deviceCommands.reload();
    return res as DeviceCommand;
  }

  async updateAlert(
    deviceId: string,
    alertId: string,
    action: 'acknowledge' | 'resolve',
    note?: string,
  ): Promise<void> {
    await this.api.invoke(updateDeviceAlert, {
      id: deviceId,
      alertId,
      body: { action, note },
    });
    void this.deviceAlerts.reload();
  }

  async createThreshold(payload: CreateThresholdPayload): Promise<void> {
    await this.api.invoke(createThreshold, { body: payload });
    void this.thresholds.reload();
  }

  async updateThreshold(id: string, payload: UpdateThresholdPayload): Promise<void> {
    await this.api.invoke(updateThreshold, { id, body: payload });
    void this.thresholds.reload();
  }

  async deleteThreshold(id: string): Promise<void> {
    await this.api.invoke(deleteThreshold, { id });
    void this.thresholds.reload();
  }

  async regenerateToken(deviceId: string, hostname: string): Promise<ClaimResult> {
    const res = await this.api.invoke(claimDeviceFn, { body: { deviceId, name: hostname } });
    const result = (res as { data?: ClaimResult }).data;
    if (!result) throw new Error('No claim result returned');
    return result;
  }

  async updateDevice(id: string, payload: UpdateDevicePayload): Promise<void> {
    await this.api.invoke(updateDeviceFn, { id, body: payload });
    void this.device.reload();
  }

  async executeSSH(deviceId: string, command: string, timeout?: number): Promise<SshResult> {
    const res = await this.api.invoke(executeDeviceSsh, {
      id: deviceId,
      body: { command, ...(timeout !== undefined ? { timeout } : {}) },
    });
    const result = (res as { data?: SshResult }).data;
    if (!result) throw new Error('No SSH result returned');
    return result;
  }

  async updateSettings(id: string, payload: DeviceSettings): Promise<void> {
    await this.api.invoke(updateDeviceSettings, { id, body: payload });
    void this.deviceSettings.reload();
  }

  async rotateKey(id: string): Promise<{ apiKey: string; deviceId: string; rotatedAt: string }> {
    const res = await this.api.invoke(rotateDeviceKey, { id });
    const result = res as { apiKey?: string; deviceId?: string; rotatedAt?: string };
    if (!result.apiKey) throw new Error('No API key returned');
    return { apiKey: result.apiKey, deviceId: result.deviceId ?? id, rotatedAt: result.rotatedAt ?? '' };
  }

  async deleteDevice(id: string): Promise<void> {
    await this.api.invoke(deleteDevice, { id });
  }

  async deleteAlert(deviceId: string, alertId: string): Promise<void> {
    await this.api.invoke(deleteDeviceAlertFn, { id: deviceId, alertId });
  }
}
