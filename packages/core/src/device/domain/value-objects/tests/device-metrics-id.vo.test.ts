import {DeviceMetricsId} from '../device-metrics-id.vo';

describe('DeviceMetricsId Value Object', () => {
  describe('create', () => {
    it('should create a DeviceMetricsId with auto-generated UUID', () => {
      const id = DeviceMetricsId.create();
      expect(id).toBeInstanceOf(DeviceMetricsId);
      expect(id.getValue()).toBeDefined();
      expect(typeof id.getValue()).toBe('string');
      expect(id.getValue().length).toBeGreaterThan(0);
    });

    it('should generate different IDs on each call', () => {
      const id1 = DeviceMetricsId.create();
      const id2 = DeviceMetricsId.create();
      expect(id1.getValue()).not.toBe(id2.getValue());
    });
  });

  describe('fromString', () => {
    it('should create a DeviceMetricsId from a valid string', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = DeviceMetricsId.fromString(uuid);
      expect(id).toBeInstanceOf(DeviceMetricsId);
      expect(id.getValue()).toBe(uuid);
    });

    it('should throw error for empty string', () => {
      expect(() => DeviceMetricsId.fromString('')).toThrow();
    });

    it('should throw error for null value', () => {
      expect(() => DeviceMetricsId.fromString(null as any)).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for equal DeviceMetricsIds', () => {
      const id1 = DeviceMetricsId.fromString('metrics-123');
      const id2 = DeviceMetricsId.fromString('metrics-123');
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different DeviceMetricsIds', () => {
      const id1 = DeviceMetricsId.fromString('metrics-123');
      const id2 = DeviceMetricsId.fromString('metrics-456');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
