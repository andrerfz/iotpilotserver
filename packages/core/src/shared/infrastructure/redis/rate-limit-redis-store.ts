import type IORedis from 'ioredis';

/**
 * Redis store adapter for express-rate-limit v7.
 * Uses the existing ioredis connection from RedisConnectionFactory
 * so no extra Redis connection is opened.
 *
 * Implements the Store interface expected by express-rate-limit:
 *   increment(key): Promise<{ totalHits, resetTime }>
 *   decrement(key): Promise<void>
 *   resetKey(key): Promise<void>
 */
export class RateLimitRedisStore {
  readonly prefix: string;
  private readonly windowMs: number;
  private readonly client: IORedis;

  constructor(client: IORedis, windowMs: number, prefix = 'rl:') {
    this.client = client;
    this.windowMs = windowMs;
    this.prefix = prefix;
  }

  private key(raw: string): string {
    return `${this.prefix}${raw}`;
  }

  async increment(raw: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    const k = this.key(raw);
    const windowSec = Math.ceil(this.windowMs / 1000);

    // Atomic INCR + conditional EXPIRE using pipeline
    const pipeline = this.client.pipeline();
    pipeline.incr(k);
    pipeline.expire(k, windowSec, 'NX'); // set TTL only on first write
    pipeline.ttl(k);
    const results = (await pipeline.exec()) as [Error | null, number][];

    const totalHits = results[0][1] as number;
    const ttlSec = results[2][1] as number;
    const resetTime = ttlSec > 0 ? new Date(Date.now() + ttlSec * 1000) : undefined;

    return { totalHits, resetTime };
  }

  async decrement(raw: string): Promise<void> {
    await this.client.decr(this.key(raw));
  }

  async resetKey(raw: string): Promise<void> {
    await this.client.del(this.key(raw));
  }
}
