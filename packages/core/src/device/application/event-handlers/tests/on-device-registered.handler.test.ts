import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnDeviceRegisteredHandler } from '../on-device-registered.handler';
import type { DeviceRegisteredEvent } from '@iotpilot/core/device/domain/events/device-registered.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

describe('OnDeviceRegisteredHandler', () => {
  let handler: OnDeviceRegisteredHandler;
  let mockJobQueue: JobQueue;

  beforeEach(() => {
    mockJobQueue = {
      enqueue: vi.fn().mockResolvedValue('job-1'),
      enqueueBulk: vi.fn(),
      getQueueStats: vi.fn(),
    };
    handler = new OnDeviceRegisteredHandler(mockJobQueue);
  });

  function createEvent(): DeviceRegisteredEvent {
    return {
      eventId: 'evt-456',
      eventType: 'DeviceRegisteredEvent',
      occurredOn: new Date(),
      deviceId: { value: 'device-1' },
      deviceName: { value: 'rpi-living-room' },
      ipAddress: { value: '192.168.1.100' },
      status: { value: 'PENDING' },
      tenantId: { value: 'tenant-1' },
    } as unknown as DeviceRegisteredEvent;
  }

  it('should enqueue a device-registered-notification job', async () => {
    await handler.handle(createEvent());

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: 'device-registered-notification',
        tenantId: 'tenant-1',
        payload: expect.objectContaining({
          deviceId: 'device-1',
          deviceName: 'rpi-living-room',
          ipAddress: '192.168.1.100',
          status: 'PENDING',
        }),
      }),
      expect.objectContaining({ priority: 10 })
    );
  });

  it('should include sourceEvent metadata', async () => {
    await handler.handle(createEvent());

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          sourceEvent: 'DeviceRegisteredEvent',
          correlationId: 'evt-456',
        }),
      }),
      expect.any(Object)
    );
  });
});
