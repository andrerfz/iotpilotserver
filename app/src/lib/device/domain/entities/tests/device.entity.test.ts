import { describe, it, expect, beforeEach } from 'vitest';
import { Device } from '../device.entity';
import { DeviceId } from '../../value-objects/device-id.vo';
import { DeviceName } from '../../value-objects/device-name.vo';
import { IpAddress } from '../../value-objects/ip-address.vo';
import { DeviceStatus } from '../../value-objects/device-status.vo';
import { SshCredentials } from '../../value-objects/ssh-credentials.vo';

describe('Device Entity', () => {
  let deviceId: DeviceId;
  let deviceName: DeviceName;
  let ipAddress: IpAddress;
  let sshCredentials: SshCredentials;
  let device: Device;

  beforeEach(() => {
    deviceId = DeviceId.create('device-123');
    deviceName = DeviceName.create('Test Device');
    ipAddress = IpAddress.create('192.168.1.1');
    sshCredentials = SshCredentials.create('user', 'password');
    device = Device.create(deviceId, deviceName, ipAddress, sshCredentials);
  });

  it('should create a device with correct values', () => {
    expect(device.id).toBe(deviceId);
    expect(device.name).toBe(deviceName);
    expect(device.ipAddress).toBe(ipAddress);
    expect(device.status.getValue()).toBe('inactive'); // Default status is inactive
    expect(device.sshCredentials).toBe(sshCredentials);
    expect(device.createdAt).toBeInstanceOf(Date);
    expect(device.updatedAt).toBeInstanceOf(Date);
  });

  it('should update name', () => {
    const newName = DeviceName.create('Updated Device');
    const originalUpdatedAt = device.updatedAt;
    
    // Wait a bit to ensure updatedAt will be different
    setTimeout(() => {
      device.updateName(newName);
      expect(device.name).toBe(newName);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
    }, 10);
  });

  it('should update IP address', () => {
    const newIpAddress = IpAddress.create('192.168.1.2');
    const originalUpdatedAt = device.updatedAt;
    
    // Wait a bit to ensure updatedAt will be different
    setTimeout(() => {
      device.updateIpAddress(newIpAddress);
      expect(device.ipAddress).toBe(newIpAddress);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
    }, 10);
  });

  it('should update status', () => {
    const newStatus = DeviceStatus.create('active');
    const originalUpdatedAt = device.updatedAt;
    
    // Wait a bit to ensure updatedAt will be different
    setTimeout(() => {
      device.updateStatus(newStatus);
      expect(device.status).toBe(newStatus);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
    }, 10);
  });

  it('should update SSH credentials', () => {
    const newSshCredentials = SshCredentials.create('newuser', 'newpassword');
    const originalUpdatedAt = device.updatedAt;
    
    // Wait a bit to ensure updatedAt will be different
    setTimeout(() => {
      device.updateSshCredentials(newSshCredentials);
      expect(device.sshCredentials).toBe(newSshCredentials);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
    }, 10);
  });
});