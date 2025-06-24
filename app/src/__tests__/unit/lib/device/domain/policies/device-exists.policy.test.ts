import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceExistsPolicy } from '@/lib/device/domain/policies/device-exists.policy';
import { DeviceRepository } from '@/lib/device/domain/interfaces/device-repository.interface';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { Device } from '@/lib/device/domain/entities/device.entity';
import { DeviceNotFoundException } from '@/lib/device/domain/exceptions/device-not-found.exception';

describe('DeviceExistsPolicy', () => {
  let deviceRepository: {
    findById: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findByName: ReturnType<typeof vi.fn>;
    findByIpAddress: ReturnType<typeof vi.fn>;
    findActive: ReturnType<typeof vi.fn>;
    findInactive: ReturnType<typeof vi.fn>;
  };
  let deviceExistsPolicy: DeviceExistsPolicy;
  let deviceId: DeviceId;

  beforeEach(() => {
    // Mock the repository
    deviceRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findByName: vi.fn(),
      findByIpAddress: vi.fn(),
      findActive: vi.fn(),
      findInactive: vi.fn()
    };

    // Create the policy
    deviceExistsPolicy = new DeviceExistsPolicy(deviceRepository);

    // Mock DeviceId
    deviceId = { getValue: 'device-123' } as unknown as DeviceId;
  });

  describe('validate', () => {
    it('should not throw an error if the device exists', async () => {
      // Mock the repository to return a device
      const mockDevice = {} as Device;
      deviceRepository.findById.mockResolvedValue(mockDevice);

      // Validate should not throw
      await expect(deviceExistsPolicy.validate(deviceId)).resolves.not.toThrow();

      // Verify the repository was called with the correct ID
      expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);
    });

    it('should throw DeviceNotFoundException if the device does not exist', async () => {
      // Mock the repository to return null (device not found)
      deviceRepository.findById.mockResolvedValue(null);

      // Validate should throw DeviceNotFoundException
      await expect(deviceExistsPolicy.validate(deviceId)).rejects.toThrow(DeviceNotFoundException);

      // Verify the repository was called with the correct ID
      expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId);
    });

    it('should include the device ID in the error message', async () => {
      // Mock the repository to return null (device not found)
      deviceRepository.findById.mockResolvedValue(null);

      // Validate should throw with the correct error message
      await expect(deviceExistsPolicy.validate(deviceId)).rejects.toThrow(`Device with ID ${deviceId.getValue} not found`);
    });
  });
});
