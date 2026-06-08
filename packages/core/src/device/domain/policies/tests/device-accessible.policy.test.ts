import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceAccessiblePolicy } from '../device-accessible.policy';
import { DeviceRepository } from '../../interfaces/device.repository';
import { DeviceId } from '../../value-objects/device-id.vo';
import { Device } from '../../entities/device.entity';
import { DeviceAccessDeniedException } from '../../exceptions/device-access-denied.exception';

describe('DeviceAccessiblePolicy', () => {
  let deviceRepository: DeviceRepository;
  let userPermissionsService: { hasDeviceAccess: (userId: string, deviceId: string) => Promise<boolean> };
  let policy: DeviceAccessiblePolicy;
  let deviceId: DeviceId;
  let userId: string;
  let device: Device;

  beforeEach(() => {
    deviceRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      softDelete: vi.fn()
    } as unknown as DeviceRepository;

    userPermissionsService = {
      hasDeviceAccess: vi.fn()
    };

    policy = new DeviceAccessiblePolicy(deviceRepository, userPermissionsService);

    deviceId = DeviceId.fromString('device-123');
    userId = 'user-123';
    device = {} as Device;
  });

  it('should not throw an error when user has access to the device', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(device);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);

    await expect(policy.validate(deviceId, userId)).resolves.not.toThrow();

    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue());
  });

  it('should throw DeviceAccessDeniedException when user does not have access to the device', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(device);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(false);

    await expect(policy.validate(deviceId, userId)).rejects.toThrow(DeviceAccessDeniedException);
  });

  it('should throw error when device does not exist', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(null);

    await expect(policy.validate(deviceId, userId)).rejects.toThrow();

    expect(userPermissionsService.hasDeviceAccess).not.toHaveBeenCalled();
  });
});
