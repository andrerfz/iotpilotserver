import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ListDevicesQuery} from './list-devices.query';
import {ListDevicesHandler} from './list-devices.handler';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@/lib/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@/lib/device/domain/value-objects/ip-address.vo';
import {DeviceStatus} from '@/lib/device/domain/value-objects/device-status.vo';
import {SshCredentials} from '@/lib/device/domain/value-objects/ssh-credentials.vo';
import {TenantContext} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';
import {Device} from '@/lib/device/domain/entities/device.entity';

// Mock dependencies
vi.mock('@/lib/device/domain/interfaces/device-repository.interface');
vi.mock('@/lib/device/domain/value-objects/device-id.vo', () => ({
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
  let mockDevices: Device[];

  beforeEach(() => {
    // Create mocks
    deviceRepository = {
      findAll: vi.fn()
    } as unknown as DeviceRepository;

    // Create tenant context
    const customerId = CustomerId.create('customer-123');
    const userId = UserId.create('user-123');
    const userRole = UserRole.create('USER');
    tenantContext = new TenantContext(customerId, userId, userRole, false);

    // Create mock devices
    mockDevices = [
      {
        id: DeviceId.create('device-1'),
        name: DeviceName.create('Device 1'),
        ipAddress: IpAddress.create('192.168.1.1'),
        status: DeviceStatus.create('active'),
        sshCredentials: SshCredentials.create('user1', 'pass1', 22),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      } as unknown as Device,
      {
        id: DeviceId.create('device-2'),
        name: DeviceName.create('Device 2'),
        ipAddress: IpAddress.create('192.168.1.2'),
        status: DeviceStatus.create('inactive'),
        sshCredentials: SshCredentials.create('user2', 'pass2', 22),
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02')
      } as unknown as Device,
      {
        id: DeviceId.create('device-3'),
        name: DeviceName.create('Device 3'),
        ipAddress: IpAddress.create('192.168.1.3'),
        status: DeviceStatus.create('active'),
        sshCredentials: SshCredentials.create('user3', 'pass3', 22),
        createdAt: new Date('2023-01-03'),
        updatedAt: new Date('2023-01-03')
      } as unknown as Device
    ];

    // Setup repository mock
    (deviceRepository.findAll as any).mockResolvedValue(mockDevices);

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
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findAll).toHaveBeenCalledWith(tenantContext);
    
    expect(result.devices).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
  });

  it('should filter devices by status', async () => {
    // Arrange
    const query = ListDevicesQuery.create(
      { status: 'active' },
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.devices[0].status.getValue()).toBe('active');
    expect(result.devices[1].status.getValue()).toBe('active');
  });

  it('should filter devices by search term', async () => {
    // Arrange
    const query = ListDevicesQuery.create(
      { search: 'Device 1' },
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.devices[0].name.getValue()).toBe('Device 1');
  });

  it('should sort devices by name', async () => {
    // Arrange
    const query = ListDevicesQuery.create(
      { sortBy: 'name', sortDirection: 'desc' },
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(3);
    expect(result.devices[0].name.getValue()).toBe('Device 3');
    expect(result.devices[1].name.getValue()).toBe('Device 2');
    expect(result.devices[2].name.getValue()).toBe('Device 1');
  });

  it('should apply pagination', async () => {
    // Arrange
    const query = ListDevicesQuery.create(
      { limit: 1, offset: 1 },
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.limit).toBe(1);
    expect(result.offset).toBe(1);
    expect(result.devices[0].name.getValue()).toBe('Device 2');
  });

  it('should throw an error if tenant context is missing', () => {
    // Act & Assert
    expect(() => ListDevicesQuery.create(
      {},
      'customer-123',
      undefined as any
    )).toThrow('Tenant context is required');
  });

  it('should allow SUPERADMIN users to query without customer ID', async () => {
    // Arrange
    const superAdminContext = TenantContext.createSuperAdmin(UserId.create('superadmin-123'));
    const query = ListDevicesQuery.create(
      {},
      undefined, // No customer ID provided
      superAdminContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findAll).toHaveBeenCalledWith(superAdminContext);
    expect(result.devices).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(query.customerId).toBeNull(); // SUPERADMIN should have null customerId
  });

  it('should allow SUPERADMIN users to query with specific customer ID', async () => {
    // Arrange
    const superAdminContext = TenantContext.createSuperAdmin(UserId.create('superadmin-123'));
    const query = ListDevicesQuery.create(
      {},
      'customer-456', // Specific customer ID provided
      superAdminContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findAll).toHaveBeenCalledWith(superAdminContext);
    expect(result.devices).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(query.customerId?.getValue()).toBe('customer-456'); // Should use provided customer ID
  });
});