import { inject, Injectable, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { listAdminUsers } from '@ng/core/api/generated/fn/admin/list-admin-users';
import { approveAdminUser } from '@ng/core/api/generated/fn/admin/approve-admin-user';
import { updateUser } from '@ng/core/api/generated/fn/users/update-user';
import { ApiError } from '@ng/core/errors/api-error';

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: string;
  status: string;
  customerId?: string;
  customerName?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly api = inject(Api);
  private readonly _users = signal<AdminUser[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private lastStatus?: string;

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async load(status?: string): Promise<void> {
    this.lastStatus = status;
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.invoke(listAdminUsers, status ? { status } : {});
      const body = res as unknown as { data?: AdminUser[] };
      this._users.set(body.data ?? []);
    } catch (e) {
      this._error.set(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
    } finally {
      this._loading.set(false);
    }
  }

  async approve(id: string, action: 'approve' | 'reject'): Promise<void> {
    await this.api.invoke(approveAdminUser, { id, body: { action } });
    await this.load(this.lastStatus);
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<void> {
    await this.api.invoke(updateUser, { id, body: { status } });
    await this.load(this.lastStatus);
  }
}
