/**
 * Typed wrappers for the standard backend response envelope.
 *
 * Every backend route produced by response.util.ts (send.ok, send.created, etc.)
 * wraps its payload in one of these shapes. Services cast the raw API result to
 * these types instead of ad-hoc `{ data?: T }` inline casts.
 *
 * Usage in a service:
 *   const raw = await this.api.invoke(listDevices, {}) as unknown;
 *   const res = raw as ApiResponse<Device[]>;
 *   this._devices.set(res.data ?? []);
 *
 * Or for paginated lists:
 *   const res = raw as ApiPaginatedResponse<Device>;
 *   this._devices.set(res.data ?? []);
 *   this._total.set(res.meta?.pagination?.total ?? 0);
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiPaginatedResponse<T> {
  success: boolean;
  data: T[];
  timestamp: string;
  meta: {
    pagination: PaginationMeta;
  };
}
