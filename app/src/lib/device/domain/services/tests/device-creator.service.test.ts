import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DeviceCreator} from '../device-creator.service';
import {DeviceRepository} from '../../interfaces/device-repository.interface';
import {DeviceNamingPolicy} from '../../policies/device-naming.policy';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {IpAddress} from '../../value-objects/ip-address.vo';
import {SshCredentials} from '../../value-objects/ssh-credentials.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';
import {InvalidDeviceDataException} from '../../exceptions/invalid-device-data.exception';

describe('DeviceCreator', () => {
  let deviceCreator: DeviceCreator;
  let mockDeviceRepository: DeviceRepository;
  let mockDeviceNamingPolicy: DeviceNamingPolicy;
  let tenantContext: TenantContext;

  beforeEach(() => {
    // Create mocks
    mockDeviceRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByIpAddress: vi.fn(),
      findActive: vi.fn(),
      findInactive: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn()
    };

    mockDeviceNamingPolicy = {
      isValidName: vi.fn()
    };

    // Create tenant context
    tenantContext = new TenantContext(
      CustomerId.create('customer-123'),
      UserId.create('user-123'),
      UserRole.create('ADMIN'),
      false
    );

    // Create service instance
    deviceCreator = new DeviceCreator(
      mockDeviceRepository,
      mockDeviceNamingPolicy
    );
  });

  it('should create a device successfully', async () => {
    // Arrange
    const deviceId = DeviceId.create('device-123');
    const deviceName = DeviceName.create('test-device');
    const ipAddress = IpAddress.create('192.168.1.1');
    const sshCredentials = SshCredentials.create('user', 'password');

    // Mock repository and policy
    vi.mocked(mockDeviceNamingPolicy.isValidName).mockReturnValue(true);
    vi.mocked(mockDeviceRepository.findByName).mockResolvedValue(null);
    vi.mocked(mockDeviceRepository.findByIpAddress).mockResolvedValue(null);
    vi.mocked(mockDeviceRepository.save).mockResolvedValue(undefined);

    // Act
    const device = await deviceCreator.createDevice(
      deviceId,
      deviceName,
      ipAddress,
      sshCredentials,
      tenantContext
    );

    // Assert
    expect(device).toBeDefined();
    expect(device.id).toEqual(deviceId);
    expect(device.name).toEqual(deviceName);
    expect(device.ipAddress).toEqual(ipAddress);
    expect(device.sshCredentials).toEqual(sshCredentials);
    expect(device.getTenantId()).toEqual(tenantContext.getCustomerId());
    expect(mockDeviceRepository.save).toHaveBeenCalledWith(device, tenantContext);
  });

  it('should throw an error if device name is invalid', async () => {
    // Arrange
    const deviceId = DeviceId.create('device-123');
    const deviceName = DeviceName.create('invalid-name');
    const ipAddress = IpAddress.create('192.168.1.1');
    const sshCredentials = SshCredentials.create('user', 'password');

    // Mock repository and policy
    vi.mocked(mockDeviceNamingPolicy.isValidName).mockReturnValue(false);

    // Act & Assert
    await expect(
      deviceCreator.createDevice(
        deviceId,
        deviceName,
        ipAddress,
        sshCredentials,
        tenantContext
      )
    ).rejects.toThrow(InvalidDeviceDataException);
    expect(mockDeviceRepository.save).not.toHaveBeenCalled();
  });

  it('should throw an error if device name already exists', async () => {
    // Arrange
    const deviceId = DeviceId.create('device-123');
    const deviceName = DeviceName.create('existing-device');
    const ipAddress = IpAddress.create('192.168.1.1');
    const sshCredentials = SshCredentials.create('user', 'password');

    // Mock repository and policy
    vi.mocked(mockDeviceNamingPolicy.isValidName).mockReturnValue(true);
    vi.mocked(mockDeviceRepository.findByName).mockResolvedValue({} as any);

    // Act & Assert
    await expect(
      deviceCreator.createDevice(
        deviceId,
        deviceName,
        ipAddress,
        sshCredentials,
        tenantContext
      )
    ).rejects.toThrow(InvalidDeviceDataException);
    expect(mockDeviceRepository.save).not.toHaveBeenCalled();
  });

  it('should throw an error if IP address already exists', async () => {
    // Arrange
    const deviceId = DeviceId.create('device-123');
    const deviceName = DeviceName.create('test-device');
    const ipAddress = IpAddress.create('192.168.1.1');
    const sshCredentials = SshCredentials.create('user', 'password');

    // Mock repository and policy
    vi.mocked(mockDeviceNamingPolicy.isValidName).mockReturnValue(true);
    vi.mocked(mockDeviceRepository.findByName).mockResolvedValue(null);
    vi.mocked(mockDeviceRepository.findByIpAddress).mockResolvedValue({} as any);

    // Act & Assert
    await expect(
      deviceCreator.createDevice(
        deviceId,
        deviceName,
        ipAddress,
        sshCredentials,
        tenantContext
      )
    ).rejects.toThrow(InvalidDeviceDataException);
    expect(mockDeviceRepository.save).not.toHaveBeenCalled();
  });
});