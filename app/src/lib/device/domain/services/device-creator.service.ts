import { Device } from '../entities/device.entity';
import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { IpAddress } from '../value-objects/ip-address.vo';
import { SshCredentials } from '../value-objects/ssh-credentials.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { DeviceAlreadyExistsException } from '../exceptions/device-already-exists.exception';
import { InvalidDeviceDataException } from '../exceptions/invalid-device-data.exception';

export class DeviceCreator {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async create(
    id: DeviceId,
    name: DeviceName,
    ipAddress: IpAddress,
    sshCredentials: SshCredentials
  ): Promise<Device> {
    // Check if device with the same name or IP already exists
    const existingDeviceByName = await this.deviceRepository.findByName(name.value);
    if (existingDeviceByName) {
      throw new DeviceAlreadyExistsException(`Device with name ${name.value} already exists`);
    }

    const existingDeviceByIp = await this.deviceRepository.findByIpAddress(ipAddress.value);
    if (existingDeviceByIp) {
      throw new DeviceAlreadyExistsException(`Device with IP address ${ipAddress.value} already exists`);
    }

    // Create the device
    const device = Device.create(id, name, ipAddress, sshCredentials);

    // Save the device to the repository
    await this.deviceRepository.save(device);

    return device;
  }
}