import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnMetricsCollectedHandler } from '../on-metrics-collected.handler';
import type { MetricsCollectedEvent } from '@iotpilot/core/device/domain/events/metrics-collected.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

describe('OnMetricsCollectedHandler', () => {
  let handler: OnMetricsCollectedHandler;
  let mockJobQueue: JobQueue;

  beforeEach(() => {
    mockJobQueue = {
      enqueue: vi.fn().mockResolvedValue('job-1'),
      enqueueBulk: vi.fn(),
      getQueueStats: vi.fn(),
    };
    handler = new OnMetricsCollectedHandler(mockJobQueue);
  });

  function createEvent(hasAlerts: boolean): MetricsCollectedEvent {
    return {
      eventId: 'evt-metrics-1',
      eventType: 'MetricsCollectedEvent',
      occurredOn: new Date(),
      deviceId: { value: 'device-1' },
      deviceName: { value: 'rpi-garage' },
      collectionTimestamp: new Date('2026-03-02T12:00:00Z'),
      hasAlerts,
      tenantId: { value: 'tenant-1' },
      getCpuUsage: () => 75.5,
      getMemoryUsage: () => 60.2,
      getDiskUsage: () => 45.0,
      getTemperature: () => 52.3,
      getNetworkTraffic: () => 1024000,
    } as unknown as MetricsCollectedEvent;
  }

  it('should always enqueue a process-device-metrics job', async () => {
    await handler.handle(createEvent(false));

    expect(mockJobQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: 'process-device-metrics',
        tenantId: 'tenant-1',
        payload: expect.objectContaining({
          deviceId: 'device-1',
          cpuUsage: 75.5,
          memoryUsage: 60.2,
          diskUsage: 45.0,
          temperature: 52.3,
        }),
      }),
      expect.objectContaining({ priority: 8 })
    );
  });

  it('should also enqueue check-threshold-breach when hasAlerts is true', async () => {
    await handler.handle(createEvent(true));

    expect(mockJobQueue.enqueue).toHaveBeenCalledTimes(2);

    // First call: process-device-metrics
    expect(mockJobQueue.enqueue).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ jobType: 'process-device-metrics' }),
      expect.any(Object)
    );

    // Second call: check-threshold-breach with higher priority
    expect(mockJobQueue.enqueue).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        jobType: 'check-threshold-breach',
        payload: expect.objectContaining({
          deviceId: 'device-1',
          cpuUsage: 75.5,
        }),
      }),
      expect.objectContaining({ priority: 2 })
    );
  });

  it('should NOT enqueue check-threshold-breach when hasAlerts is false', async () => {
    await handler.handle(createEvent(false));

    expect(mockJobQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(mockJobQueue.enqueue).not.toHaveBeenCalledWith(
      expect.objectContaining({ jobType: 'check-threshold-breach' }),
      expect.any(Object)
    );
  });
});
