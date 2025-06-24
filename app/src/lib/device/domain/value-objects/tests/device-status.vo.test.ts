import { describe, it, expect } from 'vitest';
import { DeviceStatus, DeviceStatusValue } from '../device-status.vo';

describe('DeviceStatus Value Object', () => {
  it('should create a DeviceStatus with valid values', () => {
    const validStatuses: DeviceStatusValue[] = ['active', 'inactive', 'maintenance', 'error'];
    
    validStatuses.forEach(status => {
      const deviceStatus = DeviceStatus.create(status);
      expect(deviceStatus.value).toBe(status);
    });
  });

  it('should throw an error when created with an empty value', () => {
    expect(() => DeviceStatus.create('' as DeviceStatusValue)).toThrow('Device status cannot be empty');
  });

  it('should throw an error when created with an invalid value', () => {
    expect(() => DeviceStatus.create('unknown' as DeviceStatusValue)).toThrow('Invalid device status: unknown');
    expect(() => DeviceStatus.create('pending' as DeviceStatusValue)).toThrow('Invalid device status: pending');
  });

  it('should correctly identify active status', () => {
    const activeStatus = DeviceStatus.create('active');
    const inactiveStatus = DeviceStatus.create('inactive');
    
    expect(activeStatus.isActive()).toBe(true);
    expect(inactiveStatus.isActive()).toBe(false);
  });

  it('should correctly identify inactive status', () => {
    const inactiveStatus = DeviceStatus.create('inactive');
    const activeStatus = DeviceStatus.create('active');
    
    expect(inactiveStatus.isInactive()).toBe(true);
    expect(activeStatus.isInactive()).toBe(false);
  });

  it('should correctly identify maintenance status', () => {
    const maintenanceStatus = DeviceStatus.create('maintenance');
    const activeStatus = DeviceStatus.create('active');
    
    expect(maintenanceStatus.isInMaintenance()).toBe(true);
    expect(activeStatus.isInMaintenance()).toBe(false);
  });

  it('should correctly identify error status', () => {
    const errorStatus = DeviceStatus.create('error');
    const activeStatus = DeviceStatus.create('active');
    
    expect(errorStatus.isInError()).toBe(true);
    expect(activeStatus.isInError()).toBe(false);
  });

  it('should correctly compare two DeviceStatuses for equality', () => {
    const status1 = DeviceStatus.create('active');
    const status2 = DeviceStatus.create('active');
    const status3 = DeviceStatus.create('inactive');
    
    expect(status1.equals(status2)).toBe(true);
    expect(status1.equals(status3)).toBe(false);
    expect(status2.equals(status3)).toBe(false);
  });
});