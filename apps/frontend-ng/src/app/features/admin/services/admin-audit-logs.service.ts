import { inject, Injectable, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { getAdminAuditLogs } from '@ng/core/api/generated/fn/admin/get-admin-audit-logs';
import { ApiError } from '@ng/core/errors/api-error';

export interface AdminAuditLogEntry {
  id: string;
  eventType: string;
  userId: string;
  customerId?: string;
  resource: string;
  action: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
  user?: { username: string; email: string };
}

export interface AdminAuditLogPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminAuditLogFilters {
  resources: string[];
  eventTypes: string[];
}

interface LoadParams {
  eventType?: string;
  resource?: string;
  success?: string;
  search?: string;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminAuditLogsService {
  private readonly api = inject(Api);
  private readonly _logs = signal<AdminAuditLogEntry[]>([]);
  private readonly _pagination = signal<AdminAuditLogPagination>({ total: 0, page: 1, limit: 50, pages: 0 });
  private readonly _filterOptions = signal<AdminAuditLogFilters>({ resources: [], eventTypes: [] });
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
      const res = await this.api.invoke(getAdminAuditLogs, {
        ...(params.eventType ? { eventType: params.eventType } : {}),
        ...(params.resource  ? { resource:  params.resource }  : {}),
        ...(params.success   ? { success:   params.success }   : {}),
        ...(params.search    ? { search:    params.search }    : {}),
        ...(params.page      ? { page:      params.page }      : {}),
      });
      const body = res as unknown as {
        data?: AdminAuditLogEntry[];
        meta?: { pagination?: AdminAuditLogPagination; filters?: AdminAuditLogFilters };
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
