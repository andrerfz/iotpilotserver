import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceExistsPolicy } from '@iotpilot/core/device/domain/policies/device-exists.policy';
import { DeviceRepository } from '@iotpilot/core/device/domain/interfaces/device.repository';
import { Device } from '@iotpilot/core/device/domain/entities/device.entity';

describe('DeviceExistsPolicy', () => {
  let deviceRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let deviceExistsPolicy: DeviceExistsPolicy;

  beforeEach(() => {
    deviceRepository = {
      findById: vi.fn(),
    };

    deviceExistsPolicy = new DeviceExistsPolicy(deviceRepository as unknown as DeviceRepository);
  });

  describe('validate', () => {
    it('should not throw an error if the device exists', async () => {
      const mockDevice = {} as Device;
      deviceRepository.findById.mockResolvedValue(mockDevice);

      await expect(deviceExistsPolicy.validate('device-123')).resolves.not.toThrow();

      expect(deviceRepository.findById).toHaveBeenCalled();
    });

    it('should throw error if the device does not exist', async () => {
      deviceRepository.findById.mockResolvedValue(null);

      await expect(deviceExistsPolicy.validate('device-123')).rejects.toThrow('Device device-123 does not exist');

      expect(deviceRepository.findById).toHaveBeenCalled();
    });

    it('should include the device ID in the error message', async () => {
      deviceRepository.findById.mockResolvedValue(null);

      await expect(deviceExistsPolicy.validate('my-device-456')).rejects.toThrow('Device my-device-456 does not exist');
    });
  });
});
