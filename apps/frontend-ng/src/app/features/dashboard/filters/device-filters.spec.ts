import { describe, it, expect } from 'vitest';
import { applyDeviceFilters } from './device-filters';
import type { Device } from '@ng/core/api/generated/models/device';

const DEVICES: Device[] = [
  { id: 'd1', hostname: 'pi-kitchen', deviceId: 'RPI-001', location: 'Kitchen', status: 'ONLINE' },
  { id: 'd2', hostname: 'pi-garage', deviceId: 'RPI-002', location: 'Garage', status: 'OFFLINE' },
  { id: 'd3', hostname: 'pi-lab', deviceId: 'RPI-003', location: 'Lab', status: 'ERROR' },
  { id: 'd4', hostname: 'sensor-roof', deviceId: 'SEN-001', location: 'Roof', status: 'ONLINE' },
];

describe('applyDeviceFilters', () => {
  it('returns all devices when no filters are set', () => {
    expect(applyDeviceFilters(DEVICES, {})).toHaveLength(4);
  });

  it('filters by hostname (case-insensitive)', () => {
    const result = applyDeviceFilters(DEVICES, { search: 'PI' });
    expect(result.map(d => d.id)).toEqual(['d1', 'd2', 'd3']);
  });

  it('filters by deviceId', () => {
    const result = applyDeviceFilters(DEVICES, { search: 'SEN-001' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d4');
  });

  it('filters by location', () => {
    const result = applyDeviceFilters(DEVICES, { search: 'garage' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d2');
  });

  it('filters by status', () => {
    const result = applyDeviceFilters(DEVICES, { status: ['ONLINE'] });
    expect(result.every(d => d.status === 'ONLINE')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('filters by multiple statuses', () => {
    const result = applyDeviceFilters(DEVICES, { status: ['OFFLINE', 'ERROR'] });
    expect(result).toHaveLength(2);
    expect(result.map(d => d.id)).toEqual(['d2', 'd3']);
  });

  it('filters by deviceIds list', () => {
    const result = applyDeviceFilters(DEVICES, { deviceIds: ['d1', 'd3'] });
    expect(result.map(d => d.id)).toEqual(['d1', 'd3']);
  });

  it('applies search + status together', () => {
    const result = applyDeviceFilters(DEVICES, { search: 'pi', status: ['ONLINE'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d1');
  });

  it('returns empty array when no devices match', () => {
    expect(applyDeviceFilters(DEVICES, { search: 'nonexistent' })).toHaveLength(0);
  });

  it('returns empty array when input is empty', () => {
    expect(applyDeviceFilters([], { search: 'pi', status: ['ONLINE'] })).toHaveLength(0);
  });
});
