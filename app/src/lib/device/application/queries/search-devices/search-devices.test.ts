import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SearchDevicesQuery} from './search-devices.query';
import {SearchDevicesHandler} from './search-devices.handler';
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

describe('SearchDevicesHandler', () => {
  let handler: SearchDevicesHandler;
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
        name: DeviceName.create('Raspberry Pi 4'),
        ipAddress: IpAddress.create('192.168.1.1'),
        status: DeviceStatus.create('active'),
        sshCredentials: SshCredentials.create('user1', 'pass1', 22),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      } as unknown as Device,
      {
        id: DeviceId.create('device-2'),
        name: DeviceName.create('Arduino Sensor'),
        ipAddress: IpAddress.create('192.168.1.2'),
        status: DeviceStatus.create('inactive'),
        sshCredentials: SshCredentials.create('user2', 'pass2', 22),
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02')
      } as unknown as Device,
      {
        id: DeviceId.create('device-3'),
        name: DeviceName.create('ESP32 Controller'),
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
    handler = new SearchDevicesHandler(deviceRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should search devices by name', async () => {
    // Arrange
    const query = SearchDevicesQuery.create(
      'Raspberry',
      'all',
      100,
      0,
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findAll).toHaveBeenCalledWith(tenantContext);
    
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.devices[0].name.getValue()).toBe('Raspberry Pi 4');
  });

  it('should search devices by IP address', async () => {
    // Arrange
    const query = SearchDevicesQuery.create(
      '192.168.1.2',
      'all',
      100,
      0,
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.devices[0].ipAddress.getValue()).toBe('192.168.1.2');
  });

  it('should search devices by ID', async () => {
    // Arrange
    const query = SearchDevicesQuery.create(
      'device-3',
      'all',
      100,
      0,
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.devices[0].id.getValue()).toBe('device-3');
  });

  it('should filter search results by status', async () => {
    // Arrange
    const query = SearchDevicesQuery.create(
      'device', // This will match all devices
      'active',
      100,
      0,
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

  it('should apply pagination to search results', async () => {
    // Arrange
    const query = SearchDevicesQuery.create(
      'device', // This will match all devices
      'all',
      1, // limit
      1, // offset
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
    expect(result.devices[0].id.getValue()).toBe('device-2');
  });

  it('should return empty results for non-matching search term', async () => {
    // Arrange
    const query = SearchDevicesQuery.create(
      'nonexistent',
      'all',
      100,
      0,
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should throw an error if search term is empty', () => {
    // Act & Assert
    expect(() => SearchDevicesQuery.create(
      '',
      'all',
      100,
      0,
      'customer-123',
      tenantContext
    )).toThrow('Search term is required');
  });

  it('should throw an error if tenant context is missing', () => {
    // Act & Assert
    expect(() => SearchDevicesQuery.create(
      'device',
      'all',
      100,
      0,
      'customer-123',
      undefined as any
    )).toThrow('Tenant context is required');
  });
});