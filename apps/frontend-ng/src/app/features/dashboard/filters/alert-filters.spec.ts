import { describe, it, expect } from 'vitest';
import { applyAlertFilters, alertState } from './alert-filters';
import type { Alert } from '@ng/core/api/generated/models/alert';

const ALERTS: Alert[] = [
  { id: 'a1', title: 'CPU High', message: 'CPU usage exceeded 90%', severity: 'CRITICAL', deviceId: 'd1', resolved: false, acknowledgedAt: null },
  { id: 'a2', title: 'Memory Warning', message: 'Memory at 80%', severity: 'WARNING', deviceId: 'd1', resolved: false, acknowledgedAt: '2024-01-01T00:00:00Z' },
  { id: 'a3', title: 'Disk Full', message: 'Disk usage at 95%', severity: 'ERROR', deviceId: 'd2', resolved: true },
  { id: 'a4', title: 'Temp Info', message: 'Temperature is normal', severity: 'INFO', deviceId: 'd2', resolved: false, acknowledgedAt: null },
];

describe('alertState', () => {
  it('returns active for unresolved, unacknowledged', () => {
    expect(alertState(ALERTS[0]!)).toBe('active');
  });

  it('returns acknowledged for unresolved but acknowledged', () => {
    expect(alertState(ALERTS[1]!)).toBe('acknowledged');
  });

  it('returns resolved for resolved alerts', () => {
    expect(alertState(ALERTS[2]!)).toBe('resolved');
  });
});

describe('applyAlertFilters', () => {
  it('returns all alerts when no filters are set', () => {
    expect(applyAlertFilters(ALERTS, {})).toHaveLength(4);
  });

  it('filters by title (case-insensitive)', () => {
    const result = applyAlertFilters(ALERTS, { search: 'CPU' });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a1');
  });

  it('filters by message (case-insensitive)', () => {
    const result = applyAlertFilters(ALERTS, { search: 'memory' });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a2');
  });

  it('filters by single severity', () => {
    expect(applyAlertFilters(ALERTS, { severity: ['CRITICAL'] })).toHaveLength(1);
  });

  it('filters by multiple severities', () => {
    const result = applyAlertFilters(ALERTS, { severity: ['CRITICAL', 'ERROR'] });
    expect(result).toHaveLength(2);
    expect(result.map(a => a.id)).toEqual(['a1', 'a3']);
  });

  it('filters by state=active', () => {
    const result = applyAlertFilters(ALERTS, { state: ['active'] });
    expect(result.map(a => a.id)).toEqual(['a1', 'a4']);
  });

  it('filters by state=acknowledged', () => {
    const result = applyAlertFilters(ALERTS, { state: ['acknowledged'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a2');
  });

  it('filters by state=resolved', () => {
    const result = applyAlertFilters(ALERTS, { state: ['resolved'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a3');
  });

  it('filters by deviceIds', () => {
    expect(applyAlertFilters(ALERTS, { deviceIds: ['d1'] })).toHaveLength(2);
  });

  it('combines search + severity', () => {
    const result = applyAlertFilters(ALERTS, { search: 'usage', severity: ['CRITICAL'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('a1');
  });

  it('returns empty for no match', () => {
    expect(applyAlertFilters(ALERTS, { search: 'xyz123nonexistent' })).toHaveLength(0);
  });

  it('returns empty array when input is empty', () => {
    expect(applyAlertFilters([], { severity: ['CRITICAL'] })).toHaveLength(0);
  });
});
