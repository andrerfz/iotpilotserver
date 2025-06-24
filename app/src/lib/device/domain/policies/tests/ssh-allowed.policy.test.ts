import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSHAllowedPolicy } from '../ssh-allowed.policy';
import { DeviceRepository } from '../../interfaces/device-repository.interface';
import { DeviceId } from '../../value-objects/device-id.vo';
import { Device } from '../../entities/device.entity';
import { DeviceStatus } from '../../value-objects/device-status.vo';
import { SSHConnectionFailedException } from '../../exceptions/ssh-connection-failed.exception';
import { DeviceAccessDeniedException } from '../../exceptions/device-access-denied.exception';

describe('SSHAllowedPolicy', () => {
  let deviceRepository: DeviceRepository;
  let userPermissionsService: {
    hasDeviceAccess: (userId: string, deviceId: string) => Promise<boolean>;
    hasSSHPermission: (userId: string) => Promise<boolean>;
  };
  let policy: SSHAllowedPolicy;
  let deviceId: DeviceId;
  let userId: string;
  let activeDevice: Device;
  let inactiveDevice: Device;

  beforeEach(() => {
    // Mock the device repository
    deviceRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn()
    } as unknown as DeviceRepository;

    // Mock the user permissions service
    userPermissionsService = {
      hasDeviceAccess: vi.fn(),
      hasSSHPermission: vi.fn()
    };

    // Create the policy with the mocked dependencies
    policy = new SSHAllowedPolicy(deviceRepository, userPermissionsService);

    // Create a device ID and user ID for testing
    deviceId = DeviceId.create();
    userId = 'user-123';

    // Mock active and inactive devices
    activeDevice = {
      status: { getValue: 'active' } as DeviceStatus
    } as Device;

    inactiveDevice = {
      status: { getValue: 'inactive' } as DeviceStatus
    } as Device;
  });

  it('should not throw an error when user has access, SSH permission, and device is active', async () => {
    // Setup the mocks
    vi.mocked(deviceRepository.findById).mockResolvedValue(activeDevice);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);
    vi.mocked(userPermissionsService.hasSSHPermission).mockResolvedValue(true);

    // The validate method should not throw an error
    await expect(policy.validate(deviceId, userId)).resolves.not.toThrow();

    // Verify that the methods were called with the correct parameters
    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue);
    expect(userPermissionsService.hasSSHPermission).toHaveBeenCalledWith(userId);
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);
  });

  it('should throw DeviceAccessDeniedException when user does not have access to the device', async () => {
    // Setup the mocks
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(false);

    // The validate method should throw a DeviceAccessDeniedException
    await expect(policy.validate(deviceId, userId)).rejects.toThrow(DeviceAccessDeniedException);

    // Verify that hasDeviceAccess was called with the correct parameters
    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue);

    // Verify that hasSSHPermission and findById were not called
    expect(userPermissionsService.hasSSHPermission).not.toHaveBeenCalled();
    expect(deviceRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw SSHConnectionFailedException when user does not have SSH permission', async () => {
    // Setup the mocks
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);
    vi.mocked(userPermissionsService.hasSSHPermission).mockResolvedValue(false);

    // The validate method should throw a SSHConnectionFailedException
    await expect(policy.validate(deviceId, userId)).rejects.toThrow(SSHConnectionFailedException);

    // Verify that the methods were called with the correct parameters
    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue);
    expect(userPermissionsService.hasSSHPermission).toHaveBeenCalledWith(userId);

    // Verify that findById was not called
    expect(deviceRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw SSHConnectionFailedException when device is not active', async () => {
    // Setup the mocks
    vi.mocked(deviceRepository.findById).mockResolvedValue(inactiveDevice);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);
    vi.mocked(userPermissionsService.hasSSHPermission).mockResolvedValue(true);

    // The validate method should throw a SSHConnectionFailedException
    await expect(policy.validate(deviceId, userId)).rejects.toThrow(SSHConnectionFailedException);

    // Verify that the methods were called with the correct parameters
    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue);
    expect(userPermissionsService.hasSSHPermission).toHaveBeenCalledWith(userId);
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);
  });
});