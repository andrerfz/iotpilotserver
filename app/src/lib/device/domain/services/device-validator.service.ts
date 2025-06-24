import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceName } from '../value-objects/device-name.vo';
import { IpAddress } from '../value-objects/ip-address.vo';
import { SshCredentials } from '../value-objects/ssh-credentials.vo';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { SSHClient } from '../interfaces/ssh-client.interface';
import { Port } from '../value-objects/port.vo';
import { InvalidDeviceDataException } from '../exceptions/invalid-device-data.exception';
import { DeviceAlreadyExistsException } from '../exceptions/device-already-exists.exception';
import { SSHConnectionFailedException } from '../exceptions/ssh-connection-failed.exception';

export class DeviceValidator {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly sshClient: SSHClient
  ) {}

  async validateNewDevice(
    name: DeviceName,
    ipAddress: IpAddress,
    sshCredentials: SshCredentials,
    sshPort: Port
  ): Promise<void> {
    // Check if device with the same name already exists
    const existingDeviceByName = await this.deviceRepository.findByName(name.value);
    if (existingDeviceByName) {
      throw new DeviceAlreadyExistsException(`Device with name ${name.value} already exists`);
    }

    // Check if device with the same IP address already exists
    const existingDeviceByIp = await this.deviceRepository.findByIpAddress(ipAddress.value);
    if (existingDeviceByIp) {
      throw new DeviceAlreadyExistsException(`Device with IP address ${ipAddress.value} already exists`);
    }

    // Validate SSH connection
    await this.validateSshConnection(ipAddress, sshPort, sshCredentials);
  }

  async validateExistingDevice(
    id: DeviceId,
    name?: DeviceName,
    ipAddress?: IpAddress,
    sshCredentials?: SshCredentials,
    sshPort?: Port
  ): Promise<void> {
    // Check if device exists
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new InvalidDeviceDataException(`Device with ID ${id.value} not found`);
    }

    // Check if the new name is already used by another device
    if (name && !name.equals(device.name)) {
      const existingDeviceByName = await this.deviceRepository.findByName(name.value);
      if (existingDeviceByName && !existingDeviceByName.id.equals(id)) {
        throw new DeviceAlreadyExistsException(`Device with name ${name.value} already exists`);
      }
    }

    // Check if the new IP address is already used by another device
    if (ipAddress && !ipAddress.equals(device.ipAddress)) {
      const existingDeviceByIp = await this.deviceRepository.findByIpAddress(ipAddress.value);
      if (existingDeviceByIp && !existingDeviceByIp.id.equals(id)) {
        throw new DeviceAlreadyExistsException(`Device with IP address ${ipAddress.value} already exists`);
      }
    }

    // Validate SSH connection if IP address or credentials changed
    if ((ipAddress && !ipAddress.equals(device.ipAddress)) || 
        (sshCredentials && !sshCredentials.equals(device.sshCredentials))) {
      await this.validateSshConnection(
        ipAddress || device.ipAddress,
        sshPort || Port.create(22), // Default SSH port if not provided
        sshCredentials || device.sshCredentials
      );
    }
  }

  private async validateSshConnection(
    ipAddress: IpAddress,
    port: Port,
    credentials: SshCredentials
  ): Promise<void> {
    try {
      // Create a temporary device ID for testing the connection
      const tempDeviceId = DeviceId.fromString('temp-' + Date.now());

      // Try to establish a connection
      const session = await this.sshClient.connect(
        tempDeviceId,
        ipAddress,
        port,
        credentials
      );

      // Disconnect immediately after successful connection
      await this.sshClient.disconnect(session.id);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      throw new SSHConnectionFailedException(
        ipAddress.value,
        `Failed to validate SSH connection: ${errorMessage}`
      );
    }
  }
}
