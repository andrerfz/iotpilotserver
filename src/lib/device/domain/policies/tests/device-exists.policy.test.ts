import {DeviceExistsPolicy} from '../device-exists.policy';
import {DeviceRepository} from '../../interfaces/device-repository.interface';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {IPAddress} from '../../value-objects/ip-address.vo';
import {DeviceNotFoundException} from '../../exceptions/device-not-found.exception';

// Mock implementation of DeviceRepository
const mockDeviceRepository: jest.Mocked<DeviceRepository> = {
  findById: jest.fn(),
  findByName: jest.fn(),
  findByIpAddress: jest.fn(),
  findAll: jest.fn(),
  findByType: jest.fn(),
  findByStatus: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  existsByName: jest.fn(),
  existsByIpAddress: jest.fn(),
  count: jest.fn()
};

describe('DeviceExistsPolicy', () => {
  let policy: DeviceExistsPolicy;
  const tenantId = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    policy = new DeviceExistsPolicy(mockDeviceRepository);
  });

  describe('checkDeviceExists', () => {
    it('should not throw an error when device exists', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.exists.mockResolvedValue(true);

      await expect(policy.checkDeviceExists(deviceId, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.exists).toHaveBeenCalledWith(deviceId, tenantId);
    });

    it('should throw DeviceNotFoundException when device does not exist', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.exists.mockResolvedValue(false);

      await expect(policy.checkDeviceExists(deviceId, tenantId)).rejects.toThrow(DeviceNotFoundException);
      expect(mockDeviceRepository.exists).toHaveBeenCalledWith(deviceId, tenantId);
    });
  });

  describe('checkDeviceExistsByName', () => {
    it('should not throw an error when device exists by name', async () => {
      const deviceName = DeviceName.create('Test Device');
      mockDeviceRepository.existsByName.mockResolvedValue(true);

      await expect(policy.checkDeviceExistsByName(deviceName, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.existsByName).toHaveBeenCalledWith(deviceName, tenantId);
    });

    it('should throw DeviceNotFoundException when device does not exist by name', async () => {
      const deviceName = DeviceName.create('Test Device');
      mockDeviceRepository.existsByName.mockResolvedValue(false);

      await expect(policy.checkDeviceExistsByName(deviceName, tenantId)).rejects.toThrow(DeviceNotFoundException);
      expect(mockDeviceRepository.existsByName).toHaveBeenCalledWith(deviceName, tenantId);
    });
  });

  describe('checkDeviceExistsByIpAddress', () => {
    it('should not throw an error when device exists by IP address', async () => {
      const ipAddress = IPAddress.create('192.168.1.1');
      mockDeviceRepository.existsByIpAddress.mockResolvedValue(true);

      await expect(policy.checkDeviceExistsByIpAddress(ipAddress, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.existsByIpAddress).toHaveBeenCalledWith(ipAddress, tenantId);
    });

    it('should throw DeviceNotFoundException when device does not exist by IP address', async () => {
      const ipAddress = IPAddress.create('192.168.1.1');
      mockDeviceRepository.existsByIpAddress.mockResolvedValue(false);

      await expect(policy.checkDeviceExistsByIpAddress(ipAddress, tenantId)).rejects.toThrow(DeviceNotFoundException);
      expect(mockDeviceRepository.existsByIpAddress).toHaveBeenCalledWith(ipAddress, tenantId);
    });
  });

  describe('checkDeviceDoesNotExist', () => {
    it('should not throw an error when device does not exist', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.exists.mockResolvedValue(false);

      await expect(policy.checkDeviceDoesNotExist(deviceId, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.exists).toHaveBeenCalledWith(deviceId, tenantId);
    });

    it('should throw an error when device already exists', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.exists.mockResolvedValue(true);

      await expect(policy.checkDeviceDoesNotExist(deviceId, tenantId)).rejects.toThrow("Device with ID 'device-1' already exists");
      expect(mockDeviceRepository.exists).toHaveBeenCalledWith(deviceId, tenantId);
    });
  });

  describe('checkDeviceDoesNotExistByName', () => {
    it('should not throw an error when device does not exist by name', async () => {
      const deviceName = DeviceName.create('Test Device');
      mockDeviceRepository.existsByName.mockResolvedValue(false);

      await expect(policy.checkDeviceDoesNotExistByName(deviceName, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.existsByName).toHaveBeenCalledWith(deviceName, tenantId);
    });

    it('should throw an error when device already exists by name', async () => {
      const deviceName = DeviceName.create('Test Device');
      mockDeviceRepository.existsByName.mockResolvedValue(true);

      await expect(policy.checkDeviceDoesNotExistByName(deviceName, tenantId)).rejects.toThrow("Device with name 'Test Device' already exists");
      expect(mockDeviceRepository.existsByName).toHaveBeenCalledWith(deviceName, tenantId);
    });
  });

  describe('checkDeviceDoesNotExistByIpAddress', () => {
    it('should not throw an error when device does not exist by IP address', async () => {
      const ipAddress = IPAddress.create('192.168.1.1');
      mockDeviceRepository.existsByIpAddress.mockResolvedValue(false);

      await expect(policy.checkDeviceDoesNotExistByIpAddress(ipAddress, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.existsByIpAddress).toHaveBeenCalledWith(ipAddress, tenantId);
    });

    it('should throw an error when device already exists by IP address', async () => {
      const ipAddress = IPAddress.create('192.168.1.1');
      mockDeviceRepository.existsByIpAddress.mockResolvedValue(true);

      await expect(policy.checkDeviceDoesNotExistByIpAddress(ipAddress, tenantId)).rejects.toThrow("Device with IP address '192.168.1.1' already exists");
      expect(mockDeviceRepository.existsByIpAddress).toHaveBeenCalledWith(ipAddress, tenantId);
    });
  });
});