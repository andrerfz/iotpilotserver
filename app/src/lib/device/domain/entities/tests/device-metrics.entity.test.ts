import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceMetrics } from '../device-metrics.entity';
import { DeviceId } from '../../value-objects/device-id.vo';

describe('DeviceMetrics Entity', () => {
  let deviceId: DeviceId;
  let cpuUsage: number;
  let memoryUsage: number;
  let diskUsage: number;
  let networkUsage: number;
  let timestamp: Date;
  let deviceMetrics: DeviceMetrics;

  beforeEach(() => {
    deviceId = DeviceId.create('device-123');
    cpuUsage = 25.5;
    memoryUsage = 40.2;
    diskUsage = 60.8;
    networkUsage = 15.3;
    timestamp = new Date();
    deviceMetrics = DeviceMetrics.create(
      deviceId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkUsage,
      timestamp
    );
  });

  it('should create device metrics with correct values', () => {
    expect(deviceMetrics.deviceId).toBe(deviceId);
    expect(deviceMetrics.cpuUsage).toBe(cpuUsage);
    expect(deviceMetrics.memoryUsage).toBe(memoryUsage);
    expect(deviceMetrics.diskUsage).toBe(diskUsage);
    expect(deviceMetrics.networkUsage).toBe(networkUsage);
    expect(deviceMetrics.timestamp).toBe(timestamp);
  });

  it('should create device metrics with current timestamp if not provided', () => {
    const metricsWithoutTimestamp = DeviceMetrics.create(
      deviceId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkUsage
    );
    
    expect(metricsWithoutTimestamp.deviceId).toBe(deviceId);
    expect(metricsWithoutTimestamp.cpuUsage).toBe(cpuUsage);
    expect(metricsWithoutTimestamp.memoryUsage).toBe(memoryUsage);
    expect(metricsWithoutTimestamp.diskUsage).toBe(diskUsage);
    expect(metricsWithoutTimestamp.networkUsage).toBe(networkUsage);
    expect(metricsWithoutTimestamp.timestamp).toBeInstanceOf(Date);
    
    // The timestamp should be very recent (within the last second)
    const now = new Date();
    const timeDifference = now.getTime() - metricsWithoutTimestamp.timestamp.getTime();
    expect(timeDifference).toBeLessThan(1000);
  });

  it('should have read-only properties', () => {
    // TypeScript will prevent direct property assignment at compile time,
    // but we can test that the properties are not writable at runtime
    expect(() => {
      // @ts-ignore - Testing runtime behavior
      deviceMetrics.cpuUsage = 99;
    }).toThrow();
  });
});