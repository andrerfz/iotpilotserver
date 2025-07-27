import {DeviceEntity} from '../entities/device.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IpAddress} from '../value-objects/ip-address.vo';
import {DeviceRepository} from '../interfaces/device.repository';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {DeviceStatus} from '../value-objects/device-status.vo';

export class DeviceCreatorService {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async createDevice(
    deviceId: DeviceId,
    name: DeviceName,
    ipAddress: string,
    sshCredentials: any,
    tenantContext: TenantContext
  ): Promise<DeviceEntity> {
    // Validate IP address
    let ipAddressVO: IpAddress;
    try {
      ipAddressVO = IpAddress.fromString(ipAddress);
    } catch (error) {
      throw new Error(`Invalid IP address: ${ipAddress}`);
    }

    // Create device using static factory method
    const device = DeviceEntity.create(deviceId, name, tenantContext.getCustomerId()!);
    
    // Set network properties
    device.updateNetwork(ipAddress, undefined, undefined);
    
    // Set SSH credentials
    device.sshCredentials = sshCredentials;

    // Set default status
    device.status = DeviceStatus.offlineInactive();
    
    // Validate tenant ownership
    device.validateBelongsToTenant(tenantContext.getCustomerId()!);

    // Save device
    await this.deviceRepository.save(device, tenantContext);
    
    return device;
  }

  async createDeviceFromData(
    data: {
      id: string;
      name: string;
      ipAddress: string;
      sshCredentials?: any;
    },
    tenantContext: TenantContext
  ): Promise<DeviceEntity> {
    const deviceId = DeviceId.fromString(data.id);
    const deviceName = DeviceName.fromString(data.name);
    
    let ipAddressVO: IpAddress;
    try {
      ipAddressVO = IpAddress.fromString(data.ipAddress);
    } catch (error) {
      throw new Error(`Invalid IP address: ${data.ipAddress}`);
    }

    const device = DeviceEntity.create(deviceId, deviceName, tenantContext.getCustomerId()!);
    
    // Set network properties
    device.updateNetwork(data.ipAddress, undefined, undefined);
    
    // Set SSH credentials if provided
    if (data.sshCredentials) {
      device.sshCredentials = data.sshCredentials;
    }

    // Validate tenant ownership
    device.validateBelongsToTenant(tenantContext.getCustomerId()!);

    // Save device
    await this.deviceRepository.save(device, tenantContext);
    
    return device;
  }
}