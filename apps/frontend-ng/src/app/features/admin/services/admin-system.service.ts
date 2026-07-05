import { inject, Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { getAdminSystem } from '@ng/core/api/generated/fn/admin/get-admin-system';
import { ApiError } from '@ng/core/errors/api-error';

export interface SystemInfo {
  platform: string;
  nodeVersion: string;
  uptime: number;
  memoryUsage: { used: number; total: number; percentage: number };
  cpuUsage: number;
}

export interface DatabaseInfo {
  status: string;
  version: string;
  connections: { active: number; idle: number; max: number };
  size: string;
}

export interface AppInfo {
  version: string;
  environment: string;
  buildDate: string;
  features: Array<{ name: string; enabled: boolean }>;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userId?: string;
}

export interface AdminSystemInfo {
  system: SystemInfo;
  database: DatabaseInfo;
  application: AppInfo;
  recentActivity: RecentActivity[];
}

@Injectable({ providedIn: 'root' })
export class AdminSystemService implements OnDestroy {
  private readonly api = inject(Api);
  private readonly zone = inject(NgZone);
  private readonly _data = signal<AdminSystemInfo | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private readonly _lastUpdated = signal<Date | null>(null);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.invoke(getAdminSystem, {});
      const body = (res as unknown as { data?: AdminSystemInfo }).data ?? (res as unknown as AdminSystemInfo);
      this._data.set(body);
      this._lastUpdated.set(new Date());
    } catch (e) {
      this._error.set(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
    } finally {
      this._loading.set(false);
    }
  }

  startAutoRefresh(intervalMs = 30_000): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.zone.run(() => void this.load());
    }, intervalMs);
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }
}
