import IORedis from 'ioredis';

/**
 * Singleton factory for Redis connections.
 * Provides isolated connections for different concerns:
 * - DB 0: Cache/sessions (existing usage)
 * - DB 1: BullMQ job queue (isolated)
 *
 * BullMQ requires separate connections for Queue (enqueue) and Worker (process).
 */
export class RedisConnectionFactory {
  private static instance: RedisConnectionFactory;

  private queueConnection: IORedis | null = null;
  private workerConnection: IORedis | null = null;
  private generalConnection: IORedis | null = null;

  private readonly host: string;
  private readonly port: number;
  private readonly queueDb: number;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
    const parsed = new URL(redisUrl);
    this.host = parsed.hostname;
    this.port = parseInt(parsed.port || '6379', 10);
    this.queueDb = parseInt(process.env.BULLMQ_REDIS_DB || '1', 10);
  }

  static getInstance(): RedisConnectionFactory {
    if (!RedisConnectionFactory.instance) {
      RedisConnectionFactory.instance = new RedisConnectionFactory();
    }
    return RedisConnectionFactory.instance;
  }

  /**
   * Connection for BullMQ Queue (enqueue side) — Redis DB 1
   */
  getQueueConnection(): IORedis {
    if (!this.queueConnection) {
      this.queueConnection = new IORedis({
        host: this.host,
        port: this.port,
        db: this.queueDb,
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        lazyConnect: true,
      });
      this.queueConnection.connect().catch((err) => {
        console.error('[RedisConnectionFactory] Queue connection failed:', err.message);
      });
    }
    return this.queueConnection;
  }

  /**
   * Connection for BullMQ Worker (process side) — Redis DB 1
   * Must be a separate connection from Queue per BullMQ requirements.
   */
  getWorkerConnection(): IORedis {
    if (!this.workerConnection) {
      this.workerConnection = new IORedis({
        host: this.host,
        port: this.port,
        db: this.queueDb,
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        lazyConnect: true,
      });
      this.workerConnection.connect().catch((err) => {
        console.error('[RedisConnectionFactory] Worker connection failed:', err.message);
      });
    }
    return this.workerConnection;
  }

  /**
   * General-purpose connection — Redis DB 0 (cache/sessions)
   */
  getGeneralConnection(): IORedis {
    if (!this.generalConnection) {
      this.generalConnection = new IORedis({
        host: this.host,
        port: this.port,
        db: 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      this.generalConnection.connect().catch((err) => {
        console.error('[RedisConnectionFactory] General connection failed:', err.message);
      });
    }
    return this.generalConnection;
  }

  /**
   * Gracefully close all Redis connections.
   */
  async closeAll(): Promise<void> {
    const connections = [
      this.queueConnection,
      this.workerConnection,
      this.generalConnection,
    ].filter(Boolean) as IORedis[];

    await Promise.all(connections.map((conn) => conn.quit().catch(() => conn.disconnect())));

    this.queueConnection = null;
    this.workerConnection = null;
    this.generalConnection = null;
  }

  /**
   * Reset the singleton (for testing).
   */
  static resetInstance(): void {
    RedisConnectionFactory.instance = null as any;
  }
}
