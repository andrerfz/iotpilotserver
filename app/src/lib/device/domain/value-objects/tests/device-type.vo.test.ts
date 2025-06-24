import { describe, it, expect } from 'vitest';
import { DeviceType, DeviceTypeEnum } from '../device-type.vo';

describe('DeviceType Value Object', () => {
  it('should create a DeviceType with valid values', () => {
    // Test each enum value
    Object.values(DeviceTypeEnum).forEach(type => {
      const deviceType = DeviceType.create(type);
      expect(deviceType.getValue).toBe(type);
    });
  });

  it('should throw an error when created with an invalid value', () => {
    expect(() => DeviceType.create('invalid-type')).toThrow('Invalid device type: invalid-type');
    expect(() => DeviceType.create('')).toThrow('Invalid device type: ');
  });

  it('should validate device types correctly', () => {
    // Valid types
    Object.values(DeviceTypeEnum).forEach(type => {
      expect(DeviceType.isValid(type)).toBe(true);
    });
    
    // Invalid types
    expect(DeviceType.isValid('invalid-type')).toBe(false);
    expect(DeviceType.isValid('')).toBe(false);
  });

  it('should correctly compare two DeviceTypes for equality', () => {
    const type1 = DeviceType.create(DeviceTypeEnum.ROUTER);
    const type2 = DeviceType.create(DeviceTypeEnum.ROUTER);
    const type3 = DeviceType.create(DeviceTypeEnum.SERVER);
    
    expect(type1.equals(type2)).toBe(true);
    expect(type1.equals(type3)).toBe(false);
    expect(type2.equals(type3)).toBe(false);
  });

  it('should convert to string correctly', () => {
    const type = DeviceType.create(DeviceTypeEnum.ROUTER);
    expect(type.toString()).toBe(DeviceTypeEnum.ROUTER);
  });

  it('should handle case sensitivity correctly', () => {
    // DeviceTypeEnum values are lowercase
    expect(() => DeviceType.create('ROUTER')).toThrow('Invalid device type: ROUTER');
    expect(DeviceType.isValid('ROUTER')).toBe(false);
    
    // But the correct lowercase values should work
    expect(() => DeviceType.create('router')).not.toThrow();
    expect(DeviceType.isValid('router')).toBe(true);
  });
});