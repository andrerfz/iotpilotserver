import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceMetrics } from '@/lib/device/domain/entities/device-metrics.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';

// Mock the value objects
vi.mock('@/lib/device/domain/value-objects/device-id.vo');

describe('DeviceMetrics Entity', () => {
  let deviceId: DeviceId;
  let deviceMetrics: DeviceMetrics;
  const cpuUsage = 25.5;
  const memoryUsage = 40.2;
  const diskUsage = 60.8;
  const networkUsage = 15.3;
  const timestamp = new Date('2023-01-01T12:00:00Z');

  beforeEach(() => {
    // Setup mocks
    deviceId = { getValue: 'device-123' } as unknown as DeviceId;

    // Create a device metrics instance
    deviceMetrics = DeviceMetrics.create(
      deviceId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkUsage,
      timestamp
    );
  });

  describe('create', () => {
    it('should create a new device metrics with the provided values', () => {
      expect(deviceMetrics.deviceId).toBe(deviceId);
      expect(deviceMetrics.cpuUsage).toBe(cpuUsage);
      expect(deviceMetrics.memoryUsage).toBe(memoryUsage);
      expect(deviceMetrics.diskUsage).toBe(diskUsage);
      expect(deviceMetrics.networkUsage).toBe(networkUsage);
      expect(deviceMetrics.timestamp).toBe(timestamp);
    });

    it('should use current date as timestamp if not provided', () => {
      const now = new Date();
      vi.spyOn(global, 'Date').mockImplementationOnce(() => now as unknown as string);

      const metricsWithoutTimestamp = DeviceMetrics.create(
        deviceId,
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkUsage
      );

      expect(metricsWithoutTimestamp.timestamp).toBe(now);
    });
  });

  describe('getters', () => {
    it('should return the correct deviceId', () => {
      expect(deviceMetrics.deviceId).toBe(deviceId);
    });

    it('should return the correct cpuUsage', () => {
      expect(deviceMetrics.cpuUsage).toBe(cpuUsage);
    });

    it('should return the correct memoryUsage', () => {
      expect(deviceMetrics.memoryUsage).toBe(memoryUsage);
    });

    it('should return the correct diskUsage', () => {
      expect(deviceMetrics.diskUsage).toBe(diskUsage);
    });

    it('should return the correct networkUsage', () => {
      expect(deviceMetrics.networkUsage).toBe(networkUsage);
    });

    it('should return the correct timestamp', () => {
      expect(deviceMetrics.timestamp).toBe(timestamp);
    });
  });
});
