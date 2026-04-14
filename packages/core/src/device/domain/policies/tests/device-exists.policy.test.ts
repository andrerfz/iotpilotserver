import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceExistsPolicy } from '../device-exists.policy';
import { DeviceRepository } from '../../interfaces/device.repository';
import { Device } from '../../entities/device.entity';

describe('DeviceExistsPolicy', () => {
  let deviceRepository: DeviceRepository;
  let policy: DeviceExistsPolicy;
  let device: Device;

  beforeEach(() => {
    deviceRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      softDelete: vi.fn()
    } as unknown as DeviceRepository;

    policy = new DeviceExistsPolicy(deviceRepository);
    device = {} as Device;
  });

  it('should not throw an error when device exists', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(device);

    await expect(policy.validate('device-123')).resolves.not.toThrow();

    expect(deviceRepository.findById).toHaveBeenCalled();
  });

  it('should throw error when device does not exist', async () => {
    vi.mocked(deviceRepository.findById).mockResolvedValue(null);

    await expect(policy.validate('device-123')).rejects.toThrow('Device device-123 does not exist');

    expect(deviceRepository.findById).toHaveBeenCalled();
  });
});
