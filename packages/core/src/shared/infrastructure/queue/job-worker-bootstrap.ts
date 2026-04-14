import { RedisConnectionFactory } from '../redis/redis-connection.factory';
import { BullMqJobQueue } from './bullmq-job-queue';
import { BullMqJobWorker } from './bullmq-job-worker';
import type { JobProcessor } from '../../application/interfaces/job-queue.interface';

// Import all processors
import { SendSlackAlertNotificationProcessor } from '@iotpilot/core/monitoring/infrastructure/jobs/send-slack-alert-notification.processor';
import { DeviceRegisteredNotificationProcessor } from '@iotpilot/core/device/infrastructure/jobs/device-registered-notification.processor';
import { DeviceHealthCheckProcessor } from '@iotpilot/core/device/infrastructure/jobs/device-health-check.processor';
import { ProcessDeviceMetricsProcessor } from '@iotpilot/core/device/infrastructure/jobs/process-device-metrics.processor';
import { SensorOfflineCheckProcessor } from '@iotpilot/core/device/infrastructure/jobs/sensor-offline-check.processor';
import { DispatchNotificationChannelProcessor } from '@iotpilot/core/notification/infrastructure/jobs/dispatch-notification-channel.processor';

/**
 * Orchestrator for the BullMQ job queue worker.
 * Creates queue, worker, and registers all job processors.
 */
export class JobWorkerBootstrap {
  private static instance: JobWorkerBootstrap;

  private queue: BullMqJobQueue | null = null;
  private worker: BullMqJobWorker | null = null;
  private started = false;

  private constructor() {}

  static getInstance(): JobWorkerBootstrap {
    if (!JobWorkerBootstrap.instance) {
      JobWorkerBootstrap.instance = new JobWorkerBootstrap();
    }
    return JobWorkerBootstrap.instance;
  }

  /**
   * Start the job queue worker with all registered processors.
   */
  async start(): Promise<void> {
    if (this.started) {
      console.warn('[JobWorkerBootstrap] Already started');
      return;
    }

    try {
      const redisFactory = RedisConnectionFactory.getInstance();

      // Create queue (for enqueuing from event handlers)
      this.queue = new BullMqJobQueue(redisFactory);

      // Create worker with all processors
      this.worker = new BullMqJobWorker(redisFactory);

      const processors: JobProcessor[] = [
        new SendSlackAlertNotificationProcessor(),
        new DeviceRegisteredNotificationProcessor(),
        new DeviceHealthCheckProcessor(),
        new ProcessDeviceMetricsProcessor(),
        new SensorOfflineCheckProcessor(),
        new DispatchNotificationChannelProcessor(),
      ];

      for (const processor of processors) {
        this.worker.registerProcessor(processor);
      }

      this.worker.start();
      this.started = true;

      // Register scheduled/repeatable jobs (like Laravel $schedule->...)
      await this.registerScheduledJobs();

      console.log(
        `[JobWorkerBootstrap] Worker started with ${processors.length} processors`
      );
    } catch (error) {
      console.error('[JobWorkerBootstrap] Failed to start:', (error as Error).message);
    }
  }

  /**
   * Register all scheduled/repeatable jobs.
   * Safe to call multiple times — BullMQ deduplicates by job name.
   */
  private async registerScheduledJobs(): Promise<void> {
    if (!this.queue) return;

    // Mark stale sensors as OFFLINE — runs every 30 minutes
    await this.queue.scheduleRepeatable(
      'sensor-offline-check',
      {
        jobType: 'sensor-offline-check',
        tenantId: 'system',
        payload: {},
        metadata: { sourceEvent: 'scheduler' },
      },
      '*/30 * * * *' // Every 30 minutes
    );

    console.log('[JobWorkerBootstrap] Scheduled jobs registered');
  }

  /**
   * List all scheduled/repeatable jobs (like Laravel schedule:list).
   */
  async getScheduledJobs(): Promise<Array<{ name: string; pattern: string; next: Date | null }>> {
    if (!this.queue) return [];
    return this.queue.getRepeatableJobs();
  }

  /**
   * Get the BullMQ queue instance (for Bull Board or stats).
   */
  getQueue(): BullMqJobQueue | null {
    return this.queue;
  }

  /**
   * Gracefully shut down worker and close connections.
   */
  async gracefulShutdown(): Promise<void> {
    console.log('[JobWorkerBootstrap] Shutting down...');

    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    await RedisConnectionFactory.getInstance().closeAll();

    this.started = false;
    console.log('[JobWorkerBootstrap] Shutdown complete');
  }
}
