import type { Device } from '@ng/core/api/generated/models/device';

export interface DeviceFilterParams {
  search?: string;
  status?: string[];
  deviceIds?: string[];
}

export function applyDeviceFilters(devices: Device[], p: DeviceFilterParams): Device[] {
  let rows = devices;
  const q = p.search?.toLowerCase().trim();
  if (q) {
    rows = rows.filter(d =>
      `${d.hostname ?? ''} ${d.deviceId ?? ''} ${d.location ?? ''}`.toLowerCase().includes(q),
    );
  }
  if (p.deviceIds?.length) {
    rows = rows.filter(d => p.deviceIds!.includes(d.id ?? ''));
  }
  if (p.status?.length) {
    rows = rows.filter(d => p.status!.includes(d.status ?? ''));
  }
  return rows;
}
