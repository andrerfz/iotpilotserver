import type { Alert } from '@ng/core/api/generated/models/alert';

export type AlertState = 'active' | 'acknowledged' | 'resolved';

export interface AlertFilterParams {
  search?: string;
  severity?: string[];
  state?: string[];
  deviceIds?: string[];
}

export function alertState(a: Alert): AlertState {
  if (a.resolved) return 'resolved';
  if (a.acknowledgedAt) return 'acknowledged';
  return 'active';
}

export function applyAlertFilters(alerts: Alert[], p: AlertFilterParams): Alert[] {
  let rows = alerts;
  const q = p.search?.toLowerCase().trim();
  if (q) rows = rows.filter(a => `${a.title ?? ''} ${a.message ?? ''}`.toLowerCase().includes(q));
  if (p.deviceIds?.length) rows = rows.filter(a => p.deviceIds!.includes(a.deviceId ?? ''));
  if (p.severity?.length) rows = rows.filter(a => p.severity!.includes(a.severity ?? ''));
  if (p.state?.length) rows = rows.filter(a => p.state!.includes(alertState(a)));
  return rows;
}
