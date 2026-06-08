import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ListDevicesQuery} from './list-devices.query';
import {ListDevicesHandler} from './list-devices.handler';
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
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

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

describe('ListDevicesHandler', () => {
  let handler: ListDevicesHandler;
  let deviceRepository: DeviceRepository;
  let tenantContext: TenantContext;
  let mockDevices: DeviceEntity[];

  beforeEach(() => {
    // Create mocks
    deviceRepository = {
      findAll: vi.fn(),
      findAllWithPagination: vi.fn(),
      count: vi.fn()
    } as unknown as DeviceRepository;

    // Create tenant context
    const customerId = CustomerId.create('c1234567890123456789012345');
    const userId = UserId.create('user-123');
    const userRole = UserRole.create('USER');
    tenantContext = TenantContextImpl.create(customerId, userId, userRole);

    // Create mock devices using DeviceEntity.create
    mockDevices = [
      DeviceEntity.create(
        DeviceId.create('device-1'),
        DeviceName.create('Device 1'),
        customerId,
        DeviceStatus.create({ businessStatus: 'active', connectivity: 'online' }),
        IpAddress.create('192.168.1.1'),
        undefined, // tailscaleIp
        undefined, // hostname
        {
          username: 'user1',
          port: 22,
          privateKey: 'pass1'
        }
      ),
      DeviceEntity.create(
        DeviceId.create('device-2'),
        DeviceName.create('Device 2'),
        customerId,
        DeviceStatus.create({ businessStatus: 'inactive', connectivity: 'offline' }),
        IpAddress.create('192.168.1.2'),
        undefined, // tailscaleIp
        undefined, // hostname
        {
          username: 'user2',
          port: 22,
          privateKey: 'pass2'
        }
      ),
      DeviceEntity.create(
        DeviceId.create('device-3'),
        DeviceName.create('Device 3'),
        customerId,
        DeviceStatus.create({ businessStatus: 'active', connectivity: 'online' }),
        IpAddress.create('192.168.1.3'),
        undefined, // tailscaleIp
        undefined, // hostname
        {
          username: 'user3',
          port: 22,
          privateKey: 'pass3'
        }
      )
    ];

    // Setup repository mocks
    (deviceRepository.findAllWithPagination as any).mockResolvedValue(mockDevices);
    (deviceRepository.count as any).mockResolvedValue(mockDevices.length);

    // Create handler
    handler = new ListDevicesHandler(deviceRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should list all devices', async () => {
    // Arrange
    const query = ListDevicesQuery.create(
      {},
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findAllWithPagination).toHaveBeenCalled();
    expect(deviceRepository.count).toHaveBeenCalledWith(tenantContext);
    
    expect(result.devices).toHaveLength(3);
    expect(result.total).toBe(3);
    // Handler uses limit from query (default 50) and calculates offset from page
    expect(result.devices.length).toBeGreaterThanOrEqual(0);
  });

  it('should filter devices by status', async () => {
    // Arrange - filter to only active devices
    const activeDevices = mockDevices.filter(d => d.isActive());
    (deviceRepository.findAllWithPagination as any).mockResolvedValue(activeDevices);
    (deviceRepository.count as any).mockResolvedValue(activeDevices.length);
    
    const query = ListDevicesQuery.create(
      { status: 'active' },
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(2);
    expect(result.total).toBe(2);
    // Status is now an object with businessStatus and connectivity
    expect(result.devices[0].status).toBeDefined();
    expect(result.devices[0].isActive).toBe(true);
    expect(result.devices[1].isActive).toBe(true);
  });

  it('should filter devices by search term', async () => {
    // Arrange - filter to matching devices
    const matchingDevices = mockDevices.filter(d => d.name.getValue().includes('Device 1'));
    (deviceRepository.findAllWithPagination as any).mockResolvedValue(matchingDevices);
    (deviceRepository.count as any).mockResolvedValue(matchingDevices.length);
    
    const query = ListDevicesQuery.create(
      { search: 'Device 1' },
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.devices[0].name).toBe('Device 1');
  });

  it('should sort devices by name', async () => {
    // Arrange - sort devices by name descending
    const sortedDevices = [...mockDevices].sort((a, b) => 
      b.name.getValue().localeCompare(a.name.getValue())
    );
    (deviceRepository.findAllWithPagination as any).mockResolvedValue(sortedDevices);
    (deviceRepository.count as any).mockResolvedValue(sortedDevices.length);
    
    const query = ListDevicesQuery.create(
      { sortBy: 'name', sortDirection: 'desc' },
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(3);
    // Handler returns name as string, not value object
    expect(result.devices[0].name).toBe('Device 3');
    expect(result.devices[1].name).toBe('Device 2');
    expect(result.devices[2].name).toBe('Device 1');
  });

  it('should apply pagination', async () => {
    // Arrange - return paginated results (skip first, take 1)
    const paginatedDevices = mockDevices.slice(1, 2); // Skip first, take 1
    (deviceRepository.findAllWithPagination as any).mockResolvedValue(paginatedDevices);
    (deviceRepository.count as any).mockResolvedValue(mockDevices.length);
    
    const query = ListDevicesQuery.create(
      { limit: 1, offset: 1 },
      'c1234567890123456789012345',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.devices[0].name).toBe('Device 2');
  });

  it('should throw an error if tenant context is missing', () => {
    // Act & Assert
    expect(() => ListDevicesQuery.create(
      {},
      'c1234567890123456789012345',
      undefined as any
    )).toThrow('Tenant context is required');
  });

  it('should allow SUPERADMIN users to query without customer ID', async () => {
    // Arrange
    const superAdminContext = TenantContextImpl.createSuperAdmin(UserId.create('superadmin-123'));
    const query = ListDevicesQuery.create(
      {},
      undefined, // No customer ID provided
      superAdminContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findAllWithPagination).toHaveBeenCalled();
    expect(deviceRepository.count).toHaveBeenCalledWith(superAdminContext);
    expect(result.devices).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(query.customerId).toBeNull(); // SUPERADMIN should have null customerId
  });

  it('should allow SUPERADMIN users to query with specific customer ID', async () => {
    // Arrange
    const superAdminContext = TenantContextImpl.createSuperAdmin(UserId.create('superadmin-123'));
    const query = ListDevicesQuery.create(
      {},
      'c1234567890123456789012345', // Specific customer ID provided
      superAdminContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findAllWithPagination).toHaveBeenCalled();
    expect(deviceRepository.count).toHaveBeenCalledWith(superAdminContext);
    expect(result.devices).toHaveLength(3);
    expect(result.total).toBe(3);
    // Query should accept the customer ID if provided
    expect(query.customerId).toBeDefined();
  });
});