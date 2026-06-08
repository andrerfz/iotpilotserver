import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {DeviceEntity, SSHCredentials} from '@iotpilot/core/device/domain/entities/device.entity';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

describe('Device Entity', () => {
  let deviceId: DeviceId;
  let deviceName: DeviceName;
  let ipAddress: IpAddress;
  let deviceStatus: DeviceStatus;
  let sshCredentials: SSHCredentials;
  let tenantId: CustomerId;
  let device: DeviceEntity;

  beforeEach(() => {
    vi.useFakeTimers();
    deviceId = DeviceId.create('device-123');
    deviceName = DeviceName.create('Test Device');
    ipAddress = IpAddress.create('192.168.1.1');
    deviceStatus = DeviceStatus.onlineAndActive();
    sshCredentials = {
      username: 'user',
      privateKey: 'test-key',
      port: 22
    };
    tenantId = CustomerId.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

    device = new DeviceEntity(
      deviceId,
      deviceName,
      tenantId,
      deviceStatus,
      ipAddress,
      undefined,
      'test-hostname',
      sshCredentials
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create a new device with the provided values', () => {
      expect(device.getId().getValue()).toBe('device-123');
      expect(device.name.getValue()).toBe('Test Device');
      expect(device.ipAddress?.value).toBe('192.168.1.1');
      expect(device.status.getValue()).toBe('active');
      expect(device.sshCredentials).toBe(sshCredentials);
      expect(device.createdAt).toBeInstanceOf(Date);
      expect(device.updatedAt).toBeInstanceOf(Date);
    });

    it('should set the initial status to active', () => {
      expect(device.status.getValue()).toBe('active');
    });
  });

  describe('updateName', () => {
    it('should update the device name and updatedAt timestamp', () => {
      const newName = DeviceName.create('New Device Name');
      const originalUpdatedAt = device.updatedAt;

      vi.advanceTimersByTime(1000);

      device.updateName(newName);

      expect(device.name.getValue()).toBe('New Device Name');
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('updateNetwork', () => {
    it('should update the IP address and updatedAt timestamp', () => {
      const originalUpdatedAt = device.updatedAt;

      vi.advanceTimersByTime(1000);

      device.updateNetwork('192.168.1.2');

      expect(device.ipAddress?.value).toBe('192.168.1.2');
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('updateStatus', () => {
    it('should update the status and updatedAt timestamp', () => {
      const newStatus = DeviceStatus.offlineInactive();
      const originalUpdatedAt = device.updatedAt;

      vi.advanceTimersByTime(1000);

      device.updateStatus(newStatus);

      expect(device.status.businessStatus).toBe('inactive');
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('updateSshCredentials', () => {
    it('should update the SSH credentials and updatedAt timestamp', () => {
      const newSshCredentials: SSHCredentials = {
        username: 'newuser',
        privateKey: 'new-key',
        port: 2222
      };
      const originalUpdatedAt = device.updatedAt;

      vi.advanceTimersByTime(1000);

      device.updateSshCredentials(newSshCredentials);

      expect(device.sshCredentials).toBe(newSshCredentials);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
