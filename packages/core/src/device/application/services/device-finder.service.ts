import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';

export class DeviceFinderService {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async findById(deviceId: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    return this.deviceRepository.findById(deviceIdVO, tenantContext);
  }

  async findByIpAddress(ipAddress: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    return this.deviceRepository.findByIpAddress(ipAddress, tenantContext);
  }

  async findOnlineDevice(deviceId: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (device && device.isOnline()) {
      return device;
    }

    return null;
  }

  async findActiveDevice(deviceId: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (device && device.isActive()) {
      return device;
    }

    return null;
  }

  async searchByName(name: string, tenantContext?: TenantContext): Promise<DeviceEntity | null> {
    const devices = await this.deviceRepository.findAll(tenantContext);
    return devices.find((device: DeviceEntity) => device.name.value.toLowerCase().includes(name.toLowerCase())) || null;
  }

  async getDeviceIp(deviceId: string, tenantContext?: TenantContext): Promise<string | null> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      return null;
    }

    return device.getIpAddress()?.value || device.getTailscaleIp()?.value || null;
  }
}
