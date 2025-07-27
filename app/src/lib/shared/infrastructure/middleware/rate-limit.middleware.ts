import {NextFunction, Request, Response} from 'express';
import {TenantContext} from '../../domain/tenant-context';
import {RateLimitConfig} from '../../domain/value-objects/rate-limit-config.vo';
import {StructuredLogger} from '../logging/structured-logger';
import Redis from 'ioredis';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        key: string;
        remaining: number;
        reset: number;
        total: number;
        isLimited: boolean;
      };
      tenantContext?: TenantContext;
    }
  }
}

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  message?: string | object;
  statusCode?: number;
  skip?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  tenantAware?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export class RateLimitMiddleware {
  private readonly config: RateLimitConfig;
  private readonly store: RateLimitStore;
  private readonly logger: StructuredLogger;

  constructor(
    logger: StructuredLogger,
    store: RateLimitStore,
    options: RateLimitOptions = {}
  ) {
    this.logger = logger;
    this.store = store;
    
    this.config = RateLimitConfig.create({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
      maxRequests: options.max || 100, // 100 requests default
      keyGenerator: options.keyGenerator
    });
  }

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip rate limiting for certain requests
    if (this.shouldSkip(req)) {
      return next();
    }

    try {
      const rateLimitKey = this.generateKey(req);
      const tenantId = req.tenantContext?.getTenantId() || 'global';
      
      // Use default config (tenant-specific limits not implemented yet)
      const effectiveConfig = { windowMs: this.config.windowMs, maxRequests: this.config.maxRequests };
      
      const result = await this.store.getAndIncrement(
        rateLimitKey,
        effectiveConfig.windowMs,
        effectiveConfig.maxRequests
      );

      req.rateLimit = {
        key: rateLimitKey,
        remaining: Math.max(0, effectiveConfig.maxRequests - result.current),
        reset: Date.now() + effectiveConfig.windowMs,
        total: effectiveConfig.maxRequests,
        isLimited: result.isLimited
      };

      // Set rate limit headers
      this.setRateLimitHeaders(req, res, this.config);

      if (result.isLimited) {
        this.handleRateLimitExceeded(req, res, this.config);
        return;
      }

      this.logger.debug('Rate limit check passed', {
        key: this.maskKey(rateLimitKey),
        remaining: req.rateLimit.remaining,
        reset: new Date(req.rateLimit.reset).toISOString(),
        total: req.rateLimit.total,
        tenantId,
        method: req.method,
        path: req.path,
        ip: this.getClientIp(req)
      });

      next();
      
    } catch (error) {
      this.logger.error('Rate limit middleware error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        path: req.path,
        method: req.method,
        ip: this.getClientIp(req)
      });
      
      // Continue processing even if rate limiting fails
      next();
    }
  };

  private shouldSkip(req: Request): boolean {
    // Skip function not configured in this version

    // Skip common non-rate-limited paths
    const skipPaths = [
      '/health',
      '/status',
      '/metrics',
      '/api/health',
      '/api/status',
      '/favicon.ico',
      '/robots.txt'
    ];

    const path = req.path.toLowerCase();
    return skipPaths.some(skipPath => path === skipPath || path.startsWith(skipPath));
  }

  private generateKey(req: Request): string {
    if (typeof this.config.keyGenerator === 'function') {
      return this.config.keyGenerator(req);
    }

    const parts: string[] = [];
    
    // IP-based limiting
    const ip = this.getClientIp(req);
    parts.push(`ip:${ip}`);
    
    // Tenant-based limiting
    if (req.tenantContext?.getTenantId()) {
      parts.push(`tenant:${req.tenantContext.getTenantId()}`);
    }
    
    // User-based limiting
    if (req.tenantContext?.getUserId()) {
      parts.push(`user:${req.tenantContext.getUserId().getValue()}`);
    }
    
    // API key-based limiting
    const apiKey = req.get('X-API-Key') || req.query.apiKey;
    if (apiKey) {
      parts.push(`apikey:${apiKey}`);
    }
    
    // Route-based limiting
    const routeKey = `${req.method.toUpperCase()}:${req.path}`;
    parts.push(`route:${routeKey}`);
    
    // Combine with hash for long keys
    const keyPrefix = parts.join(':');
    const fullKey = keyPrefix.length > 100 
      ? `rl:${this.hashKey(keyPrefix)}`
      : `rl:${keyPrefix}`;
    
    return fullKey;
  }

  private async getTenantConfig(
    tenantId: string,
    req: Request
  ): Promise<Partial<RateLimitOptions>> {
    // Implementation would get tenant-specific rate limits from database
    // For now, return empty config (use global limits)
    
    // Example tenant-specific limits:
    // if (tenantId === 'premium-customer') {
    //   return { max: 1000, windowMs: 15 * 60 * 1000 };
    // }
    
    return {};
  }

  private setRateLimitHeaders(req: Request, res: Response, config: RateLimitConfig): void {
    if (!req.rateLimit) return;

    // Standard rate limit headers
    if (true) {
      res.setHeader('X-RateLimit-Limit', req.rateLimit!.total.toString());
      res.setHeader('X-RateLimit-Remaining', req.rateLimit!.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.floor(req.rateLimit!.reset / 1000).toString());
    }

    // Legacy headers disabled
    if (false) {
      res.setHeader('X-RateLimit-Limit', req.rateLimit!.total.toString());
      res.setHeader('X-RateLimit-Remaining', req.rateLimit!.remaining.toString());
      res.setHeader('Retry-After', Math.max(1, Math.ceil((req.rateLimit!.reset - Date.now()) / 1000)).toString());
    }

    // Custom tenant headers
    if (req.tenantContext?.getTenantId()) {
      res.setHeader('X-Tenant-RateLimit-Limit', req.rateLimit.total.toString());
    }

    // Rate limit policy header
    const policy = `max=${config.maxRequests}; w=${Math.floor(config.windowMs / 1000)}`;
    res.setHeader('RateLimit-Policy', policy);
  }

  private handleRateLimitExceeded(req: Request, res: Response, config: RateLimitConfig): void {
    const key = req.rateLimit?.key || 'unknown';
    const ip = this.getClientIp(req);
    
    this.logger.warn('Rate limit exceeded', {
      key: this.maskKey(key),
      remaining: req.rateLimit?.remaining || 0,
      reset: new Date(req.rateLimit?.reset || Date.now()).toISOString(),
      method: req.method,
      path: req.path,
      ip,
      tenantId: req.tenantContext?.getTenantId(),
      userId: req.tenantContext?.getUserId()?.getValue(),
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });

    // Custom handler not available in this config

    // Default rate limit response
    const response = {
      error: 'Rate limit exceeded',
      message: typeof undefined === 'string' 
        ? undefined 
        : 'Too many requests from this IP, please try again later.',
      limits: {
        windowMs: config.windowMs,
        max: config.maxRequests,
        remaining: req.rateLimit?.remaining || 0,
        reset: req.rateLimit?.reset || Date.now() + config.windowMs
      },
      request: {
        method: req.method,
        path: req.path,
        ip: this.maskIp(ip),
        timestamp: new Date().toISOString()
      }
    };

    res.status(429).json(response);
  }

  private getClientIp(req: Request): string {
    // Handle different proxy configurations
    const forwarded = req.get('X-Forwarded-For');
    const realIp = req.get('X-Real-IP');
    const cloudflareIp = req.get('CF-Connecting-IP');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    if (cloudflareIp) {
      return cloudflareIp;
    }
    
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private maskKey(key: string): string {
    if (!key) return 'unknown';
    
    // Show first 8 and last 4 characters, mask middle
    if (key.length <= 12) return key;
    
    return `${key.substring(0, 8)}...${key.slice(-4)}`;
  }

  private maskIp(ip: string): string {
    if (!ip || ip === 'unknown') return ip;
    
    const parts = ip.split('.');
    if (parts.length === 4) {
      // IPv4: mask last octet
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    
    // IPv6: mask middle parts
    if (ip.includes(':')) {
      const sections = ip.split(':');
      if (sections.length >= 8) {
        return `${sections[0]}:${sections[1]}:****:${sections[4]}:${sections[5]}:${sections[6]}:${sections[7]}`;
      }
    }
    
    return ip.substring(0, ip.lastIndexOf('.') + 1) + '***';
  }

  private hashKey(key: string): string {
    // Simple hash for long keys (in production, use proper crypto)
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Get current rate limit stats
  getCurrentStats(req: Request): any {
    return req.rateLimit ? {
      key: this.maskKey(req.rateLimit.key),
      remaining: req.rateLimit.remaining,
      reset: new Date(req.rateLimit.reset).toISOString(),
      total: req.rateLimit.total,
      isLimited: req.rateLimit.isLimited,
      windowMs: this.config.windowMs,
      max: this.config.maxRequests
    } : null;
  }

  // Reset rate limit for specific key (admin function)
  async resetRateLimit(key: string): Promise<boolean> {
    try {
      await this.store.reset(key);
      this.logger.info('Rate limit manually reset', { key: this.maskKey(key) });
      return true;
    } catch (error) {
      this.logger.error('Failed to reset rate limit', {
        key: this.maskKey(key),
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Get rate limit usage statistics
  async getRateLimitStats(tenantId?: string): Promise<RateLimitStats> {
    return this.store.getStats(tenantId);
  }
}

export interface RateLimitStats {
  totalKeys: number;
  activeLimits: number;
  hits: number;
  exceeded: number;
  byTenant: Record<string, number>;
  topKeys: string[];
  resetTime: Date;
}

// Redis-based rate limit store implementation
export class RedisRateLimitStore implements RateLimitStore {
  private readonly client: any;
  private readonly prefix = 'rl:';

  constructor(redisUrl?: string) {
    this.client = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Handle connection errors
    this.client.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
  }

  async getAndIncrement(
    key: string, 
    windowMs: number, 
    max: number
  ): Promise<{ current: number; isLimited: boolean }> {
    const fullKey = `${this.prefix}${key}`;
    const windowStart = Date.now() - windowMs;
    const pipeline = this.client.pipeline();

    // Get current count
    pipeline.get(fullKey);
    // Set with expiration if not exists
    pipeline.set(fullKey, '1', 'PX', windowMs, 'NX');
    // Increment
    pipeline.incr(fullKey);

    const [currentStr, , newCountStr] = await pipeline.exec() as any[];

    let current = parseInt(currentStr[1]) || 0;
    const newCount = parseInt(newCountStr[1]) || 1;

    // Clean up old entries if needed (Lua script would be better)
    await this.cleanupOldEntries(key, windowStart);

    return {
      current: Math.max(current, newCount - 1),
      isLimited: newCount > max
    };
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    await this.client.del(fullKey);
  }

  async getStats(tenantId?: string): Promise<RateLimitStats> {
    const pattern = tenantId ? `${this.prefix}tenant:${tenantId}:*` : `${this.prefix}*`;
    const keys = await this.client.keys(pattern);
    
    if (keys.length === 0) {
      return {
        totalKeys: 0,
        activeLimits: 0,
        hits: 0,
        exceeded: 0,
        byTenant: {},
        topKeys: [],
        resetTime: new Date()
      };
    }

    const pipeline = this.client.pipeline();
    keys.forEach((key: string) => pipeline.get(key));
    const values = await pipeline.exec() as any[];

    let totalHits = 0;
    let exceededCount = 0;
    const tenantStats: Record<string, number> = {};
    const keyCounts: Record<string, number> = {};

    values.forEach(([key, value]: [string, string]) => {
      if (value) {
        const count = parseInt(value);
        totalHits += count;
        
        const keyName = key.replace(this.prefix, '');
        keyCounts[keyName] = (keyCounts[keyName] || 0) + 1;
        
        // Check if exceeded (value > 100, assuming default max)
        if (count > 100) {
          exceededCount++;
        }
        
        // Extract tenant for stats
        const tenantMatch = keyName.match(/tenant:([a-f0-9-]+)/);
        if (tenantMatch) {
          const tenant = tenantMatch[1];
          tenantStats[tenant] = (tenantStats[tenant] || 0) + 1;
        }
      }
    });

    const topKeys = Object.entries(keyCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([key]) => key);

    return {
      totalKeys: keys.length,
      activeLimits: Object.keys(keyCounts).length,
      hits: totalHits,
      exceeded: exceededCount,
      byTenant: tenantStats,
      topKeys,
      resetTime: new Date()
    };
  }

  private async cleanupOldEntries(key: string, cutoff: number): Promise<void> {
    // Implementation for cleaning up expired entries
    // In production, this would be handled by Redis expiration
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await (this.client as any).quit();
  }
}

export interface RateLimitStore {
  getAndIncrement(key: string, windowMs: number, max: number): Promise<{ current: number; isLimited: boolean }>;
  reset(key: string): Promise<void>;
  getStats(tenantId?: string): Promise<RateLimitStats>;
}

// Memory-based store for testing
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly store: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private readonly ttl: number = 15 * 60 * 1000) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  async getAndIncrement(
    key: string, 
    windowMs: number, 
    max: number
  ): Promise<{ current: number; isLimited: boolean }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    let entry = this.store.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window
      entry = { count: 1, resetTime };
      this.store.set(key, entry);
      return { current: 0, isLimited: false };
    }
    
    // Increment existing window
    entry.count++;
    this.store.set(key, entry);
    
    return { 
      current: entry.count - 1, 
      isLimited: entry.count > max 
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getStats(): Promise<RateLimitStats> {
    return {
      totalKeys: this.store.size,
      activeLimits: this.store.size,
      hits: Array.from(this.store.values()).reduce((sum, entry) => sum + entry.count, 0),
      exceeded: 0, // Would need tracking
      byTenant: {},
      topKeys: Array.from(this.store.keys()).slice(0, 10),
      resetTime: new Date()
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}
