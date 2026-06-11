import { Queue, ConnectionOptions } from 'bullmq';
import type { RedisConnectionFactory } from '../redis/redis-connection.factory';
import type { JobData, JobOptions, JobQueue, QueueStats } from '../../application/interfaces/job-queue.interface';

const QUEUE_NAME = 'iotpilot-jobs';

const DEFAULT_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

/**
 * BullMQ-backed implementation of the JobQueue interface.
 * Uses Redis DB 1 for queue isolation from cache/sessions on DB 0.
 */
export class BullMqJobQueue implements JobQueue {
  private readonly queue: Queue;

  constructor(redisFactory: RedisConnectionFactory) {
    this.queue = new Queue(QUEUE_NAME, {
      connection: redisFactory.getQueueConnection() as unknown as ConnectionOptions,
    });
  }

  async enqueue(data: JobData, options?: JobOptions): Promise<string> {
    const merged = { ...DEFAULT_JOB_OPTIONS, ...options };
    const job = await this.queue.add(data.jobType, data, {
      attempts: merged.attempts,
      backoff: merged.backoff,
      delay: merged.delay,
      priority: merged.priority,
      removeOnComplete: merged.removeOnComplete,
      removeOnFail: merged.removeOnFail,
    });
    return job.id ?? '';
  }

  async enqueueBulk(jobs: Array<{ data: JobData; options?: JobOptions }>): Promise<string[]> {
    const bulkJobs = jobs.map(({ data, options }) => {
      const merged = { ...DEFAULT_JOB_OPTIONS, ...options };
      return {
        name: data.jobType,
        data,
        opts: {
          attempts: merged.attempts,
          backoff: merged.backoff,
          delay: merged.delay,
          priority: merged.priority,
          removeOnComplete: merged.removeOnComplete,
          removeOnFail: merged.removeOnFail,
        },
      };
    });

    const results = await this.queue.addBulk(bulkJobs);
    return results.map((job) => job.id ?? '');
  }

  async getQueueStats(): Promise<QueueStats> {
    const counts = await this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  }

  /**
   * Schedule a repeatable job (cron-like).
   * BullMQ deduplicates by job name — calling this multiple times is safe.
   */
  async scheduleRepeatable(
    jobType: string,
    data: JobData,
    pattern: string, // cron pattern e.g. "*/30 * * * *"
    options?: { removeOnComplete?: boolean | number; removeOnFail?: boolean | number }
  ): Promise<void> {
    await this.queue.add(jobType, data, {
      repeat: { pattern },
      removeOnComplete: options?.removeOnComplete ?? 50,
      removeOnFail: options?.removeOnFail ?? 100,
    });
  }

  /**
   * List all repeatable jobs (like Laravel schedule:list).
   */
  async getRepeatableJobs(): Promise<Array<{ name: string; pattern: string; next: Date | null }>> {
    const repeatables = await this.queue.getRepeatableJobs();
    return repeatables.map((r) => ({
      name: r.name,
      pattern: r.pattern ?? '',
      next: r.next ? new Date(r.next) : null,
    }));
  }

  /**
   * Expose the underlying BullMQ Queue for Bull Board adapter.
   */
  getQueue(): Queue {
    return this.queue;
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
