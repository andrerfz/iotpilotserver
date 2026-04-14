import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DeviceCreatorService} from '../device-creator.service';
import {DeviceRepository} from '../../interfaces/device.repository';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';

const TEST_CUSTOMER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TEST_USER_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const TEST_DEVICE_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

describe('DeviceCreatorService', () => {
  let deviceCreatorService: DeviceCreatorService;
  let mockDeviceRepository: DeviceRepository;
  let tenantContext: TenantContextImpl;

  beforeEach(() => {
    // Create repository mock
    mockDeviceRepository = {
      findById: vi.fn(),
      findByDeviceId: vi.fn(),
      findByName: vi.fn(),
      findByIpAddress: vi.fn(),
      findAll: vi.fn(),
      findAllWithPagination: vi.fn(),
      findOnlineDevices: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveAll: vi.fn(),
      saveMany: vi.fn(),
      softDelete: vi.fn(),
      search: vi.fn(),
      count: vi.fn(),
      countOnlineDevices: vi.fn(),
    } as unknown as DeviceRepository;

    // Create tenant context with valid UUIDs
    tenantContext = new TenantContextImpl(
      CustomerId.create(TEST_CUSTOMER_ID),
      UserId.create(TEST_USER_ID),
      UserRole.create('ADMIN'),
      false
    );

    // Create service instance
    deviceCreatorService = new DeviceCreatorService(mockDeviceRepository);
  });

  it('should create a device successfully', async () => {
    // Arrange
    const deviceId = DeviceId.create(TEST_DEVICE_ID);
    const deviceName = DeviceName.create('test-device');
    const ipAddress = '192.168.1.1';
    const sshCredentials = { username: 'user', privateKey: 'key', port: 22 };

    // Act
    const device = await deviceCreatorService.createDevice(
      deviceId,
      deviceName,
      ipAddress,
      sshCredentials,
      tenantContext
    );

    // Assert
    expect(device).toBeDefined();
    expect(device.getId().getValue()).toBe(TEST_DEVICE_ID);
    expect(device.name.getValue()).toBe('test-device');
    expect(device.getIpAddress()?.getValue()).toBe('192.168.1.1');
    expect(device.sshCredentials).toEqual(sshCredentials);
    expect(mockDeviceRepository.save).toHaveBeenCalledWith(device, tenantContext);
  });

  it('should throw an error for invalid IP address', async () => {
    // Arrange
    const deviceId = DeviceId.create(TEST_DEVICE_ID);
    const deviceName = DeviceName.create('test-device');
    const invalidIp = 'not-an-ip';
    const sshCredentials = { username: 'user', privateKey: 'key', port: 22 };

    // Act & Assert
    await expect(
      deviceCreatorService.createDevice(
        deviceId,
        deviceName,
        invalidIp,
        sshCredentials,
        tenantContext
      )
    ).rejects.toThrow();
    expect(mockDeviceRepository.save).not.toHaveBeenCalled();
  });

  it('should create device from data object', async () => {
    // Arrange
    const data = {
      id: TEST_DEVICE_ID,
      name: 'data-device',
      ipAddress: '10.0.0.1',
      sshCredentials: { username: 'admin', privateKey: 'key' }
    };

    // Act
    const device = await deviceCreatorService.createDeviceFromData(data, tenantContext);

    // Assert
    expect(device).toBeDefined();
    expect(device.getId().getValue()).toBe(TEST_DEVICE_ID);
    expect(device.name.getValue()).toBe('data-device');
    expect(device.getIpAddress()?.getValue()).toBe('10.0.0.1');
    expect(mockDeviceRepository.save).toHaveBeenCalledWith(device, tenantContext);
  });

  it('should set device status to offline inactive by default', async () => {
    // Arrange
    const deviceId = DeviceId.create(TEST_DEVICE_ID);
    const deviceName = DeviceName.create('test-device');

    // Act
    const device = await deviceCreatorService.createDevice(
      deviceId,
      deviceName,
      '192.168.1.1',
      null,
      tenantContext
    );

    // Assert
    expect(device.status.businessStatus).toBe('inactive');
    expect(device.status.connectivity).toBe('offline');
  });
});
