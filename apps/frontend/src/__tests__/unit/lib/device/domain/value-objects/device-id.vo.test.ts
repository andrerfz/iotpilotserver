import { describe, it, expect } from 'vitest';
import { DeviceId } from '@iotpilot/core/device/domain/value-objects/device-id.vo';

describe('DeviceId Value Object', () => {
  describe('create', () => {
    it('should create a DeviceId with the provided value', () => {
      const id = 'device-123';
      const deviceId = DeviceId.create(id);

      expect(deviceId.value).toBe(id);
    });

    it('should throw an error if the value is empty', () => {
      expect(() => DeviceId.create('')).toThrow('Device ID cannot be empty');
    });

    it('should throw an error for null/undefined', () => {
      expect(() => DeviceId.create(null as any)).toThrow();
      expect(() => DeviceId.create(undefined as any)).toThrow();
    });
  });

  describe('fromString', () => {
    it('should create a DeviceId from a string', () => {
      const id = 'device-123';
      const deviceId = DeviceId.fromString(id);

      expect(deviceId.value).toBe(id);
    });

    it('should throw an error if the string is empty', () => {
      expect(() => DeviceId.fromString('')).toThrow('Device ID cannot be empty');
    });
  });

  describe('equals', () => {
    it('should return true if the IDs are equal', () => {
      const id = 'device-123';
      const deviceId1 = DeviceId.fromString(id);
      const deviceId2 = DeviceId.fromString(id);

      expect(deviceId1.equals(deviceId2)).toBe(true);
    });

    it('should return false if the IDs are not equal', () => {
      const deviceId1 = DeviceId.fromString('device-123');
      const deviceId2 = DeviceId.fromString('device-456');

      expect(deviceId1.equals(deviceId2)).toBe(false);
    });
  });

  describe('valid formats', () => {
    it('should accept UUIDs', () => {
      expect(() => DeviceId.create('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });

    it('should accept serial numbers', () => {
      expect(() => DeviceId.create('RPI-2024-001')).not.toThrow();
    });

    it('should reject IDs with spaces', () => {
      expect(() => DeviceId.create('device 123')).toThrow();
    });

    it('should reject IDs with special characters', () => {
      expect(() => DeviceId.create('device@123')).toThrow();
    });
  });
});
