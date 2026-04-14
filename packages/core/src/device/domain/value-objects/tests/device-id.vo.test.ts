import { describe, it, expect } from 'vitest';
import { DeviceId } from '../device-id.vo';

describe('DeviceId Value Object', () => {
  it('should create a DeviceId with a valid value', () => {
    const id = 'device-123';
    const deviceId = DeviceId.create(id);
    expect(deviceId.value).toBe(id);
  });

  it('should throw an error when created with an empty value', () => {
    expect(() => DeviceId.create('')).toThrow('Device ID cannot be empty');
    expect(() => DeviceId.create(null as unknown as string)).toThrow();
    expect(() => DeviceId.create(undefined as unknown as string)).toThrow();
  });

  it('should create a DeviceId from string', () => {
    const deviceId = DeviceId.fromString('test-device-01');
    expect(deviceId.value).toBe('test-device-01');
    expect(deviceId.getValue()).toBe('test-device-01');
  });

  it('should correctly compare two DeviceIds for equality', () => {
    const id1 = DeviceId.fromString('device-123');
    const id2 = DeviceId.fromString('device-123');
    const id3 = DeviceId.fromString('device-456');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });

  it('should reject IDs with invalid characters', () => {
    expect(() => DeviceId.create('device 123')).toThrow();
    expect(() => DeviceId.create('device@123')).toThrow();
  });

  it('should accept various valid formats', () => {
    expect(() => DeviceId.create('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    expect(() => DeviceId.create('RPI-2024-001')).not.toThrow();
    expect(() => DeviceId.create('test-device-docker')).not.toThrow();
    expect(() => DeviceId.create('device_with_underscores')).not.toThrow();
  });
});
