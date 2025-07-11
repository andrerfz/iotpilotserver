import {Device} from '../device.entity';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {IPAddress} from '../../value-objects/ip-address.vo';

describe('Device Entity', () => {
  it('should create a device entity with valid data', () => {
    const device = Device.create('device-id-1', 'Test Device', '192.168.1.1');

    expect(device.id instanceof DeviceId).toBeTruthy();
    expect(device.name instanceof DeviceName).toBeTruthy();
    expect(device.ipAddress instanceof IPAddress).toBeTruthy();
  });
});