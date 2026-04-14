import { describe, it, expect } from 'vitest';
import { DeviceName } from '@iotpilot/core/device/domain/value-objects/device-name.vo';

describe('DeviceName Value Object', () => {
  describe('create', () => {
    it('should create a DeviceName with the provided value', () => {
      const name = 'Test Device';
      const deviceName = DeviceName.create(name);

      expect(deviceName.value).toBe(name);
    });

    it('should throw an error if the value is empty', () => {
      expect(() => DeviceName.create('')).toThrow('Device name cannot be empty');
    });

    it('should throw an error if the value is more than 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(() => DeviceName.create(longName)).toThrow('Device name cannot exceed 100 characters');
    });

    it('should accept a single character name', () => {
      const deviceName = DeviceName.create('A');
      expect(deviceName.value).toBe('A');
    });

    it('should accept a name with exactly 100 characters', () => {
      const name = 'A'.repeat(100);
      const deviceName = DeviceName.create(name);

      expect(deviceName.value).toBe(name);
    });

    it('should accept names with hyphens, underscores, dots, and spaces', () => {
      expect(() => DeviceName.create('test-device')).not.toThrow();
      expect(() => DeviceName.create('test_device')).not.toThrow();
      expect(() => DeviceName.create('test.device')).not.toThrow();
      expect(() => DeviceName.create('Test Device 01')).not.toThrow();
    });

    it('should reject names with invalid characters', () => {
      expect(() => DeviceName.create('device@home')).toThrow('invalid characters');
      expect(() => DeviceName.create('device$1')).toThrow('invalid characters');
    });

    it('should accept names with allowed special characters (#, &, :, etc.)', () => {
      expect(() => DeviceName.create('device#1')).not.toThrow();
      expect(() => DeviceName.create('device&co')).not.toThrow();
      expect(() => DeviceName.create('room:sensor')).not.toThrow();
    });
  });

  describe('equals', () => {
    it('should return true if the names are equal', () => {
      const name = 'Test Device';
      const deviceName1 = DeviceName.create(name);
      const deviceName2 = DeviceName.create(name);

      expect(deviceName1.equals(deviceName2)).toBe(true);
    });

    it('should return false if the names are not equal', () => {
      const deviceName1 = DeviceName.create('Device 1');
      const deviceName2 = DeviceName.create('Device 2');

      expect(deviceName1.equals(deviceName2)).toBe(false);
    });
  });
});
