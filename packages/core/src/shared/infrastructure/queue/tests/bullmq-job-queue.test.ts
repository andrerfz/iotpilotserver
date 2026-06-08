import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BullMQ before imports
const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1' });
const mockAddBulk = vi.fn().mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]);
const mockGetJobCounts = vi.fn().mockResolvedValue({
  waiting: 5,
  active: 2,
  completed: 100,
  failed: 3,
  delayed: 1,
});
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    addBulk: mockAddBulk,
    getJobCounts: mockGetJobCounts,
    close: mockClose,
  })),
}));

import { BullMqJobQueue } from '../bullmq-job-queue';
import type { JobData } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

describe('BullMqJobQueue', () => {
  let queue: BullMqJobQueue;
  const mockRedisFactory = {
    getQueueConnection: vi.fn().mockReturnValue({}),
    getWorkerConnection: vi.fn().mockReturnValue({}),
    closeAll: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new BullMqJobQueue(mockRedisFactory);
  });

  describe('enqueue', () => {
    it('should enqueue a job with default options', async () => {
      const jobData: JobData = {
        jobType: 'send-slack-alert-notification',
        tenantId: 'tenant-1',
        payload: { alertId: 'alert-1' },
      };

      const jobId = await queue.enqueue(jobData);

      expect(jobId).toBe('job-1');
      expect(mockAdd).toHaveBeenCalledWith(
        'send-slack-alert-notification',
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        })
      );
    });

    it('should merge custom options with defaults', async () => {
      const jobData: JobData = {
        jobType: 'device-health-check',
        tenantId: 'tenant-1',
        payload: { deviceId: 'dev-1' },
      };

      await queue.enqueue(jobData, {
        delay: 30000,
        priority: 1,
        attempts: 5,
      });

      expect(mockAdd).toHaveBeenCalledWith(
        'device-health-check',
        jobData,
        expect.objectContaining({
          delay: 30000,
          priority: 1,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
        })
      );
    });

    it('should include tenantId in job data', async () => {
      const jobData: JobData = {
        jobType: 'test-job',
        tenantId: 'customer-abc',
        payload: { key: 'value' },
      };

      await queue.enqueue(jobData);

      expect(mockAdd).toHaveBeenCalledWith(
        'test-job',
        expect.objectContaining({ tenantId: 'customer-abc' }),
        expect.any(Object)
      );
    });
  });

  describe('enqueueBulk', () => {
    it('should enqueue multiple jobs', async () => {
      const jobs = [
        { data: { jobType: 'job-a', tenantId: 't-1', payload: {} } },
        { data: { jobType: 'job-b', tenantId: 't-1', payload: {} } },
      ];

      const ids = await queue.enqueueBulk(jobs);

      expect(ids).toEqual(['job-1', 'job-2']);
      expect(mockAddBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'job-a' }),
          expect.objectContaining({ name: 'job-b' }),
        ])
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await queue.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });
  });
});
