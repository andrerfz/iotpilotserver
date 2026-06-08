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
    expect(() => DeviceName.create(null as unknown as string)).toThrow();
    expect(() => DeviceName.create(undefined as unknown as string)).toThrow();
  });

  it('should throw an error when name exceeds 100 characters', () => {
    const longName = 'A'.repeat(101);
    expect(() => DeviceName.create(longName)).toThrow('Device name cannot exceed 100 characters');
  });

  it('should accept a name with exactly 100 characters', () => {
    const name = 'A'.repeat(100);
    const deviceName = DeviceName.create(name);
    expect(deviceName.value).toBe(name);
  });

  it('should accept single character names', () => {
    const deviceName = DeviceName.create('A');
    expect(deviceName.value).toBe('A');
  });

  it('should reject names with invalid characters', () => {
    expect(() => DeviceName.create('device@home')).toThrow('invalid characters');
    expect(() => DeviceName.create('device$1')).toThrow('invalid characters');
  });

  it('should accept names with allowed special characters (#, &, :, etc.)', () => {
    expect(() => DeviceName.create('device#1')).not.toThrow();
    expect(() => DeviceName.create('device&co')).not.toThrow();
  });

  it('should accept names with hyphens, underscores, dots, and spaces', () => {
    expect(() => DeviceName.create('test-device')).not.toThrow();
    expect(() => DeviceName.create('test_device')).not.toThrow();
    expect(() => DeviceName.create('test.device')).not.toThrow();
    expect(() => DeviceName.create('Test Device 01')).not.toThrow();
  });

  it('should correctly compare two DeviceNames for equality', () => {
    const name1 = DeviceName.create('Test Device');
    const name2 = DeviceName.create('Test Device');
    const name3 = DeviceName.create('Another Device');

    expect(name1.equals(name2)).toBe(true);
    expect(name1.equals(name3)).toBe(false);
  });

  it('should return the same value from getValue() as from value property', () => {
    const name = 'Test Device';
    const deviceName = DeviceName.create(name);
    expect(deviceName.getValue()).toBe(name);
    expect(deviceName.getValue()).toBe(deviceName.value);
  });
});
