import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock BullMQ Worker
const mockWorkerOn = vi.fn();
const mockWorkerClose = vi.fn().mockResolvedValue(undefined);
let capturedProcessor: ((job: any) => Promise<any>) | null = null;

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((_name: string, processor: any, _opts: any) => {
    capturedProcessor = processor;
    return {
      on: mockWorkerOn,
      close: mockWorkerClose,
    };
  }),
}));

import { BullMqJobWorker } from '../bullmq-job-worker';
import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';

describe('BullMqJobWorker', () => {
  let worker: BullMqJobWorker;
  const mockRedisFactory = {
    getWorkerConnection: vi.fn().mockReturnValue({}),
    getQueueConnection: vi.fn().mockReturnValue({}),
    closeAll: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedProcessor = null;
    worker = new BullMqJobWorker(mockRedisFactory);
  });

  describe('registerProcessor', () => {
    it('should register a processor for a job type', () => {
      const processor: JobProcessor = {
        jobType: 'send-slack-alert-notification',
        process: vi.fn(),
      };

      worker.registerProcessor(processor);
      // No error thrown — processor registered
    });
  });

  describe('routing', () => {
    it('should route a job to the correct processor', async () => {
      const mockResult: JobResult = { success: true, data: { sent: true } };
      const processor: JobProcessor = {
        jobType: 'send-slack-alert-notification',
        process: vi.fn().mockResolvedValue(mockResult),
      };

      worker.registerProcessor(processor);
      worker.start();

      expect(capturedProcessor).toBeTruthy();

      const fakeJob = {
        id: 'job-1',
        name: 'send-slack-alert-notification',
        data: {
          jobType: 'send-slack-alert-notification',
          tenantId: 'tenant-1',
          payload: { alertId: 'alert-1' },
        } as JobData,
      };

      const result = await capturedProcessor!(fakeJob);

      expect(processor.process).toHaveBeenCalledWith(fakeJob.data);
      expect(result).toEqual(mockResult);
    });

    it('should return error for unregistered job type', async () => {
      worker.start();

      const fakeJob = {
        id: 'job-2',
        name: 'unknown-job',
        data: {
          jobType: 'unknown-job',
          tenantId: 'tenant-1',
          payload: {},
        } as JobData,
      };

      const result = await capturedProcessor!(fakeJob);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No processor registered');
    });
  });

  describe('lifecycle', () => {
    it('should start the worker and register event listeners', () => {
      worker.start();

      expect(mockWorkerOn).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorkerOn).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockWorkerOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should close the worker gracefully', async () => {
      worker.start();
      await worker.close();

      expect(mockWorkerClose).toHaveBeenCalled();
    });
  });
});
