import {SSHAllowedPolicy} from '../ssh-allowed.policy';
import {DeviceRepository} from '../../interfaces/device-repository.interface';
import {Device} from '../../entities/device.entity';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {IPAddress} from '../../value-objects/ip-address.vo';
import {DeviceType} from '../../value-objects/device-type.vo';
import {SSHCredentials} from '../../value-objects/ssh-credentials.vo';
import {DeviceNotFoundException} from '../../exceptions/device-not-found.exception';
import {DeviceAccessDeniedException} from '../../exceptions/device-access-denied.exception';
import {SSHConnectionFailedException} from '../../exceptions/ssh-connection-failed.exception';

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

describe('SSHAllowedPolicy', () => {
  let policy: SSHAllowedPolicy;
  const tenantId = 'tenant-1';
  let sshSupportedDevice: Device;
  let nonSshSupportedDevice: Device;

  beforeEach(() => {
    jest.clearAllMocks();
    policy = new SSHAllowedPolicy(mockDeviceRepository);
    
    // Create a test device that supports SSH
    const deviceId1 = DeviceId.create('device-1');
    const deviceName1 = DeviceName.create('SSH Device');
    const ipAddress1 = IPAddress.create('192.168.1.1');
    
    sshSupportedDevice = new Device(deviceId1, deviceName1, ipAddress1);
    // Add type property for testing
    (sshSupportedDevice as any).type = DeviceType.create('RASPBERRY_PI');
    // Add sshCredentials property for testing
    (sshSupportedDevice as any).sshCredentials = SSHCredentials.create('admin', 'password123');
    
    // Create a test device that does not support SSH
    const deviceId2 = DeviceId.create('device-2');
    const deviceName2 = DeviceName.create('Non-SSH Device');
    const ipAddress2 = IPAddress.create('192.168.1.2');
    
    nonSshSupportedDevice = new Device(deviceId2, deviceName2, ipAddress2);
    // Add type property for testing
    (nonSshSupportedDevice as any).type = DeviceType.create('ARDUINO');
  });

  describe('checkSSHAllowed', () => {
    it('should not throw an error when device type supports SSH', async () => {
      await expect(policy.checkSSHAllowed(sshSupportedDevice, 'ssh_connect')).resolves.not.toThrow();
    });

    it('should throw DeviceAccessDeniedException when device type does not support SSH', async () => {
      await expect(policy.checkSSHAllowed(nonSshSupportedDevice, 'ssh_connect'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });
  });

  describe('checkSSHAllowedById', () => {
    it('should not throw an error when device exists and supports SSH', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(sshSupportedDevice);

      await expect(policy.checkSSHAllowedById(deviceId, 'ssh_connect', tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
    });

    it('should throw DeviceNotFoundException when device does not exist', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(null);

      await expect(policy.checkSSHAllowedById(deviceId, 'ssh_connect', tenantId))
        .rejects.toThrow(DeviceNotFoundException);
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
    });

    it('should throw DeviceAccessDeniedException when device exists but does not support SSH', async () => {
      const deviceId = DeviceId.create('device-2');
      mockDeviceRepository.findById.mockResolvedValue(nonSshSupportedDevice);

      await expect(policy.checkSSHAllowedById(deviceId, 'ssh_connect', tenantId))
        .rejects.toThrow(DeviceAccessDeniedException);
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
    });
  });

  describe('isSSHSupportedForDeviceType', () => {
    it('should return true for device types that support SSH', () => {
      const supportedTypes = [
        DeviceType.create('RASPBERRY_PI'),
        DeviceType.create('JETSON_NANO'),
        DeviceType.create('BEAGLEBONE'),
        DeviceType.create('ROCK_PI'),
        DeviceType.create('ORANGE_PI'),
        DeviceType.create('CUSTOM_LINUX')
      ];

      supportedTypes.forEach(type => {
        // Access private method using any
        expect((policy as any).isSSHSupportedForDeviceType(type)).toBe(true);
      });
    });

    it('should return false for device types that do not support SSH', () => {
      const unsupportedTypes = [
        DeviceType.create('ARDUINO'),
        DeviceType.create('ESP32'),
        DeviceType.create('ESP8266'),
        DeviceType.create('OTHER')
      ];

      unsupportedTypes.forEach(type => {
        // Access private method using any
        expect((policy as any).isSSHSupportedForDeviceType(type)).toBe(false);
      });
    });
  });

  describe('checkSSHCredentialsValid', () => {
    it('should not throw an error when device has valid SSH credentials', async () => {
      await expect(policy.checkSSHCredentialsValid(sshSupportedDevice, 'ssh_connect')).resolves.not.toThrow();
    });

    it('should throw SSHConnectionFailedException when device has no SSH credentials', async () => {
      // Remove SSH credentials
      (sshSupportedDevice as any).sshCredentials = undefined;

      await expect(policy.checkSSHCredentialsValid(sshSupportedDevice, 'ssh_connect'))
        .rejects.toThrow(SSHConnectionFailedException);
    });
  });

  describe('checkSSHPortAllowed', () => {
    it('should not throw an error when port is valid and allowed', async () => {
      await expect(policy.checkSSHPortAllowed(22, 'ssh_connect')).resolves.not.toThrow();
    });

    it('should throw DeviceAccessDeniedException when port is below the valid range', async () => {
      await expect(policy.checkSSHPortAllowed(0, 'ssh_connect'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });

    it('should throw DeviceAccessDeniedException when port is above the valid range', async () => {
      await expect(policy.checkSSHPortAllowed(65536, 'ssh_connect'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });

    it('should throw DeviceAccessDeniedException when port is not in the allowed list', async () => {
      await expect(policy.checkSSHPortAllowed(8080, 'ssh_connect'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });

    it('should not throw an error for all allowed SSH ports', async () => {
      const allowedPorts = [22, 2222, 22222]; // These should match the allowed ports in the policy

      for (const port of allowedPorts) {
        await expect(policy.checkSSHPortAllowed(port, 'ssh_connect')).resolves.not.toThrow();
      }
    });
  });
});