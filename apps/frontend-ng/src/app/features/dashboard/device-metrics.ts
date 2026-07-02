import type { TranslateService } from '@ngx-translate/core';
import type { ListRowCol } from '@ng/shared/ui';
import type { Device } from '@ng/core/api/generated/models/device';

/** Compact relative "time since": —, <1m, 5m, 3h, 2d. Language-neutral. */
export function deviceRelativeTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/**
 * Metrics to show for a device, derived from whatever it actually reported
 * (non-null values in its last record) rather than fixed columns: sensor devices
 * surface Temp/Battery/Signal, system devices surface CPU/Mem/Disk. Always ends
 * with a relative "last seen". Absent metrics are omitted (no "—" noise).
 * Shared by the devices list and the dashboard so both render identically.
 */
export function deviceMetricCols(d: Device, t: TranslateService): ListRowCol[] {
  const has = (v: number | null | undefined): v is number => v !== null && v !== undefined;
  const cols: ListRowCol[] = [];
  if (has(d.temperature))    cols.push({ label: t.instant('devices.metric.temp'),    value: `${Math.round(d.temperature)}°` });
  if (has(d.batteryLevel))   cols.push({ label: t.instant('devices.metric.battery'), value: `${Math.round(d.batteryLevel)}%` });
  if (has(d.signalStrength)) cols.push({ label: t.instant('devices.metric.signal'),  value: `${Math.round(d.signalStrength)}dBm` });
  if (has(d.cpuUsage))       cols.push({ label: t.instant('devices.metric.cpu'),     value: `${Math.round(d.cpuUsage)}%` });
  if (has(d.memoryUsage))    cols.push({ label: t.instant('devices.metric.mem'),     value: `${Math.round(d.memoryUsage)}%` });
  if (has(d.diskUsage))      cols.push({ label: t.instant('devices.metric.disk'),    value: `${Math.round(d.diskUsage)}%` });
  cols.push({ label: t.instant('devices.metric.last_seen'), value: deviceRelativeTime(d.lastSeen) });
  return cols;
}

/** Same metrics flattened to the [key, value, ...] form the mobile meta row uses. */
export function deviceMetricMeta(d: Device, t: TranslateService): string[] {
  return deviceMetricCols(d, t).flatMap(c => [c.label, c.value]);
}
