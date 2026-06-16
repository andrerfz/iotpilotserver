import { Injectable, computed, signal } from '@angular/core';

export interface CustomerSummary {
  id: string;
  name: string;
  status: string;
}

const STORAGE_KEY = 'iot_active_tenant';

function loadFromStorage(): CustomerSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomerSummary) : null;
  } catch {
    return null;
  }
}

/**
 * Holds the SUPERADMIN's active customer context. When set, every API request
 * carries `X-Customer-Id` so the backend scopes data to that tenant.
 * Persisted to localStorage so tenant selection survives page refresh.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly _customer = signal<CustomerSummary | null>(loadFromStorage());

  readonly customer = this._customer.asReadonly();
  readonly isActive = computed(() => this._customer() !== null);

  set(customer: CustomerSummary): void {
    this._customer.set(customer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
  }

  clear(): void {
    this._customer.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}
