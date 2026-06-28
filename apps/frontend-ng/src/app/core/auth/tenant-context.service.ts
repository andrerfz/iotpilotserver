import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Api } from '@ng/core/api/generated/api';
import { authActAsGet } from '@ng/core/api/generated/fn/auth/auth-act-as-get';
import { authActAsPost } from '@ng/core/api/generated/fn/auth/auth-act-as-post';
import { authActAsDelete } from '@ng/core/api/generated/fn/auth/auth-act-as-delete';
import type { ActingTenant } from '@ng/core/api/generated/models/acting-tenant';

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
 * Holds the SUPERADMIN's active customer context. The acting tenant lives on the
 * server session (via `/auth/act-as`, so the switch is validated + audited); this
 * service drives those endpoints and mirrors the result into a signal + localStorage
 * (a fast-paint cache reconciled against the session by `hydrate()` on load).
 * When set, every API request also carries `X-Customer-Id` (a redundant fallback).
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  // Resolved lazily (only inside the switch methods) so this root service can be
  // constructed in tests/components that don't provide HttpClient.
  private readonly injector = inject(Injector);
  private get api(): Api { return this.injector.get(Api); }
  private readonly _customer = signal<CustomerSummary | null>(loadFromStorage());
  private hydrated = false;

  readonly customer = this._customer.asReadonly();
  readonly isActive = computed(() => this._customer() !== null);

  /** Start acting as a customer — writes the session server-side, then updates local state. */
  async set(customer: CustomerSummary): Promise<void> {
    await this.api.invoke(authActAsPost, { body: { customerId: customer.id } });
    this.apply(customer);
  }

  /** Stop acting as a customer (back to platform/global). */
  async clear(): Promise<void> {
    await this.api.invoke(authActAsDelete, {});
    this.apply(null);
  }

  /**
   * Reconcile local state against the server session. Call once for a SUPERADMIN
   * after auth is ready; the session is authoritative over the localStorage cache.
   */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const res = await this.api.invoke(authActAsGet, {});
      const data = (res as { data?: ActingTenant }).data ?? (res as ActingTenant);
      if (data?.actingCustomerId) {
        this.apply({ id: data.actingCustomerId, name: data.customerName ?? '', status: 'ACTIVE' });
      } else {
        this.apply(null);
      }
    } catch {
      // Non-SUPERADMIN (403) or transient error — leave the cached value untouched.
    }
  }

  private apply(customer: CustomerSummary | null): void {
    this._customer.set(customer);
    if (customer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
