import { describe, it, expect } from 'vitest';
import { DeviceId } from '../device-id.vo';

describe('DeviceId Value Object', () => {
  it('should create a DeviceId with a valid value', () => {
    const id = 'device-123';
    const deviceId = DeviceId.fromString(id);
    expect(deviceId.value).toBe(id);
  });

  it('should throw an error when created with an empty value', () => {
    expect(() => DeviceId.fromString('')).toThrow('Device ID cannot be empty');
    expect(() => new DeviceId('')).toThrow('Device ID cannot be empty');
    expect(() => new DeviceId(null as unknown as string)).toThrow('Device ID cannot be empty');
    expect(() => new DeviceId(undefined as unknown as string)).toThrow('Device ID cannot be empty');
  });

  it('should create a new DeviceId with a generated UUID', () => {
    const deviceId = DeviceId.create();
    expect(deviceId.value).toBeDefined();
    expect(typeof deviceId.value).toBe('string');
    expect(deviceId.value.length).toBeGreaterThan(0);
    
    // UUID v4 format validation (simple check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(deviceId.value)).toBe(true);
  });

  it('should correctly compare two DeviceIds for equality', () => {
    const id1 = DeviceId.fromString('device-123');
    const id2 = DeviceId.fromString('device-123');
    const id3 = DeviceId.fromString('device-456');
    
    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
    expect(id2.equals(id3)).toBe(false);
  });

  it('should create different IDs when using create() multiple times', () => {
    const id1 = DeviceId.create();
    const id2 = DeviceId.create();
    
    expect(id1.equals(id2)).toBe(false);
    expect(id1.value).not.toBe(id2.value);
  });
});