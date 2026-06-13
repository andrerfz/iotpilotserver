import { inject, Injectable, signal, Signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { listDevices } from '@ng/core/api/generated/fn/devices/list-devices';
import { listAlerts } from '@ng/core/api/generated/fn/monitoring/list-alerts';
import { getMonitoringMetrics } from '@ng/core/api/generated/fn/monitoring/get-monitoring-metrics';
import { getAlertsTrend } from '@ng/core/api/generated/fn/monitoring/get-alerts-trend';
import { batchUpdateAlerts } from '@ng/core/api/generated/fn/monitoring/batch-update-alerts';
import { claimDevice as claimDeviceFn } from '@ng/core/api/generated/fn/devices/claim-device';
import type { ListDevices$Params } from '@ng/core/api/generated/fn/devices/list-devices';
import type { ListAlerts$Params } from '@ng/core/api/generated/fn/monitoring/list-alerts';
import type { GetMonitoringMetrics$Params } from '@ng/core/api/generated/fn/monitoring/get-monitoring-metrics';
import type { GetAlertsTrend$Params } from '@ng/core/api/generated/fn/monitoring/get-alerts-trend';
import type { ClaimResult } from '@ng/core/api/generated/models/claim-result';
import type { Device } from '@ng/core/api/generated/models/device';
import type { Alert } from '@ng/core/api/generated/models/alert';
import type { MonitoringMetrics } from '@ng/core/api/generated/models/monitoring-metrics';
import { ApiError } from '@ng/core/errors/api-error';

type TrendPoint = { date?: string; count?: number; bySeverity?: { [key: string]: number } };

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

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(Api);

  readonly devices = makeSurface<Device[], ListDevices$Params>(
    async (params) => {
      const res = await this.api.invoke(listDevices, params);
      return (res as { data?: Device[] }).data ?? [];
    },
  );

  readonly alerts = makeSurface<Alert[], ListAlerts$Params>(
    async (params) => {
      const res = await this.api.invoke(listAlerts, params);
      return (res as { data?: Alert[] }).data ?? [];
    },
  );

  readonly monitoringMetrics = makeSurface<MonitoringMetrics, GetMonitoringMetrics$Params>(
    async (params) => {
      const res = await this.api.invoke(getMonitoringMetrics, params);
      return (res as { data?: MonitoringMetrics }).data ?? {};
    },
  );

  readonly alertsTrend = makeSurface<TrendPoint[], GetAlertsTrend$Params>(
    async (params) => {
      const res = await this.api.invoke(getAlertsTrend, params);
      return res as TrendPoint[];
    },
  );

  async batchUpdateAlerts(
    action: 'acknowledge' | 'resolve',
    alertIds: string[],
    resolutionNote?: string,
  ): Promise<{ processed?: number; skipped?: number }> {
    const res = await this.api.invoke(batchUpdateAlerts, { body: { action, alertIds, resolutionNote } });
    return res as { processed?: number; skipped?: number };
  }

  async claimDevice(deviceId: string, name?: string): Promise<ClaimResult> {
    const res = await this.api.invoke(claimDeviceFn, { body: { deviceId, name } });
    const result = (res as { data?: ClaimResult }).data;
    if (!result) throw new Error('No claim result returned');
    void this.devices.reload();
    return result;
  }
}
