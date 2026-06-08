import {beforeEach, describe, expect, it} from 'vitest';
import {DeviceEntity} from '../device.entity';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {IpAddress} from '../../value-objects/ip-address.vo';
import {DeviceStatus} from '../../value-objects/device-status.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

describe('Device Entity', () => {
  let deviceId: DeviceId;
  let deviceName: DeviceName;
  let ipAddress: IpAddress;
  let tenantId: CustomerId;
  let device: DeviceEntity;

  beforeEach(() => {
    deviceId = DeviceId.fromString('device-123');
    deviceName = DeviceName.create('Test Device');
    ipAddress = IpAddress.create('192.168.1.1');
    tenantId = CustomerId.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    device = DeviceEntity.create(
      deviceId,
      deviceName,
      tenantId,
      DeviceStatus.offlineInactive(),
      ipAddress
    );
  });

  it('should create a device with correct values', () => {
    expect(device.getId().getValue()).toBe('device-123');
    expect(device.name.getValue()).toBe('Test Device');
    expect(device.ipAddress?.value).toBe('192.168.1.1');
    expect(device.status.getValue()).toBe('inactive');
    expect(device.createdAt).toBeInstanceOf(Date);
    expect(device.updatedAt).toBeInstanceOf(Date);
  });

  it('should update name', () => {
    const newName = DeviceName.create('Updated Device');
    device.updateName(newName);
    expect(device.name.getValue()).toBe('Updated Device');
  });

  it('should update network', () => {
    device.updateNetwork('192.168.1.2');
    expect(device.ipAddress?.value).toBe('192.168.1.2');
  });

  it('should update status', () => {
    const newStatus = DeviceStatus.onlineAndActive();
    device.updateStatus(newStatus);
    expect(device.status.businessStatus).toBe('active');
    expect(device.status.connectivity).toBe('online');
  });

  it('should update SSH credentials', () => {
    const newSshCredentials = {
      username: 'newuser',
      privateKey: 'ssh-rsa AAAA...',
      port: 22
    };
    device.updateSshCredentials(newSshCredentials);
    expect(device.sshCredentials?.username).toBe('newuser');
  });

  it('should default to offlineInactive status', () => {
    const defaultDevice = DeviceEntity.create(deviceId, deviceName, tenantId);
    expect(defaultDevice.status.businessStatus).toBe('inactive');
    expect(defaultDevice.status.connectivity).toBe('offline');
  });

  it('should activate and deactivate', () => {
    device.activate();
    expect(device.status.businessStatus).toBe('active');
    device.deactivate();
    expect(device.status.businessStatus).toBe('inactive');
  });
});
