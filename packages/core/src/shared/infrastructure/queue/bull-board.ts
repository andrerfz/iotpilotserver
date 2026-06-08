import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { JobWorkerBootstrap } from './job-worker-bootstrap';

/**
 * Creates an Express router for the Bull Board dashboard.
 * Protected: only accessible in development or to SUPERADMIN users.
 *
 * Mount at: server.use('/admin/queues', createBullBoardRouter())
 */
export function createBullBoardRouter() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const bootstrap = JobWorkerBootstrap.getInstance();
  const jobQueue = bootstrap.getQueue();

  if (jobQueue) {
    createBullBoard({
      queues: [new BullMQAdapter(jobQueue.getQueue())],
      serverAdapter,
    });
  } else {
    // Create empty dashboard — queue may not be ready yet
    createBullBoard({
      queues: [],
      serverAdapter,
    });
  }

  return serverAdapter.getRouter();
}
