import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {UpdateDeviceCommand} from './update-device.command';
import {UpdateDeviceHandler} from './update-device.handler';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';
import {DeviceNotFoundException} from '@iotpilot/core/device/domain/exceptions/device-not-found.exception';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';

describe('UpdateDeviceHandler', () => {
  let handler: UpdateDeviceHandler;
  let deviceRepository: DeviceRepository;
  let logger: StructuredLogger;
  let tenantContext: TenantContextImpl;
  let mockDevice: DeviceEntity;

  const TEST_CUSTOMER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const TEST_USER_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const TEST_DEVICE_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

  beforeEach(() => {
    // Create tenant context
    const customerId = CustomerId.create(TEST_CUSTOMER_ID);
    const userId = UserId.create(TEST_USER_ID);
    const userRole = UserRole.create('USER');
    tenantContext = new TenantContextImpl(customerId, userId, userRole, false);

    // Create mock device entity
    mockDevice = DeviceEntity.create(
      DeviceId.create(TEST_DEVICE_ID),
      DeviceName.create('Test Device'),
      CustomerId.create(TEST_CUSTOMER_ID),
      DeviceStatus.onlineAndActive(),
      IpAddress.create('192.168.1.1')
    );

    // Create repository mock
    deviceRepository = {
      findById: vi.fn().mockResolvedValue(mockDevice),
      save: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn(),
      findByDeviceId: vi.fn(),
      findByName: vi.fn(),
      findByIpAddress: vi.fn(),
      findAllWithPagination: vi.fn(),
      findOnlineDevices: vi.fn(),
      saveAll: vi.fn(),
      saveMany: vi.fn(),
      softDelete: vi.fn(),
      search: vi.fn(),
      count: vi.fn(),
      countOnlineDevices: vi.fn(),
    } as unknown as DeviceRepository;

    // Create logger mock
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as StructuredLogger;

    // Create handler
    handler = new UpdateDeviceHandler(deviceRepository, logger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update a device name', async () => {
    // Arrange
    const deviceId = DeviceId.create(TEST_DEVICE_ID);
    const command = UpdateDeviceCommand.create(
      deviceId,
      tenantContext,
      'Updated Device' // hostname/name
    );

    // Act
    const result = await handler.handle(command);

    // Assert
    expect(deviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantContext);
    expect(deviceRepository.save).toHaveBeenCalledWith(result, tenantContext);
    expect(result.name.getValue()).toBe('Updated Device');
  });

  it('should update device IP address', async () => {
    // Arrange
    const deviceId = DeviceId.create(TEST_DEVICE_ID);
    const command = UpdateDeviceCommand.create(
      deviceId,
      tenantContext,
      undefined, // hostname
      '192.168.1.2' // ipAddress
    );

    // Act
    const result = await handler.handle(command);

    // Assert
    expect(deviceRepository.save).toHaveBeenCalled();
    expect(result.getIpAddress()?.getValue()).toBe('192.168.1.2');
  });

  it('should throw DeviceNotFoundException if device is not found', async () => {
    // Arrange
    (deviceRepository.findById as any).mockResolvedValue(null);

    const deviceId = DeviceId.create(TEST_DEVICE_ID);
    const command = UpdateDeviceCommand.create(
      deviceId,
      tenantContext,
      'Updated Device'
    );

    // Act & Assert
    await expect(handler.handle(command)).rejects.toThrow(DeviceNotFoundException);
    expect(deviceRepository.save).not.toHaveBeenCalled();
  });

  it('should log device update details', async () => {
    // Arrange
    const deviceId = DeviceId.create(TEST_DEVICE_ID);
    const command = UpdateDeviceCommand.create(
      deviceId,
      tenantContext,
      'Updated Device',
      '192.168.1.2'
    );

    // Act
    await handler.handle(command);

    // Assert
    expect(logger.info).toHaveBeenCalledWith(
      'Device updated successfully',
      expect.objectContaining({
        deviceId: TEST_DEVICE_ID,
        name: 'Updated Device',
      })
    );
  });
});
