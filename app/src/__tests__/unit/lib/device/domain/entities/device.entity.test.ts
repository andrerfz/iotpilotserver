import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Device } from '@/lib/device/domain/entities/device.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { DeviceName } from '@/lib/device/domain/value-objects/device-name.vo';
import { IpAddress } from '@/lib/device/domain/value-objects/ip-address.vo';
import { DeviceStatus } from '@/lib/device/domain/value-objects/device-status.vo';
import { SshCredentials } from '@/lib/device/domain/value-objects/ssh-credentials.vo';

// Mock the value objects
vi.mock('@/lib/device/domain/value-objects/device-id.vo');
vi.mock('@/lib/device/domain/value-objects/device-name.vo');
vi.mock('@/lib/device/domain/value-objects/ip-address.vo');
vi.mock('@/lib/device/domain/value-objects/device-status.vo');
vi.mock('@/lib/device/domain/value-objects/ssh-credentials.vo');

describe('Device Entity', () => {
  let deviceId: DeviceId;
  let deviceName: DeviceName;
  let ipAddress: IpAddress;
  let deviceStatus: DeviceStatus;
  let sshCredentials: SshCredentials;
  let device: Device;

  beforeEach(() => {
    // Setup fake timers
    vi.useFakeTimers();
    // Setup mocks
    deviceId = { getValue: 'device-123' } as unknown as DeviceId;
    deviceName = { getValue: 'Test Device' } as unknown as DeviceName;
    ipAddress = { getValue: '192.168.1.1' } as unknown as IpAddress;
    deviceStatus = { getValue: 'active' } as unknown as DeviceStatus;
    sshCredentials = {
      username: 'user',
      password: 'pass'
    } as unknown as SshCredentials;

    // Mock static methods
    (DeviceStatus.create as ReturnType<typeof vi.fn>).mockReturnValue(deviceStatus);

    // Create a device instance
    device = Device.create(deviceId, deviceName, ipAddress, sshCredentials);
  });

  describe('create', () => {
    it('should create a new device with the provided values', () => {
      expect(device.id).toBe(deviceId);
      expect(device.name).toBe(deviceName);
      expect(device.ipAddress).toBe(ipAddress);
      expect(device.status).toBe(deviceStatus);
      expect(device.sshCredentials).toBe(sshCredentials);
      expect(device.createdAt).toBeInstanceOf(Date);
      expect(device.updatedAt).toBeInstanceOf(Date);
    });

    it('should set the initial status to inactive', () => {
      expect(DeviceStatus.create).toHaveBeenCalledWith('inactive');
    });
  });

  describe('updateName', () => {
    it('should update the device name and updatedAt timestamp', () => {
      const newName = { getValue: 'New Device Name' } as unknown as DeviceName;
      const originalUpdatedAt = device.updatedAt;

      // Wait to ensure the timestamps are different
      vi.advanceTimersByTime(1000);

      device.updateName(newName);

      expect(device.name).toBe(newName);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('updateIpAddress', () => {
    it('should update the IP address and updatedAt timestamp', () => {
      const newIpAddress = { getValue: '192.168.1.2' } as unknown as IpAddress;
      const originalUpdatedAt = device.updatedAt;

      // Wait to ensure the timestamps are different
      vi.advanceTimersByTime(1000);

      device.updateIpAddress(newIpAddress);

      expect(device.ipAddress).toBe(newIpAddress);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('updateStatus', () => {
    it('should update the status and updatedAt timestamp', () => {
      const newStatus = { getValue: 'inactive' } as unknown as DeviceStatus;
      const originalUpdatedAt = device.updatedAt;

      // Wait to ensure the timestamps are different
      vi.advanceTimersByTime(1000);

      device.updateStatus(newStatus);

      expect(device.status).toBe(newStatus);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('updateSshCredentials', () => {
    it('should update the SSH credentials and updatedAt timestamp', () => {
      const newSshCredentials = {
        username: 'newuser',
        password: 'newpass'
      } as unknown as SshCredentials;
      const originalUpdatedAt = device.updatedAt;

      // Wait to ensure the timestamps are different
      vi.advanceTimersByTime(1000);

      device.updateSshCredentials(newSshCredentials);

      expect(device.sshCredentials).toBe(newSshCredentials);
      expect(device.updatedAt).not.toBe(originalUpdatedAt);
      expect(device.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });
});
