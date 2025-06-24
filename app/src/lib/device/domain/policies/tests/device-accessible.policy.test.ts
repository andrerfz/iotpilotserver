import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceAccessiblePolicy } from '../device-accessible.policy';
import { DeviceRepository } from '../../interfaces/device-repository.interface';
import { DeviceId } from '../../value-objects/device-id.vo';
import { Device } from '../../entities/device.entity';
import { DeviceAccessDeniedException } from '../../exceptions/device-access-denied.exception';
import { DeviceNotFoundException } from '../../exceptions/device-not-found.exception';

describe('DeviceAccessiblePolicy', () => {
  let deviceRepository: DeviceRepository;
  let userPermissionsService: { hasDeviceAccess: (userId: string, deviceId: string) => Promise<boolean> };
  let policy: DeviceAccessiblePolicy;
  let deviceId: DeviceId;
  let userId: string;
  let device: Device;

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
      hasDeviceAccess: vi.fn()
    };

    // Create the policy with the mocked dependencies
    policy = new DeviceAccessiblePolicy(deviceRepository, userPermissionsService);

    // Create a device ID and user ID for testing
    deviceId = DeviceId.create();
    userId = 'user-123';

    // Mock a device (we don't need the actual implementation for this test)
    device = {} as Device;
  });

  it('should not throw an error when user has access to the device', async () => {
    // Setup the mocks
    vi.mocked(deviceRepository.findById).mockResolvedValue(device);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(true);

    // The validate method should not throw an error
    await expect(policy.validate(deviceId, userId)).resolves.not.toThrow();

    // Verify that findById was called with the correct device ID
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);

    // Verify that hasDeviceAccess was called with the correct user ID and device ID
    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue);
  });

  it('should throw DeviceAccessDeniedException when user does not have access to the device', async () => {
    // Setup the mocks
    vi.mocked(deviceRepository.findById).mockResolvedValue(device);
    vi.mocked(userPermissionsService.hasDeviceAccess).mockResolvedValue(false);

    // The validate method should throw a DeviceAccessDeniedException
    await expect(policy.validate(deviceId, userId)).rejects.toThrow(DeviceAccessDeniedException);

    // Verify that findById was called with the correct device ID
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);

    // Verify that hasDeviceAccess was called with the correct user ID and device ID
    expect(userPermissionsService.hasDeviceAccess).toHaveBeenCalledWith(userId, deviceId.getValue);
  });

  it('should throw DeviceNotFoundException when device does not exist', async () => {
    // Setup the mocks
    vi.mocked(deviceRepository.findById).mockResolvedValue(null);

    // The validate method should throw a DeviceNotFoundException
    await expect(policy.validate(deviceId, userId)).rejects.toThrow(DeviceNotFoundException);

    // Verify that findById was called with the correct device ID
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);

    // Verify that hasDeviceAccess was not called
    expect(userPermissionsService.hasDeviceAccess).not.toHaveBeenCalled();
  });
});