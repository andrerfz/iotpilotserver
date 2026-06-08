export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitStore {
  increment(key: string): Promise<RateLimitEntry>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: any) {}

  async increment(key: string): Promise<RateLimitEntry> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Increment counter
    pipeline.incr(windowKey);

    // Set expiry if not exists (15 minutes default)
    pipeline.expire(windowKey, 900);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const count = results[0][1] as number;
    const resetTime = now + 900000; // 15 minutes from now

    return {
      count,
      resetTime
    };
  }

  async decrement(key: string): Promise<void> {
    const windowKey = `ratelimit:${key}`;
    await this.redis.decr(windowKey);
  }

  async resetKey(key: string): Promise<void> {
    const windowKey = `ratelimit:${key}`;
    await this.redis.del(windowKey);
  }

  async resetAll(): Promise<void> {
    const keys = await this.redis.keys('ratelimit:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// In-memory store for testing/development
export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  async increment(key: string): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetTime > now) {
      existing.count++;
      this.store.set(key, existing);
      return existing;
    }

    // Create new entry
    const entry: RateLimitEntry = {
      count: 1,
      resetTime: now + 900000 // 15 minutes
    };

    this.store.set(key, entry);
    return entry;
  }

  async decrement(key: string): Promise<void> {
    const existing = this.store.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
      this.store.set(key, existing);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.store.delete(key);
  }

  async resetAll(): Promise<void> {
    this.store.clear();
  }
}
