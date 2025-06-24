import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceMetrics } from '../device-metrics.entity';
import { DeviceId } from '@/lib/device/value-objects/device-id.vo';

describe('DeviceMetrics Entity', () => {
  let deviceId: DeviceId;
  let cpuUsage: number;
  let memoryUsage: number;
  let diskUsage: number;
  let networkUpload: number;
  let networkDownload: number;
  let timestamp: Date;
  let deviceMetrics: DeviceMetrics;

  beforeEach(() => {
    deviceId = DeviceId.fromString('device-123');
    cpuUsage = 25.5;
    memoryUsage = 40.2;
    diskUsage = 60.8;
    networkUpload = 15.3;
    networkDownload = 10.7;
    timestamp = new Date();
    deviceMetrics = DeviceMetrics.create(
      deviceId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkUpload,
      networkDownload,
      timestamp
    );
  });

  it('should create device metrics with correct values', () => {
    expect(deviceMetrics.deviceId).toBe(deviceId);
    expect(deviceMetrics.cpuUsage).toBe(cpuUsage);
    expect(deviceMetrics.memoryUsage).toBe(memoryUsage);
    expect(deviceMetrics.diskUsage).toBe(diskUsage);
    expect(deviceMetrics.networkUpload).toBe(networkUpload);
    expect(deviceMetrics.networkDownload).toBe(networkDownload);
    expect(deviceMetrics.networkUsage).toBe(networkUpload + networkDownload);
    expect(deviceMetrics.timestamp).toBe(timestamp);
  });

  it('should create device metrics with current timestamp if not provided', () => {
    const metricsWithoutTimestamp = DeviceMetrics.create(
      deviceId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkUpload,
      networkDownload
    );

    expect(metricsWithoutTimestamp.deviceId).toBe(deviceId);
    expect(metricsWithoutTimestamp.cpuUsage).toBe(cpuUsage);
    expect(metricsWithoutTimestamp.memoryUsage).toBe(memoryUsage);
    expect(metricsWithoutTimestamp.diskUsage).toBe(diskUsage);
    expect(metricsWithoutTimestamp.networkUpload).toBe(networkUpload);
    expect(metricsWithoutTimestamp.networkDownload).toBe(networkDownload);
    expect(metricsWithoutTimestamp.networkUsage).toBe(networkUpload + networkDownload);
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
