import { Injectable, computed, signal } from '@angular/core';

export interface CustomerSummary {
  id: string;
  name: string;
  status: string;
}

/**
 * Holds the SUPERADMIN's active customer context. When set, every API request
 * carries `X-Customer-Id` so the backend scopes data to that tenant.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly _customer = signal<CustomerSummary | null>(null);

  readonly customer = this._customer.asReadonly();
  readonly isActive = computed(() => this._customer() !== null);

  set(customer: CustomerSummary): void { this._customer.set(customer); }
  clear(): void { this._customer.set(null); }
}
