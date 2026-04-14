/**
 * Job data structure for enqueuing background work.
 * All properties must be JSON-serializable (no value objects).
 */
export interface JobData {
  jobType: string;
  tenantId: string;
  payload: Record<string, unknown>;
  metadata?: {
    correlationId?: string;
    sourceEvent?: string;
    priority?: number;
  };
}

/**
 * Options for job scheduling.
 */
export interface JobOptions {
  /** Delay in milliseconds before the job becomes processable */
  delay?: number;
  /** Number of retry attempts (default: 3) */
  attempts?: number;
  /** Backoff strategy for retries */
  backoff?: { type: 'exponential' | 'fixed'; delay: number };
  /** Priority — lower number = higher priority */
  priority?: number;
  /** Auto-remove completed jobs (true, false, or max count to keep) */
  removeOnComplete?: boolean | number;
  /** Auto-remove failed jobs (true, false, or max count to keep) */
  removeOnFail?: boolean | number;
}

/**
 * Result returned by a job processor after execution.
 */
export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Queue statistics for monitoring.
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Interface for enqueuing background jobs.
 */
export interface JobQueue {
  enqueue(data: JobData, options?: JobOptions): Promise<string>;
  enqueueBulk(jobs: Array<{ data: JobData; options?: JobOptions }>): Promise<string[]>;
  getQueueStats(): Promise<QueueStats>;
}

/**
 * Interface for job processors that handle specific job types.
 */
export interface JobProcessor {
  readonly jobType: string;
  process(data: JobData): Promise<JobResult>;
}
