import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SearchDevicesQuery} from './search-devices.query';
import {SearchDevicesHandler} from './search-devices.handler';
import {DeviceRepository, DeviceSearchResult} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {UserRole} from '@iotpilot/core/shared/domain/value-objects/user-role.vo';
import {TenantContextImpl} from '@iotpilot/core/shared/application/context/tenant-context.vo';

describe('SearchDevicesHandler', () => {
  let handler: SearchDevicesHandler;
  let deviceRepository: DeviceRepository;
  let tenantContext: TenantContextImpl;
  let mockDevices: DeviceEntity[];

  beforeEach(() => {
    // Create tenant context
    const customerId = CustomerId.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    const userId = UserId.create('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');
    const userRole = UserRole.create('USER');
    tenantContext = new TenantContextImpl(customerId, userId, userRole, false);

    const testCustomerId = CustomerId.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

    // Create mock device entities
    mockDevices = [
      DeviceEntity.create(
        DeviceId.create('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'),
        DeviceName.create('Raspberry Pi 4'),
        testCustomerId,
        DeviceStatus.onlineAndActive(),
        IpAddress.create('192.168.1.1')
      ),
      DeviceEntity.create(
        DeviceId.create('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'),
        DeviceName.create('Arduino Sensor'),
        testCustomerId,
        DeviceStatus.offlineInactive(),
        IpAddress.create('192.168.1.2')
      ),
      DeviceEntity.create(
        DeviceId.create('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'),
        DeviceName.create('ESP32 Controller'),
        testCustomerId,
        DeviceStatus.onlineAndActive(),
        IpAddress.create('192.168.1.3')
      )
    ];

    // Create repository mock with search method
    deviceRepository = {
      search: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findByDeviceId: vi.fn(),
      findByName: vi.fn(),
      findByIpAddress: vi.fn(),
      findAllWithPagination: vi.fn(),
      findOnlineDevices: vi.fn(),
      save: vi.fn(),
      saveAll: vi.fn(),
      saveMany: vi.fn(),
      softDelete: vi.fn(),
      count: vi.fn(),
      countOnlineDevices: vi.fn(),
    } as unknown as DeviceRepository;

    // Create handler
    handler = new SearchDevicesHandler(deviceRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should search devices by name', async () => {
    // Arrange - mock search to return only matching device
    const searchResult: DeviceSearchResult = {
      devices: [mockDevices[0]], // Raspberry Pi 4
      total: 1,
      limit: 50,
      offset: 0
    };
    (deviceRepository.search as any).mockResolvedValue(searchResult);

    const query = SearchDevicesQuery.create(tenantContext, {
      searchTerm: 'Raspberry'
    });

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.search).toHaveBeenCalled();
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.devices[0].name).toBe('Raspberry Pi 4');
  });

  it('should search devices by IP address', async () => {
    // Arrange
    const searchResult: DeviceSearchResult = {
      devices: [mockDevices[1]], // Arduino Sensor - 192.168.1.2
      total: 1,
      limit: 50,
      offset: 0
    };
    (deviceRepository.search as any).mockResolvedValue(searchResult);

    const query = SearchDevicesQuery.create(tenantContext, {
      ipAddress: '192.168.1.2'
    });

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.search).toHaveBeenCalled();
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.devices[0].ipAddress).toBe('192.168.1.2');
  });

  it('should search devices with status filter', async () => {
    // Arrange
    const searchResult: DeviceSearchResult = {
      devices: [mockDevices[0], mockDevices[2]], // active devices
      total: 2,
      limit: 50,
      offset: 0
    };
    (deviceRepository.search as any).mockResolvedValue(searchResult);

    const query = SearchDevicesQuery.create(tenantContext, {
      searchTerm: 'device',
      status: 'active'
    });

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.search).toHaveBeenCalled();
    const searchCall = (deviceRepository.search as any).mock.calls[0];
    expect(searchCall[0]).toHaveProperty('status', 'active');
    expect(result.devices).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should apply pagination options', async () => {
    // Arrange
    const searchResult: DeviceSearchResult = {
      devices: [mockDevices[1]],
      total: 3,
      limit: 1,
      offset: 1
    };
    (deviceRepository.search as any).mockResolvedValue(searchResult);

    const query = SearchDevicesQuery.create(tenantContext, {
      searchTerm: 'device',
      page: 2,
      limit: 1
    });

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.search).toHaveBeenCalled();
    const searchCall = (deviceRepository.search as any).mock.calls[0];
    expect(searchCall[1]).toMatchObject({ page: 2, limit: 1 });
    expect(result.devices).toHaveLength(1);
    expect(result.total).toBe(3);
    expect(result.limit).toBe(1);
    expect(result.offset).toBe(1);
  });

  it('should return empty results when no matches found', async () => {
    // Arrange
    const searchResult: DeviceSearchResult = {
      devices: [],
      total: 0,
      limit: 50,
      offset: 0
    };
    (deviceRepository.search as any).mockResolvedValue(searchResult);

    const query = SearchDevicesQuery.create(tenantContext, {
      searchTerm: 'nonexistent'
    });

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.devices).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should pass tenant context to repository search', async () => {
    // Arrange
    const searchResult: DeviceSearchResult = {
      devices: [],
      total: 0,
      limit: 50,
      offset: 0
    };
    (deviceRepository.search as any).mockResolvedValue(searchResult);

    const query = SearchDevicesQuery.create(tenantContext, {
      searchTerm: 'test'
    });

    // Act
    await handler.handle(query);

    // Assert
    const searchCall = (deviceRepository.search as any).mock.calls[0];
    // Third argument should be the tenant context
    expect(searchCall[2]).toBe(tenantContext);
  });

  it('should build search criteria with searchTerm in OR clause', async () => {
    // Arrange
    const searchResult: DeviceSearchResult = {
      devices: [],
      total: 0,
      limit: 50,
      offset: 0
    };
    (deviceRepository.search as any).mockResolvedValue(searchResult);

    const query = SearchDevicesQuery.create(tenantContext, {
      searchTerm: 'Raspberry'
    });

    // Act
    await handler.handle(query);

    // Assert
    const criteria = (deviceRepository.search as any).mock.calls[0][0];
    expect(criteria.OR).toBeDefined();
    expect(criteria.OR.length).toBeGreaterThanOrEqual(2);
    // Should search in name and hostname
    expect(criteria.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.objectContaining({ contains: 'Raspberry' }) }),
        expect.objectContaining({ hostname: expect.objectContaining({ contains: 'Raspberry' }) })
      ])
    );
  });
});
