import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceName} from '../value-objects/device-name.vo';
import {IPAddress} from '../value-objects/ip-address.vo';

class Device {
  constructor(
    public readonly id: DeviceId,
    public readonly name: DeviceName,
    public readonly ipAddress: IPAddress,
  ) {}

  static create(id: string, name: string, ipAddress: string): Device {
    return new Device(
      DeviceId.create(id),
      DeviceName.create(name),
      IPAddress.create(ipAddress)
    );
  }
}

export {Device};