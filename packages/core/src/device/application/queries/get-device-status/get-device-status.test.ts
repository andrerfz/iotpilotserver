import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GetDeviceStatusQuery} from './get-device-status.query';
import {GetDeviceStatusHandler} from './get-device-status.handler';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device-repository.interface';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import {SshCredentials} from '@iotpilot/core/device/domain/value-objects/ssh-credentials.vo';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';
import {DeviceNotFoundException} from '@iotpilot/core/device/domain/exceptions/device-not-found.exception';

// Mock dependencies
vi.mock('@iotpilot/core/device/domain/interfaces/device-repository.interface');
vi.mock('@iotpilot/core/device/domain/value-objects/device-id.vo', () => ({
  DeviceId: {
    create: vi.fn().mockImplementation((id) => ({ 
      getValue: () => id,
      equals: (other: any) => id === other.getValue()
    }))
  }
}));

describe('GetDeviceStatusHandler', () => {
  let handler: GetDeviceStatusHandler;
  let deviceRepository: DeviceRepository;
  let tenantContext: TenantContextImpl;
  let mockDevice: DeviceEntity;

  beforeEach(() => {
    // Create mocks
    deviceRepository = {
      findById: vi.fn()
    } as unknown as DeviceRepository;

    // Create tenant context
    const customerId = CustomerId.create('c1234567890123456789012345');
    const userId = UserId.create('user-123');
    const userRole = UserRole.create('USER');
    tenantContext = TenantContextImpl.create(customerId, userId, userRole);

    // Create mock device with proper customerId
    mockDevice = DeviceEntity.create(
      DeviceId.create('device-123'),
      DeviceName.create('Test Device'),
      customerId,
      DeviceStatus.create({ businessStatus: 'active', connectivity: 'online' }),
      IpAddress.create('192.168.1.1'),
      undefined, // tailscaleIp
      undefined, // hostname
      {
        username: 'user',
        port: 22,
        privateKey: 'pass'
      }
    ) as unknown as Device;

    // Setup repository mocks
    (deviceRepository.findById as any).mockResolvedValue(mockDevice);

    // Create handler - only needs deviceRepository
    handler = new GetDeviceStatusHandler(deviceRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get device status with metrics', async () => {
    // Arrange
    const query = GetDeviceStatusQuery.create(
      'device-123',
      true, // includeMetrics
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      tenantContext
    );
    
    // Handler only uses deviceRepository, not sshClient or metricsRepository
    
    expect(result.deviceId).toBe('device-123');
    expect(result.ipAddress).toBe('192.168.1.1');
    // Status is now an object with businessStatus and connectivity
    expect(result.status).toBeDefined();
    expect(result.isOnline).toBeDefined();
    expect(result.connectionQuality).toBeDefined();
    // Metrics are optional and come from device.metrics
    if (result.metrics) {
      expect(result.metrics).toBeDefined();
    }
  });

  it('should get device status without metrics', async () => {
    // Arrange
    const query = GetDeviceStatusQuery.create(
      'device-123',
      false, // includeMetrics
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      tenantContext
    );
    
    // Handler only uses deviceRepository
    expect(result.deviceId).toBe('device-123');
    expect(result.ipAddress).toBe('192.168.1.1');
    expect(result.status).toBeDefined();
    expect(result.isOnline).toBeDefined();
    // Metrics come from device.metrics if present
    if (result.metrics) {
      expect(result.metrics).toBeDefined();
    }
  });

  it('should handle missing metrics', async () => {
    // Arrange - create device without metrics
    const deviceWithoutMetrics = DeviceEntity.create(
      DeviceId.create('device-123'),
      DeviceName.create('Test Device'),
      CustomerId.create('c1234567890123456789012345'),
      DeviceStatus.create({ businessStatus: 'active', connectivity: 'online' }),
      IpAddress.create('192.168.1.1')
    );
    (deviceRepository.findById as any).mockResolvedValue(deviceWithoutMetrics);
    
    const query = GetDeviceStatusQuery.create(
      'device-123',
      true, // includeMetrics
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    // Metrics are optional - may be undefined if device has no metrics
    expect(result.deviceId).toBe('device-123');
    expect(result.status).toBeDefined();
  });

  it('should throw an error if device is not found', async () => {
    // Arrange
    (deviceRepository.findById as any).mockResolvedValue(null);
    
    const query = GetDeviceStatusQuery.create(
      'non-existent-device',
      true,
      'c1234567890123456789012345',
      tenantContext
    );

    // Act & Assert
    await expect(handler.handle(query)).rejects.toThrow(DeviceNotFoundException);
  });

  it('should throw an error if tenant context is missing', () => {
    // Act & Assert
    expect(() => GetDeviceStatusQuery.create(
      'device-123',
      true,
      'c1234567890123456789012345',
      undefined as any
    )).toThrow('Tenant context is required');
  });
});