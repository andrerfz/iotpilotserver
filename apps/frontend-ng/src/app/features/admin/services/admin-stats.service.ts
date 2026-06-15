import { inject, Injectable, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { getAdminStats } from '@ng/core/api/generated/fn/admin/get-admin-stats';
import { ApiError } from '@ng/core/errors/api-error';

export interface AdminStats {
  userCount: number;
  deviceCount: number;
  alertCount: number;
  activeDevices: number;
}

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  private readonly api = inject(Api);
  private readonly _data = signal<AdminStats | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.invoke(getAdminStats, {});
      this._data.set(res as AdminStats);
    } catch (e) {
      this._error.set(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
    } finally {
      this._loading.set(false);
    }
  }
}
