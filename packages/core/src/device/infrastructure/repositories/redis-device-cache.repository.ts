import {DeviceMapper} from '../mappers/device.mapper';
import {DeviceEntity} from '../../domain/entities/device.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {DeviceRepository, DeviceSearchOptions, DeviceSearchResult} from '../../domain/interfaces/device.repository';
import {TenantContext} from '../../../shared/domain/tenant-context';

export class RedisDeviceCacheRepository implements DeviceRepository {
  constructor(
    private readonly redis: any, // Redis client
    private readonly fallbackRepository: DeviceRepository
  ) {}

  async findById(id: DeviceId, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const cacheKey = `device:${id.getValue()}:${tenantContext?.getTenantId()?.getValue() || 'global'}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return DeviceMapper.toDomain(JSON.parse(cached));
    }

    // Fallback to database
    const device = await this.fallbackRepository.findById(id, tenantContext);
    
    if (device) {
      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(DeviceMapper.toPersistence(device)));
    }

    return device;
  }

  async save(device: DeviceEntity, tenantContext?: TenantContext): Promise<void> {
    // Save to database
    await this.fallbackRepository.save(device, tenantContext);
    
    // Update cache
    const cacheKey = `device:${device.getId().getValue()}:${tenantContext?.getTenantId()?.getValue() || 'global'}`;
    await this.redis.setex(cacheKey, 300, JSON.stringify(DeviceMapper.toPersistence(device)));
  }

  async findAll(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    // Cache list keys by tenant
    const listKey = `devices:${tenantContext?.getTenantId()?.getValue() || 'global'}`;
    const cached = await this.redis.get(listKey);
    
    if (cached) {
      const deviceIds = JSON.parse(cached);
      const devices = await Promise.all(
        deviceIds.map((id: string) => this.findById(DeviceId.fromString(id), tenantContext))
      );
      return devices.filter(Boolean) as DeviceEntity[];
    }

    const devices = await this.fallbackRepository.findAll(tenantContext);
    
    // Cache device IDs for list
    const deviceIds = devices.map(d => d.getId().getValue());
    await this.redis.setex(listKey, 60, JSON.stringify(deviceIds));

    return devices;
  }

  // Fix: Proper search method signature
  async search(
    criteria: any, 
    options?: DeviceSearchOptions,
    tenantContext?: TenantContext
  ): Promise<DeviceSearchResult> {
    // Cache search results by criteria hash
    const tenantId = tenantContext?.getTenantId()?.getValue() || null;
    const searchKey = `search:devices:${this.hashCriteria(criteria, options, tenantId)}`;
    const cached = await this.redis.get(searchKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to primary repository
    const result = await this.fallbackRepository.search(criteria, options, tenantContext);
    
    // Cache search result for 30 seconds
    await this.redis.setex(searchKey, 30, JSON.stringify(result));

    return result;
  }

  async findByDeviceId(deviceId: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    return this.fallbackRepository.findByDeviceId(deviceId, tenantContext);
  }

  async findByName(name: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    return this.fallbackRepository.findByName(name, tenantContext);
  }

  async saveMany(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void> {
    return this.fallbackRepository.saveMany(devices, tenantContext);
  }

  private hashCriteria(criteria: any, options?: DeviceSearchOptions, tenantId?: string | null): string {
    const hashData = {
      criteria,
      options,
      tenantId
    };
    return require('crypto').createHash('md5').update(JSON.stringify(hashData)).digest('hex');
  }

  async saveAll(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void> {
    await this.fallbackRepository.saveAll(devices, tenantContext);
    
    // Invalidate list cache
    const listKey = `devices:${tenantContext?.getTenantId()?.getValue() || 'global'}`;
    await this.redis.del(listKey);
  }

  async softDelete(deviceId: DeviceId, tenantContext?: TenantContext): Promise<void> {
    await this.fallbackRepository.softDelete(deviceId, tenantContext);
    
    // Invalidate cache
    const cacheKey = `device:${deviceId.getValue()}:${tenantContext?.getTenantId()?.getValue() || 'global'}`;
    await this.redis.del(cacheKey);
    await this.redis.del(`devices:${tenantContext?.getTenantId() || 'global'}`);
  }

  async count(tenantContext?: TenantContext): Promise<number> {
    return this.fallbackRepository.count(tenantContext);
  }

  async countOnlineDevices(tenantContext?: TenantContext): Promise<number> {
    return this.fallbackRepository.countOnlineDevices(tenantContext);
  }

  // Delegate other methods to fallback repository
  async findByIpAddress(ipAddress: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    return this.fallbackRepository.findByIpAddress(ipAddress, tenantContext);
  }

  async findAllWithPagination(
    options?: DeviceSearchOptions, 
    tenantContext?: TenantContext
  ): Promise<DeviceEntity[]> {
    return this.fallbackRepository.findAllWithPagination(options, tenantContext);
  }

  async findOnlineDevices(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    return this.fallbackRepository.findOnlineDevices(tenantContext);
  }

  // Cache invalidation
  async invalidateCache(deviceId: DeviceId, tenantContext?: TenantContext): Promise<void> {
    const cacheKey = `device:${deviceId.getValue()}:${tenantContext?.getTenantId()?.getValue() || 'global'}`;
    await this.redis.del(cacheKey);
  }

  async invalidateTenantCache(tenantId: string): Promise<void> {
    const listKey = `devices:${tenantId}`;
    await this.redis.del(listKey);
  }
}