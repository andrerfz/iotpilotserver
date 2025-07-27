import {DeviceNamingPolicy} from '../device-naming.policy';
import {DeviceRepository} from '../../interfaces/device-repository.interface';
import {Device} from '../../entities/device.entity';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {IPAddress} from '../../value-objects/ip-address.vo';
import {InvalidDeviceDataException} from '../../exceptions/invalid-device-data.exception';

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

describe('DeviceNamingPolicy', () => {
  let policy: DeviceNamingPolicy;
  const tenantId = 'tenant-1';
  let device: Device;

  beforeEach(() => {
    jest.clearAllMocks();
    policy = new DeviceNamingPolicy(mockDeviceRepository);
    
    // Create a test device
    const deviceId = DeviceId.create('device-1');
    const deviceName = DeviceName.create('Test Device');
    const ipAddress = IPAddress.create('192.168.1.1');
    
    device = new Device(deviceId, deviceName, ipAddress);
  });

  describe('validateDeviceName', () => {
    it('should not throw an error for valid device names', () => {
      const validNames = [
        DeviceName.create('Test Device'),
        DeviceName.create('device-123'),
        DeviceName.create('My_Device'),
        DeviceName.create('Device 123')
      ];

      validNames.forEach(name => {
        expect(() => policy.validateDeviceName(name)).not.toThrow();
      });
    });

    it('should throw InvalidDeviceDataException for names with reserved prefixes', () => {
      const reservedPrefixNames = [
        DeviceName.create('system_device'),
        DeviceName.create('admin_device'),
        DeviceName.create('reserved_device')
      ];

      reservedPrefixNames.forEach(name => {
        expect(() => policy.validateDeviceName(name)).toThrow(InvalidDeviceDataException);
      });
    });

    it('should throw InvalidDeviceDataException for names with disallowed characters', () => {
      // We need to bypass the DeviceName validation to test the policy validation
      // Create DeviceName instances with disallowed characters
      const createNameWithDisallowedChars = (name: string) => {
        const deviceName = DeviceName.create('Valid Name');
        // Replace the internal value with the invalid name
        Object.defineProperty(deviceName, 'toString', {
          value: () => name
        });
        return deviceName;
      };

      const invalidNames = [
        createNameWithDisallowedChars('Device<Test>'),
        createNameWithDisallowedChars('Device:Test'),
        createNameWithDisallowedChars('Device"Test'),
        createNameWithDisallowedChars('Device/Test'),
        createNameWithDisallowedChars('Device\\Test'),
        createNameWithDisallowedChars('Device|Test'),
        createNameWithDisallowedChars('Device?Test'),
        createNameWithDisallowedChars('Device*Test')
      ];

      invalidNames.forEach(name => {
        expect(() => policy.validateDeviceName(name)).toThrow(InvalidDeviceDataException);
      });
    });

    it('should throw InvalidDeviceDataException for names with leading or trailing spaces', () => {
      // We need to bypass the DeviceName validation to test the policy validation
      const createNameWithSpaces = (name: string) => {
        const deviceName = DeviceName.create('Valid Name');
        // Replace the internal value with the invalid name
        Object.defineProperty(deviceName, 'toString', {
          value: () => name
        });
        return deviceName;
      };

      const invalidNames = [
        createNameWithSpaces(' Leading Space'),
        createNameWithSpaces('Trailing Space ')
      ];

      invalidNames.forEach(name => {
        expect(() => policy.validateDeviceName(name)).toThrow(InvalidDeviceDataException);
      });
    });
  });

  describe('checkDeviceNameUnique', () => {
    it('should not throw an error when device name is unique', async () => {
      const deviceName = DeviceName.create('Unique Device');
      mockDeviceRepository.findByName.mockResolvedValue(null);

      await expect(policy.checkDeviceNameUnique(deviceName, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.findByName).toHaveBeenCalledWith(deviceName, tenantId);
    });

    it('should throw InvalidDeviceDataException when device name already exists', async () => {
      const deviceName = DeviceName.create('Existing Device');
      mockDeviceRepository.findByName.mockResolvedValue(device);

      await expect(policy.checkDeviceNameUnique(deviceName, tenantId))
        .rejects.toThrow(InvalidDeviceDataException);
      expect(mockDeviceRepository.findByName).toHaveBeenCalledWith(deviceName, tenantId);
    });

    it('should not throw an error when device name exists but belongs to the excluded device', async () => {
      const deviceName = DeviceName.create('Existing Device');
      mockDeviceRepository.findByName.mockResolvedValue(device);

      await expect(policy.checkDeviceNameUnique(deviceName, tenantId, 'device-1')).resolves.not.toThrow();
      expect(mockDeviceRepository.findByName).toHaveBeenCalledWith(deviceName, tenantId);
    });
  });

  describe('generateUniqueDeviceName', () => {
    it('should return the base name when it is unique', async () => {
      const baseName = 'Unique Device';
      mockDeviceRepository.existsByName.mockResolvedValue(false);

      const result = await policy.generateUniqueDeviceName(baseName, tenantId);
      
      expect(result.toString()).toBe(baseName);
      expect(mockDeviceRepository.existsByName).toHaveBeenCalledTimes(1);
    });

    it('should append counter to base name when it already exists', async () => {
      const baseName = 'Existing Device';
      // First call returns true (name exists), second call returns false (name with counter is unique)
      mockDeviceRepository.existsByName
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await policy.generateUniqueDeviceName(baseName, tenantId);
      
      expect(result.toString()).toBe(`${baseName}-1`);
      expect(mockDeviceRepository.existsByName).toHaveBeenCalledTimes(2);
    });

    it('should increment counter until a unique name is found', async () => {
      const baseName = 'Very Popular Device';
      // First three calls return true (names exist), fourth call returns false (name with counter is unique)
      mockDeviceRepository.existsByName
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await policy.generateUniqueDeviceName(baseName, tenantId);
      
      expect(result.toString()).toBe(`${baseName}-3`);
      expect(mockDeviceRepository.existsByName).toHaveBeenCalledTimes(4);
    });
  });

  describe('normalizeDeviceName', () => {
    it('should trim leading and trailing spaces', () => {
      const result = policy.normalizeDeviceName('  Device Name  ');
      expect(result.toString()).toBe('Device Name');
    });

    it('should replace multiple spaces with a single space', () => {
      const result = policy.normalizeDeviceName('Device    Name');
      expect(result.toString()).toBe('Device Name');
    });

    it('should replace disallowed characters with underscores', () => {
      const result = policy.normalizeDeviceName('Device<>:"/\\|?*Name');
      expect(result.toString()).toBe('Device___________Name');
    });

    it('should remove reserved prefixes', () => {
      const reservedPrefixes = [
        'system_Device',
        'admin_Device',
        'reserved_Device'
      ];

      reservedPrefixes.forEach(name => {
        const result = policy.normalizeDeviceName(name);
        expect(result.toString()).toBe('Device');
      });
    });

    it('should use default name if result is empty after normalization', () => {
      const result = policy.normalizeDeviceName('   ');
      expect(result.toString()).toBe('device');
    });

    it('should handle complex normalization cases', () => {
      const result = policy.normalizeDeviceName('  system_Device<>:"/\\|?*  Name  ');
      expect(result.toString()).toBe('Device___________Name');
    });
  });
});