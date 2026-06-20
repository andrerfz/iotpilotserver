import { inject, Injectable, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { listAdminCustomers } from '@ng/core/api/generated/fn/admin/list-admin-customers';
import { createAdminCustomer } from '@ng/core/api/generated/fn/admin/create-admin-customer';
import { updateAdminCustomer } from '@ng/core/api/generated/fn/admin/update-admin-customer';
import { deleteAdminCustomer } from '@ng/core/api/generated/fn/admin/delete-admin-customer';
import { ApiError } from '@ng/core/errors/api-error';
import { ApiPaginatedResponse } from '@ng/core/api/api-response.types';

export interface AdminCustomer {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminCustomersService {
  private readonly api = inject(Api);
  private readonly _customers = signal<AdminCustomer[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private lastSearch?: string;
  private lastStatus?: string;

  readonly customers = this._customers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async load(search?: string, status?: string): Promise<void> {
    this.lastSearch = search;
    this.lastStatus = status;
    this._loading.set(true);
    this._error.set(null);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (search) params['search'] = search;
      if (status) params['status'] = status;
      const raw = await this.api.invoke(listAdminCustomers, params) as unknown;
      const res = (typeof raw === 'string' ? JSON.parse(raw) : raw) as ApiPaginatedResponse<AdminCustomer>;
      this._customers.set(res.data ?? []);
    } catch (e) {
      this._error.set(e instanceof ApiError ? e : new ApiError(0, 'UNKNOWN', String(e)));
    } finally {
      this._loading.set(false);
    }
  }

  async create(name: string, description?: string, contactEmail?: string): Promise<void> {
    await this.api.invoke(createAdminCustomer, { body: { name, description, contactEmail } });
    await this.load(this.lastSearch, this.lastStatus);
  }

  async update(id: string, name?: string, description?: string, contactEmail?: string): Promise<void> {
    await this.api.invoke(updateAdminCustomer, { id, body: { name, description, contactEmail } });
    await this.load(this.lastSearch, this.lastStatus);
  }

  async deactivate(id: string): Promise<void> {
    await this.api.invoke(deleteAdminCustomer, { id });
    await this.load(this.lastSearch, this.lastStatus);
  }
}
