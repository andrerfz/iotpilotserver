import 'reflect-metadata';
import { JobWorkerBootstrap } from '@iotpilot/core/shared/infrastructure/queue/job-worker-bootstrap';

async function main(): Promise<void> {
  console.log('[Worker] Starting BullMQ worker...');

  const bootstrap = JobWorkerBootstrap.getInstance();
  await bootstrap.start();

  console.log('[Worker] Running — waiting for jobs');

  const shutdown = async (signal: string) => {
    console.log(`[Worker] ${signal} received, shutting down...`);
    await bootstrap.gracefulShutdown();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
