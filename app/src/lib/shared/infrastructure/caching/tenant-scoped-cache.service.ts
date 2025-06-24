import { Injectable } from '@nestjs/common';
import { CustomerId } from '@/lib/shared/domain/value-objects/customer-id.vo';
import { TenantContext } from '@/lib/shared/application/context/tenant-context.vo';

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

@Injectable()
export class TenantScopedCacheService {
  private cache: Map<string, Map<string, CacheEntry>> = new Map();
  
  /**
   * Get a value from the cache for a specific tenant
   * @param key The cache key
   * @param tenantContext The tenant context
   * @returns The cached value or null if not found or expired
   */
  get<T>(key: string, tenantContext: TenantContext): T | null {
    const tenantId = this.getTenantIdFromContext(tenantContext);
    const tenantCache = this.cache.get(tenantId);
    
    if (!tenantCache) {
      return null;
    }
    
    const entry = tenantCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      tenantCache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }
  
  /**
   * Set a value in the cache for a specific tenant
   * @param key The cache key
   * @param value The value to cache
   * @param ttlMs Time to live in milliseconds (optional)
   * @param tenantContext The tenant context
   */
  set(key: string, value: any, ttlMs: number | null, tenantContext: TenantContext): void {
    const tenantId = this.getTenantIdFromContext(tenantContext);
    let tenantCache = this.cache.get(tenantId);
    
    if (!tenantCache) {
      tenantCache = new Map();
      this.cache.set(tenantId, tenantCache);
    }
    
    const expiresAt = ttlMs !== null ? Date.now() + ttlMs : null;
    
    tenantCache.set(key, {
      value,
      expiresAt
    });
  }
  
  /**
   * Delete a value from the cache for a specific tenant
   * @param key The cache key
   * @param tenantContext The tenant context
   * @returns true if the key was deleted, false otherwise
   */
  delete(key: string, tenantContext: TenantContext): boolean {
    const tenantId = this.getTenantIdFromContext(tenantContext);
    const tenantCache = this.cache.get(tenantId);
    
    if (!tenantCache) {
      return false;
    }
    
    return tenantCache.delete(key);
  }
  
  /**
   * Clear all cache entries for a specific tenant
   * @param tenantContext The tenant context
   */
  clearTenantCache(tenantContext: TenantContext): void {
    const tenantId = this.getTenantIdFromContext(tenantContext);
    this.cache.delete(tenantId);
  }
  
  /**
   * Clear all cache entries for all tenants
   */
  clearAllCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get the tenant ID from the tenant context
   * @param tenantContext The tenant context
   * @returns The tenant ID as a string
   */
  private getTenantIdFromContext(tenantContext: TenantContext): string {
    // For SUPERADMIN without a specific tenant context, use a special key
    if (tenantContext.canBypassTenantRestrictions() && !tenantContext.requiresTenantScope()) {
      return 'SUPERADMIN';
    }
    
    // Get the customer ID from the tenant context
    const customerId = tenantContext.getCustomerId();
    
    if (!customerId) {
      throw new Error('Tenant context does not have a customer ID');
    }
    
    return customerId.getValue();
  }
}