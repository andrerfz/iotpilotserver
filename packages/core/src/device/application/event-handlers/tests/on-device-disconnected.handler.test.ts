import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnDeviceDisconnectedHandler } from '../on-device-disconnected.handler';
import type { DeviceDisconnectedEvent } from '@iotpilot/core/device/domain/events/device-disconnected.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

describe('OnDeviceDisconnectedHandler', () => {
  let handler: OnDeviceDisconnectedHandler;
  let mockJobQueue: JobQueue;

  beforeEach(() => {
    mockJobQueue = {
      enqueue: vi.fn().mockResolvedValue('job-1'),
      enqueueBulk: vi.fn(),
      getQueueStats: vi.fn(),
    };
    handler = new OnDeviceDisconnectedHandler(mockJobQueue);
  });

  function createEvent(wasGraceful: boolean): DeviceDisconnectedEvent {
    return {
      eventId: 'evt-789',
      eventType: 'DeviceDisconnectedEvent',
      occurredOn: new Date(),
      deviceId: { value: 'device-1' },
      deviceName: { value: 'rpi-kitchen' },
      disconnectionTimestamp: new Date('2026-03-02T12:00:00Z'),
      disconnectionReason: wasGraceful ? 'user-initiated' : null,
      wasGraceful,
      tenantId: { value: 'tenant-1' },
    } as unknown as DeviceDisconnectedEvent;
  }

  it('should enqueue a device-health-check job with 30s delay', async () => {
    await handler.handle(createEvent(true));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: 'device-health-check',
        tenantId: 'tenant-1',
        payload: expect.objectContaining({
          deviceId: 'device-1',
          deviceName: 'rpi-kitchen',
          wasGraceful: true,
        }),
      }),
      expect.objectContaining({ delay: 30_000 })
    );
  });

  it('should use priority 10 for graceful disconnections', async () => {
    await handler.handle(createEvent(true));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ priority: 10 })
    );
  });

  it('should use priority 3 for ungraceful disconnections', async () => {
    await handler.handle(createEvent(false));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ priority: 3 })
    );
  });

  it('should serialize disconnectionTimestamp as ISO string', async () => {
    await handler.handle(createEvent(true));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          disconnectionTimestamp: '2026-03-02T12:00:00.000Z',
        }),
      }),
      expect.any(Object)
    );
  });
});
