import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnAlertTriggeredHandler } from '../on-alert-triggered.handler';
import type { AlertTriggeredEvent } from '@iotpilot/core/monitoring/domain/events/alert-triggered.event';
import type { JobQueue } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

describe('OnAlertTriggeredHandler', () => {
  let handler: OnAlertTriggeredHandler;
  let mockJobQueue: JobQueue;

  beforeEach(() => {
    mockJobQueue = {
      enqueue: vi.fn().mockResolvedValue('job-1'),
      enqueueBulk: vi.fn(),
      getQueueStats: vi.fn(),
    };
    handler = new OnAlertTriggeredHandler(mockJobQueue);
  });

  function createEvent(severity: string): AlertTriggeredEvent {
    return {
      eventId: 'evt-123',
      eventType: 'AlertTriggeredEvent',
      occurredOn: new Date(),
      alertId: { value: 'alert-1' },
      deviceId: { value: 'device-1' },
      thresholdId: { value: 'threshold-1' },
      severity: { value: severity },
      tenantId: { value: 'tenant-1' },
      eventData: {},
    } as unknown as AlertTriggeredEvent;
  }

  it('should enqueue a slack notification job', async () => {
    await handler.handle(createEvent('MEDIUM'));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: 'send-slack-alert-notification',
        tenantId: 'tenant-1',
        payload: expect.objectContaining({
          alertId: 'alert-1',
          deviceId: 'device-1',
          severity: 'MEDIUM',
        }),
      }),
      expect.any(Object)
    );
  });

  it('should use priority 1 and 5 attempts for CRITICAL alerts', async () => {
    await handler.handle(createEvent('CRITICAL'));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ priority: 1, attempts: 5 })
    );
  });

  it('should use priority 1 and 5 attempts for HIGH alerts', async () => {
    await handler.handle(createEvent('HIGH'));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ priority: 1, attempts: 5 })
    );
  });

  it('should use priority 5 and 3 attempts for LOW alerts', async () => {
    await handler.handle(createEvent('LOW'));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ priority: 5, attempts: 3 })
    );
  });

  it('should include correlationId from eventId', async () => {
    await handler.handle(createEvent('MEDIUM'));

    expect(mockJobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          correlationId: 'evt-123',
          sourceEvent: 'AlertTriggeredEvent',
        }),
      }),
      expect.any(Object)
    );
  });
});
