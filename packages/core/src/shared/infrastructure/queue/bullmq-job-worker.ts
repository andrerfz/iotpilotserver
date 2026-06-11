import { Worker, Job, ConnectionOptions } from 'bullmq';
import type { RedisConnectionFactory } from '../redis/redis-connection.factory';
import type { JobData, JobProcessor, JobResult } from '../../application/interfaces/job-queue.interface';

const QUEUE_NAME = 'iotpilot-jobs';

/**
 * BullMQ Worker wrapper with processor routing.
 * Routes jobs to the appropriate JobProcessor based on `jobType`.
 */
export class BullMqJobWorker {
  private worker: Worker | null = null;
  private readonly processors = new Map<string, JobProcessor>();
  private readonly redisFactory: RedisConnectionFactory;
  private readonly concurrency: number;

  constructor(redisFactory: RedisConnectionFactory) {
    this.redisFactory = redisFactory;
    this.concurrency = parseInt(process.env.BULLMQ_CONCURRENCY || '5', 10);
  }

  /**
   * Register a processor to handle a specific job type.
   */
  registerProcessor(processor: JobProcessor): void {
    this.processors.set(processor.jobType, processor);
    console.log(`[BullMqJobWorker] Registered processor: ${processor.jobType}`);
  }

  /**
   * Start the BullMQ worker.
   */
  start(): void {
    if (this.worker) {
      console.warn('[BullMqJobWorker] Worker already started');
      return;
    }

    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<JobData>) => {
        return this.routeJob(job);
      },
      {
        connection: this.redisFactory.getWorkerConnection() as unknown as ConnectionOptions,
        concurrency: this.concurrency,
      }
    );

    this.worker.on('completed', (job: Job) => {
      console.log(
        `[BullMqJobWorker] Job completed: ${job.name} [${job.id}] tenant=${job.data?.tenantId ?? 'unknown'}`
      );
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(
        `[BullMqJobWorker] Job failed: ${job?.name ?? 'unknown'} [${job?.id ?? '?'}] - ${err.message}`
      );
    });

    this.worker.on('error', (err: Error) => {
      console.error('[BullMqJobWorker] Worker error:', err.message);
    });

    console.log(
      `[BullMqJobWorker] Worker started (concurrency=${this.concurrency}, processors=${this.processors.size})`
    );
  }

  /**
   * Route a job to the matching processor.
   */
  private async routeJob(job: Job<JobData>): Promise<JobResult> {
    const { jobType } = job.data;
    const processor = this.processors.get(jobType);

    if (!processor) {
      const error = `No processor registered for job type: ${jobType}`;
      console.error(`[BullMqJobWorker] ${error}`);
      return { success: false, error };
    }

    return processor.process(job.data);
  }

  /**
   * Gracefully shut down the worker.
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      console.log('[BullMqJobWorker] Worker stopped');
    }
  }
}
