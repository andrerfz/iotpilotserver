import { inject, Injectable, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { listAdminDevices } from '@ng/core/api/generated/fn/admin/list-admin-devices';
import { createDeviceCommand } from '@ng/core/api/generated/fn/devices/create-device-command';
import { ApiError } from '@ng/core/errors/api-error';

export interface AdminDevice {
  id: string;
  deviceId: string;
  hostname: string;
  deviceType: string;
  status: string;
  ipAddress?: string;
  lastSeen?: string;
  alertCount: number;
  customerId: string;
}

export interface AdminDeviceStats {
  total: number;
  online: number;
  offline: number;
  maintenance: number;
  error: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDevicesService {
  private readonly api = inject(Api);
  private readonly _devices = signal<AdminDevice[]>([]);
  private readonly _stats = signal<AdminDeviceStats>({ total: 0, online: 0, offline: 0, maintenance: 0, error: 0 });
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private lastStatus?: string;

  readonly devices = this._devices.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async load(status?: string): Promise<void> {
    this.lastStatus = status;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.invoke(listAdminDevices, status ? { status } : {});
      const body = res as unknown as { data?: AdminDevice[]; meta?: { stats?: AdminDeviceStats } };
      const devices = body.data ?? [];
      this._devices.set(devices);
      this._stats.set(body.meta?.stats ?? this.deriveStats(devices));
    } catch (e) {
      this._error.set(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
    } finally {
      this._loading.set(false);
    }
  }

  async sendCommand(deviceId: string, command: 'REBOOT' | 'RESTART'): Promise<void> {
    await this.api.invoke(createDeviceCommand, { id: deviceId, body: { command } });
    await this.load(this.lastStatus);
  }

  private deriveStats(devices: AdminDevice[]): AdminDeviceStats {
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'ONLINE').length,
      offline: devices.filter(d => d.status === 'OFFLINE').length,
      maintenance: devices.filter(d => d.status === 'MAINTENANCE').length,
      error: devices.filter(d => d.status === 'ERROR').length,
    };
  }
}
