import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceRepository} from '../interfaces/device.repository';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {DeviceEntity} from '../entities/device.entity';
import {IpAddress} from '../../../shared/domain/value-objects/ip-address.vo';
import {DeviceName} from '../value-objects/device-name.vo';

export class DeviceUpdaterService {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async updateDeviceName(deviceId: string, newName: string, tenantContext?: TenantContext): Promise<DeviceEntity> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const name = DeviceName.fromString(newName);
    device.updateName(name);
    await this.deviceRepository.save(device, tenantContext);
    
    return device;
  }

  async updateDeviceNetwork(
    deviceId: string, 
    ipAddress?: string, 
    tailscaleIp?: string, 
    hostname?: string,
    tenantContext?: TenantContext
  ): Promise<DeviceEntity> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    device.updateNetwork(ipAddress, tailscaleIp, hostname);
    await this.deviceRepository.save(device, tenantContext);
    
    return device;
  }

  async updateDeviceSshCredentials(
    deviceId: DeviceId, 
    credentials: any, 
    tenantContext: TenantContext
  ): Promise<DeviceEntity> {
    const device = await this.deviceRepository.findById(deviceId, tenantContext);
    if (!device) {
      throw new Error(`Device ${deviceId.getValue()} not found`);
    }

    // Update SSH credentials directly on entity
    device.sshCredentials = credentials;
    device.updatedAt = new Date();

    // Save device
    await this.deviceRepository.save(device, tenantContext);
    
    return device;
  }

  // Legacy method for backward compatibility
  async updateDevice(
    deviceId: DeviceId,
    updates: Partial<{
      name: string;
      ipAddress: string;
      tailscaleIp: string;
      hostname: string;
      sshCredentials: any;
    }>,
    tenantContext: TenantContext
  ): Promise<DeviceEntity> {
    const device = await this.deviceRepository.findById(deviceId, tenantContext);
    if (!device) {
      throw new Error(`Device ${deviceId.getValue()} not found`);
    }

    if (updates.name) {
      const nameVO = DeviceName.fromString(updates.name);
      device.updateName(nameVO);
    }

    if (updates.ipAddress) {
      try {
        const ipVO = IpAddress.fromString(updates.ipAddress);
        device.updateNetwork(updates.ipAddress, undefined, undefined);
      } catch (error) {
        throw new Error(`Invalid IP address: ${updates.ipAddress}`);
      }
    }

    if (updates.tailscaleIp) {
      try {
        const tailscaleVO = IpAddress.fromString(updates.tailscaleIp);
        device.updateNetwork(undefined, updates.tailscaleIp, undefined);
      } catch (error) {
        throw new Error(`Invalid tailscale IP: ${updates.tailscaleIp}`);
      }
    }

    if (updates.hostname) {
      device.updateNetwork(undefined, undefined, updates.hostname);
    }

    if (updates.sshCredentials) {
      device.sshCredentials = updates.sshCredentials;
    }

    // Update timestamps
    device.updatedAt = new Date();

    // Save device
    await this.deviceRepository.save(device, tenantContext);
    
    return device;
  }
}