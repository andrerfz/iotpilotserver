import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn()
}));

describe('DeviceId Value Object', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a DeviceId with the provided value', () => {
      const id = 'device-123';
      const deviceId = new DeviceId(id);

      expect(deviceId.value).toBe(id);
    });

    it('should throw an error if the value is empty', () => {
      expect(() => new DeviceId('')).toThrow('Device ID cannot be empty');
    });
  });

  describe('create', () => {
    it('should create a DeviceId with a generated UUID', () => {
      const uuid = 'generated-uuid';
      (uuidv4 as ReturnType<typeof vi.fn>).mockReturnValue(uuid);

      const deviceId = DeviceId.create();

      expect(uuidv4).toHaveBeenCalled();
      expect(deviceId.value).toBe(uuid);
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
});
