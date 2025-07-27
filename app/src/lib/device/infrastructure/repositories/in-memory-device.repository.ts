import {DeviceRepository, DeviceSearchOptions, DeviceSearchResult} from '../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../domain/entities/device.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';

/**
 * In-memory implementation of DeviceRepository for testing purposes
 */
export class InMemoryDeviceRepository implements DeviceRepository {
  private devices: Map<string, DeviceEntity> = new Map();

  async findById(id: DeviceId, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const device = this.devices.get(id.getValue());
    
    if (!device) {
      return null;
    }
    
    // If tenant context is provided and not a super admin, validate that the device belongs to the tenant
    if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
      if (!device.belongsToTenant(tenantContext.getCustomerId()!)) {
        return null;
      }
    }
    
    return device;
  }

  async findByName(name: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    for (const device of this.devices.values()) {
      if (device.name.getValue() === name) {
        // If tenant context is provided and not a super admin, validate that the device belongs to the tenant
        if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
          if (!device.belongsToTenant(tenantContext.getCustomerId()!)) {
            continue;
          }
        }
        
        return device;
      }
    }
    
    return null;
  }

  async findByIpAddress(ipAddress: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    for (const device of this.devices.values()) {
      if (device.getIpAddress()?.getValue() === ipAddress) {
        // If tenant context is provided and not a super admin, validate that the device belongs to the tenant
        if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
          if (!device.belongsToTenant(tenantContext.getCustomerId()!)) {
            continue;
          }
        }
        
        return device;
      }
    }
    
    return null;
  }

  async findActive(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    const activeDevices: DeviceEntity[] = [];
    
    for (const device of this.devices.values()) {
      if (device.isActive()) {
        // If tenant context is provided and not a super admin, validate that the device belongs to the tenant
        if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
          if (!device.belongsToTenant(tenantContext.getCustomerId()!)) {
            continue;
          }
        }
        
        activeDevices.push(device);
      }
    }
    
    return activeDevices;
  }

  async findInactive(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    const inactiveDevices: DeviceEntity[] = [];

    for (const device of this.devices.values()) {
      if (!device.isActive()) {
        // If tenant context is provided and not a super admin, validate that the device belongs to the tenant
        if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
          if (!device.belongsToTenant(tenantContext.getCustomerId()!)) {
            continue;
          }
        }
        
        inactiveDevices.push(device);
      }
    }
    
    return inactiveDevices;
  }

  async findAll(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    if (!tenantContext || tenantContext.canBypassTenantRestrictions()) {
      return Array.from(this.devices.values());
    }
    
    // Filter devices by tenant
    const tenantDevices: DeviceEntity[] = [];
    
    for (const device of this.devices.values()) {
      if (device.belongsToTenant(tenantContext.getCustomerId()!)) {
        tenantDevices.push(device);
      }
    }
    
    return tenantDevices;
  }

  async findByDeviceId(deviceId: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return null;
    }
    
    if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
      if (!device.belongsToTenant(tenantContext.getCustomerId()!)) {
        return null;
      }
    }
    
    return device;
  }

  async findAllWithPagination(options?: DeviceSearchOptions, tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    const all = await this.findAll(tenantContext);
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;
    return all.slice(skip, skip + limit);
  }

  async findOnlineDevices(tenantContext?: TenantContext): Promise<DeviceEntity[]> {
    const devices = await this.findAll(tenantContext);
    return devices.filter(d => d.isOnline());
  }

  async save(device: DeviceEntity, tenantContext?: TenantContext): Promise<void> {
    // If tenant context is provided and not a super admin, validate that the device belongs to the tenant
    if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
      device.validateBelongsToTenant(tenantContext.getCustomerId()!);
    }
    
    this.devices.set(device.id.getValue(), device);
  }

  async saveAll(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void> {
    for (const device of devices) {
      await this.save(device, tenantContext);
    }
  }

  async saveMany(devices: DeviceEntity[], tenantContext?: TenantContext): Promise<void> {
    return this.saveAll(devices, tenantContext);
  }

  async softDelete(deviceId: DeviceId, tenantContext?: TenantContext): Promise<void> {
    await this.delete(deviceId, tenantContext);
  }

  async search(criteria: any, options?: DeviceSearchOptions, tenantContext?: TenantContext): Promise<DeviceSearchResult> {
    const devices = await this.findAll(tenantContext);
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;
    
    return {
      devices: [],
      total: devices.length,
      limit,
      offset: skip
    };
  }

  async count(tenantContext?: TenantContext): Promise<number> {
    const devices = await this.findAll(tenantContext);
    return devices.length;
  }

  async countOnlineDevices(tenantContext?: TenantContext): Promise<number> {
    const devices = await this.findOnlineDevices(tenantContext);
    return devices.length;
  }

  async delete(id: DeviceId, tenantContext?: TenantContext): Promise<void> {
    const device = await this.findById(id, tenantContext);
    
    if (!device) {
      return;
    }
    
    // If tenant context is provided and not a super admin, validate that the device belongs to the tenant
    if (tenantContext && !tenantContext.canBypassTenantRestrictions() && tenantContext.getCustomerId()) {
      device.validateBelongsToTenant(tenantContext.getCustomerId()!);
    }
    
    this.devices.delete(id.getValue());
  }

  // Helper methods for testing
  
  clear(): void {
    this.devices.clear();
  }
  
  getDeviceCount(): number {
    return this.devices.size;
  }
}