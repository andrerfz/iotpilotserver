import {DeviceEntity} from '../entities/device.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';

export interface DeviceSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string; // Backward compatibility
  status?: string;
  ipAddress?: string;
  filters?: {
    status?: string;
    isOnline?: boolean;
    search?: string;
    ipAddress?: string;
  };
}

export interface DeviceSearchResult {
  devices: DeviceEntity[];
  total: number;
  limit: number;
  offset: number;
}

export interface DeviceRepository {
  // Single device operations
  findById(id: DeviceId, tenantContext?: TenantContext): Promise<DeviceEntity | null>;
  findByDeviceId(deviceId: string, tenantContext?: TenantContext): Promise<DeviceEntity | null>;
  findByName(name: string, tenantContext?: TenantContext): Promise<DeviceEntity | null>;
  findByIpAddress(ipAddress: string, tenantContext?: TenantContext): Promise<DeviceEntity | null>;
  
  // Bulk operations
  findAll(tenantContext?: TenantContext): Promise<DeviceEntity[]>;
  findAllWithPagination(
    options?: DeviceSearchOptions, 
    tenantContext?: TenantContext
  ): Promise<DeviceEntity[]>;
  findOnlineDevices(tenantContext?: TenantContext): Promise<DeviceEntity[]>;
  
  // Create/Update
  save(device: DeviceEntity, tenantContext?: TenantContext): Promise<void>;
  saveAll(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void>;
  saveMany(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void>;
  
  // Delete (soft delete)
  softDelete(deviceId: DeviceId, tenantContext?: TenantContext): Promise<void>;
  
  // Search - THIS WAS MISSING
  search(
    criteria: any, 
    options?: DeviceSearchOptions,
    tenantContext?: TenantContext
  ): Promise<DeviceSearchResult>;
  
  // Count operations
  count(tenantContext?: TenantContext): Promise<number>;
  countOnlineDevices(tenantContext?: TenantContext): Promise<number>;
}
