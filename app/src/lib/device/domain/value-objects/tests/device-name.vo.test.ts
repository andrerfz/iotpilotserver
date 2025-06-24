import { describe, it, expect } from 'vitest';
import { DeviceName } from '../device-name.vo';

describe('DeviceName Value Object', () => {
  it('should create a DeviceName with a valid value', () => {
    const name = 'Test Device';
    const deviceName = DeviceName.create(name);
    expect(deviceName.value).toBe(name);
  });

  it('should throw an error when created with an empty value', () => {
    expect(() => DeviceName.create('')).toThrow('Device name cannot be empty');
    expect(() => new DeviceName('')).toThrow('Device name cannot be empty');
    expect(() => new DeviceName(null as unknown as string)).toThrow('Device name cannot be empty');
    expect(() => new DeviceName(undefined as unknown as string)).toThrow('Device name cannot be empty');
  });

  it('should throw an error when name is too short', () => {
    expect(() => DeviceName.create('AB')).toThrow('Device name must be at least 3 characters long');
    expect(() => new DeviceName('AB')).toThrow('Device name must be at least 3 characters long');
  });

  it('should throw an error when name is too long', () => {
    const longName = 'A'.repeat(51);
    expect(() => DeviceName.create(longName)).toThrow('Device name cannot exceed 50 characters');
    expect(() => new DeviceName(longName)).toThrow('Device name cannot exceed 50 characters');
  });

  it('should accept a name with exactly 3 characters', () => {
    const name = 'ABC';
    const deviceName = DeviceName.create(name);
    expect(deviceName.value).toBe(name);
  });

  it('should accept a name with exactly 50 characters', () => {
    const name = 'A'.repeat(50);
    const deviceName = DeviceName.create(name);
    expect(deviceName.value).toBe(name);
  });

  it('should correctly compare two DeviceNames for equality', () => {
    const name1 = DeviceName.create('Test Device');
    const name2 = DeviceName.create('Test Device');
    const name3 = DeviceName.create('Another Device');

    expect(name1.equals(name2)).toBe(true);
    expect(name1.equals(name3)).toBe(false);
    expect(name2.equals(name3)).toBe(false);
  });

  it('should return the same value from getValue() as from value property', () => {
    const name = 'Test Device';
    const deviceName = DeviceName.create(name);
    expect(deviceName.getValue()).toBe(name);
    expect(deviceName.getValue()).toBe(deviceName.value);
  });
});
