import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceExistsPolicy } from '../device-exists.policy';
import { DeviceRepository } from '../../interfaces/device-repository.interface';
import { DeviceId } from '../../value-objects/device-id.vo';
import { Device } from '../../entities/device.entity';
import { DeviceNotFoundException } from '../../exceptions/device-not-found.exception';

describe('DeviceExistsPolicy', () => {
  let deviceRepository: DeviceRepository;
  let policy: DeviceExistsPolicy;
  let deviceId: DeviceId;
  let device: Device;

  beforeEach(() => {
    // Mock the device repository
    deviceRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn()
    } as unknown as DeviceRepository;

    // Create the policy with the mocked repository
    policy = new DeviceExistsPolicy(deviceRepository);

    // Create a device ID for testing
    deviceId = DeviceId.create();

    // Mock a device (we don't need the actual implementation for this test)
    device = {} as Device;
  });

  it('should not throw an error when device exists', async () => {
    // Setup the mock to return a device
    vi.mocked(deviceRepository.findById).mockResolvedValue(device);

    // The validate method should not throw an error
    await expect(policy.validate(deviceId)).resolves.not.toThrow();

    // Verify that findById was called with the correct device ID
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);
  });

  it('should throw DeviceNotFoundException when device does not exist', async () => {
    // Setup the mock to return null (device not found)
    vi.mocked(deviceRepository.findById).mockResolvedValue(null);

    // The validate method should throw a DeviceNotFoundException
    await expect(policy.validate(deviceId)).rejects.toThrow(DeviceNotFoundException);

    // Verify that findById was called with the correct device ID
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);
  });
});