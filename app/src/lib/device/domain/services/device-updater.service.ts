import { Device } from '../entities/device.entity';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { IpAddress } from '../value-objects/ip-address.vo';
import { DeviceStatus } from '../value-objects/device-status.vo';
import { SshCredentials } from '../value-objects/ssh-credentials.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { DeviceNotFoundException } from '../exceptions/device-not-found.exception';
import { DeviceAlreadyExistsException } from '../exceptions/device-already-exists.exception';

export class DeviceUpdater {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async update(
    id: DeviceId,
    name?: DeviceName,
    ipAddress?: IpAddress,
    status?: DeviceStatus,
    sshCredentials?: SshCredentials
  ): Promise<Device> {
    // Find the device by ID
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${id.value} not found`);
    }

    // Check if the new name is already used by another device
    if (name && !name.equals(device.name)) {
      const existingDeviceByName = await this.deviceRepository.findByName(name.value);
      if (existingDeviceByName && !existingDeviceByName.id.equals(id)) {
        throw new DeviceAlreadyExistsException(`Device with name ${name.value} already exists`);
      }
      device.updateName(name);
    }

    // Check if the new IP address is already used by another device
    if (ipAddress && !ipAddress.equals(device.ipAddress)) {
      const existingDeviceByIp = await this.deviceRepository.findByIpAddress(ipAddress.value);
      if (existingDeviceByIp && !existingDeviceByIp.id.equals(id)) {
        throw new DeviceAlreadyExistsException(`Device with IP address ${ipAddress.value} already exists`);
      }
      device.updateIpAddress(ipAddress);
    }

    // Update status if provided
    if (status) {
      device.updateStatus(status);
    }

    // Update SSH credentials if provided
    if (sshCredentials) {
      device.updateSshCredentials(sshCredentials);
    }

    // Save the updated device
    await this.deviceRepository.save(device);

    return device;
  }
}