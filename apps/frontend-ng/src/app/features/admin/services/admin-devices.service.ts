import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api } from '@ng/core/api/generated/api';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { listAdminDevices } from '@ng/core/api/generated/fn/admin/list-admin-devices';
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
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ApiConfiguration).rootUrl;
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
      // The generated listAdminDevices fn has responseType:'text' / void return type
      // because the response body wasn't declared in the OpenAPI spec. Angular HTTP
      // returns the body as a raw JSON string — parse it and unwrap the envelope.
      const raw = await this.api.invoke(listAdminDevices, status ? { status } : {}) as unknown;
      const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { data?: { devices?: AdminDevice[] } };
      const devices = parsed.data?.devices ?? [];
      this._devices.set(devices);
      this._stats.set(this.deriveStats(devices));
    } catch (e) {
      this._error.set(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Release a device from its customer (SUPERADMIN, leasing hand-back): returns
   * it to the unclaimed pool and invalidates its keys. `id` is the device's
   * public id (AdminDevice.id). Not in the generated client, so called directly.
   */
  async release(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/devices/${id}/release`, {}));
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
