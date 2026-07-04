import 'reflect-metadata';
import { JobWorkerBootstrap } from '@iotpilot/core/shared/infrastructure/queue/job-worker-bootstrap';
import { StructuredLogger } from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import { prisma } from '@iotpilot/core/shared/infrastructure/database/prisma.service';

async function main(): Promise<void> {
  console.log('[Worker] Starting BullMQ worker...');

  // Seed the runtime log level from the admin-configured SystemConfig value —
  // see apps/backend/src/server.ts for the matching backend-side seed.
  try {
    const config = await prisma.getClient().systemConfig.findUnique({ where: { key: 'logLevel' } });
    if (config?.value) {
      StructuredLogger.setLevel(config.value);
    }
  } catch (err) {
    console.warn('[Worker] Failed to seed log level from SystemConfig:', (err as Error).message);
  }

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
