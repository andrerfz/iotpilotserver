import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSHAllowedPolicy } from '../ssh-allowed.policy';
import { DeviceRepository } from '../../interfaces/device.repository';
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
    deviceRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      softDelete: vi.fn()
    } as unknown as DeviceRepository;

    userPermissionsService = {
      hasDeviceAccess: vi.fn(),
      hasSSHPermission: vi.fn()
    };

    policy = new SSHAllowedPolicy(deviceRepository, userPermissionsService);

    deviceId = DeviceId.fromString('device-123');
    userId = 'user-123';

    activeDevice = {
      status: DeviceStatus.onlineAndActive()
    } as Device;

    inactiveDevice = {
      status: DeviceStatus.offlineInactive()
    } as Device;
  });

  it('should not throw an error when user has access, SSH permission, and device is active', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(activeDevice);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);
    vi.mocked(userPermissionsService.hasSSHPermission).mockResolvedValue(true);

    await expect(policy.validate(deviceId, userId)).resolves.not.toThrow();

    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue());
    expect(userPermissionsService.hasSSHPermission).toHaveBeenCalledWith(userId);
  });

  it('should throw DeviceAccessDeniedException when user does not have access to the device', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(activeDevice);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(false);

    await expect(policy.validate(deviceId, userId)).rejects.toThrow(DeviceAccessDeniedException);
  });

  it('should throw SSHConnectionFailedException when user does not have SSH permission', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(activeDevice);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);
    vi.mocked(userPermissionsService.hasSSHPermission).mockResolvedValue(false);

    await expect(policy.validate(deviceId, userId)).rejects.toThrow(SSHConnectionFailedException);
  });

  it('should throw SSHConnectionFailedException when device is not active', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(inactiveDevice);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);
    vi.mocked(userPermissionsService.hasSSHPermission).mockResolvedValue(true);

    await expect(policy.validate(deviceId, userId)).rejects.toThrow(SSHConnectionFailedException);
  });
});
