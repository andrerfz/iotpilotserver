import { inject, Injectable, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { getAdminLogs } from '@ng/core/api/generated/fn/admin/get-admin-logs';
import { ApiError } from '@ng/core/errors/api-error';

export interface AdminLogEntry {
  id: string;
  deviceId: string;
  level: string;
  message: string;
  source?: string;
  timestamp: string;
  device?: { hostname: string; deviceId: string };
}

export interface AdminLogPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminLogFilters {
  sources: string[];
  devices: Array<{ id: string; hostname: string; deviceId: string }>;
}

interface LoadParams {
  level?: string;
  deviceId?: string;
  source?: string;
  search?: string;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminLogsService {
  private readonly api = inject(Api);
  private readonly _logs = signal<AdminLogEntry[]>([]);
  private readonly _pagination = signal<AdminLogPagination>({ total: 0, page: 1, limit: 50, pages: 0 });
  private readonly _filterOptions = signal<AdminLogFilters>({ sources: [], devices: [] });
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private lastParams: LoadParams = {};

  readonly logs = this._logs.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly filterOptions = this._filterOptions.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async load(params: LoadParams = {}): Promise<void> {
    this.lastParams = params;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.invoke(getAdminLogs, {
        ...(params.level    ? { level:    params.level }    : {}),
        ...(params.deviceId ? { deviceId: params.deviceId } : {}),
        ...(params.source   ? { source:   params.source }   : {}),
        ...(params.search   ? { search:   params.search }   : {}),
        ...(params.page     ? { page:     params.page }     : {}),
      });
      const body = res as unknown as {
        data?: AdminLogEntry[];
        meta?: { pagination?: AdminLogPagination; filters?: AdminLogFilters };
      };
      this._logs.set(body.data ?? []);
      if (body.meta?.pagination) this._pagination.set(body.meta.pagination);
      if (body.meta?.filters)    this._filterOptions.set(body.meta.filters);
    } catch (e) {
      this._error.set(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
    } finally {
      this._loading.set(false);
    }
  }

  reload(): Promise<void> {
    return this.load(this.lastParams);
  }
}
