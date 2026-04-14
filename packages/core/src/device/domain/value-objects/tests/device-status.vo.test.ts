import { describe, it, expect } from 'vitest';
import { DeviceStatus, BusinessStatus, ConnectivityStatus } from '../device-status.vo';

describe('DeviceStatus Value Object', () => {
  it('should create a DeviceStatus with valid data', () => {
    const status = DeviceStatus.create({ businessStatus: 'active', connectivity: 'online' });
    expect(status.businessStatus).toBe('active');
    expect(status.connectivity).toBe('online');
  });

  it('should throw for invalid business status', () => {
    expect(() => DeviceStatus.create({ businessStatus: 'unknown' as BusinessStatus, connectivity: 'online' }))
      .toThrow('Invalid business status');
  });

  it('should throw for invalid connectivity status', () => {
    expect(() => DeviceStatus.create({ businessStatus: 'active', connectivity: 'bogus' as ConnectivityStatus }))
      .toThrow('Invalid connectivity status');
  });

  it('should correctly identify active status', () => {
    const active = DeviceStatus.onlineAndActive();
    const inactive = DeviceStatus.offlineInactive();

    expect(active.isActive()).toBe(true);
    expect(inactive.isActive()).toBe(false);
  });

  it('should correctly identify inactive status', () => {
    const inactive = DeviceStatus.offlineInactive();
    const active = DeviceStatus.onlineAndActive();

    expect(inactive.isInactive()).toBe(true);
    expect(active.isInactive()).toBe(false);
  });

  it('should correctly identify maintenance status', () => {
    const maintenance = DeviceStatus.onlineMaintenance();
    const active = DeviceStatus.onlineAndActive();

    expect(maintenance.isInMaintenance()).toBe(true);
    expect(active.isInMaintenance()).toBe(false);
  });

  it('should correctly identify error status', () => {
    const error = DeviceStatus.onlineError();
    const active = DeviceStatus.onlineAndActive();

    expect(error.isInError()).toBe(true);
    expect(active.isInError()).toBe(false);
  });

  it('should correctly identify online status', () => {
    const online = DeviceStatus.onlineAndActive();
    const offline = DeviceStatus.offlineInactive();

    expect(online.isOnline()).toBe(true);
    expect(offline.isOnline()).toBe(false);
  });

  it('should correctly compare two DeviceStatuses for equality', () => {
    const status1 = DeviceStatus.onlineAndActive();
    const status2 = DeviceStatus.onlineAndActive();
    const status3 = DeviceStatus.offlineInactive();

    expect(status1.equals(status2)).toBe(true);
    expect(status1.equals(status3)).toBe(false);
  });

  it('should support convenience factory methods', () => {
    expect(DeviceStatus.onlineAndActive().isOnlineAndActive()).toBe(true);
    expect(DeviceStatus.offlineButActive().isOfflineButActive()).toBe(true);
    expect(DeviceStatus.retired().isRetired()).toBe(true);
  });

  it('should support fromString for legacy format', () => {
    const status = DeviceStatus.fromString('active:online');
    expect(status.businessStatus).toBe('active');
    expect(status.connectivity).toBe('online');
  });

  it('should default connectivity to offline when fromString gets single value', () => {
    const status = DeviceStatus.fromString('active');
    expect(status.businessStatus).toBe('active');
    expect(status.connectivity).toBe('offline');
  });

  it('should have backward compatible value getter', () => {
    const status = DeviceStatus.onlineAndActive();
    expect(status.value).toBe('active');
    expect(status.getValue()).toBe('active');
  });
});
