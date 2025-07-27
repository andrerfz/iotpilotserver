import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GetDeviceMetricsQuery} from './get-device-metrics.query';
import {GetDeviceMetricsHandler} from './get-device-metrics.handler';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {MetricsRepository} from '@/lib/device/domain/interfaces/metrics-repository.interface';
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
import {DeviceNotFoundException} from '@/lib/device/domain/exceptions/device-not-found.exception';

// Mock dependencies
vi.mock('@/lib/device/domain/interfaces/device-repository.interface');
vi.mock('@/lib/device/domain/interfaces/metrics-repository.interface');
vi.mock('@/lib/device/domain/value-objects/device-id.vo', () => ({
  DeviceId: {
    create: vi.fn().mockImplementation((id) => ({ 
      getValue: () => id,
      equals: (other: any) => id === other.getValue()
    }))
  }
}));

describe('GetDeviceMetricsHandler', () => {
  let handler: GetDeviceMetricsHandler;
  let deviceRepository: DeviceRepository;
  let metricsRepository: MetricsRepository;
  let tenantContext: TenantContext;
  let mockDevice: Device;
  let mockMetrics: { timestamp: Date; value: number }[];

  beforeEach(() => {
    // Create mocks
    deviceRepository = {
      findById: vi.fn()
    } as unknown as DeviceRepository;

    metricsRepository = {
      getMetrics: vi.fn()
    } as unknown as MetricsRepository;

    // Create tenant context
    const customerId = CustomerId.create('customer-123');
    const userId = UserId.create('user-123');
    const userRole = UserRole.create('USER');
    tenantContext = new TenantContext(customerId, userId, userRole, false);

    // Create mock device
    mockDevice = {
      id: DeviceId.create('device-123'),
      name: DeviceName.create('Test Device'),
      ipAddress: IpAddress.create('192.168.1.1'),
      status: DeviceStatus.create('active'),
      sshCredentials: SshCredentials.create('user', 'pass', 22),
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Device;

    // Create mock metrics
    mockMetrics = [
      { timestamp: new Date('2023-01-01T10:00:00Z'), value: 25.5 },
      { timestamp: new Date('2023-01-01T10:05:00Z'), value: 30.2 },
      { timestamp: new Date('2023-01-01T10:10:00Z'), value: 28.7 }
    ];

    // Setup repository mocks
    (deviceRepository.findById as any).mockResolvedValue(mockDevice);
    (metricsRepository.getMetrics as any).mockResolvedValue(mockMetrics);

    // Create handler
    handler = new GetDeviceMetricsHandler(deviceRepository, metricsRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get device metrics', async () => {
    // Arrange
    const timeRange = {
      from: new Date('2023-01-01T10:00:00Z'),
      to: new Date('2023-01-01T11:00:00Z')
    };
    
    const query = GetDeviceMetricsQuery.create(
      'device-123',
      timeRange,
      ['cpu'],
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(deviceRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      tenantContext
    );
    
    expect(metricsRepository.getMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      'cpu',
      timeRange.from,
      timeRange.to,
      tenantContext
    );
    
    expect(result.deviceId).toBe('device-123');
    expect(result.deviceName).toBe('Test Device');
    expect(result.timeRange).toEqual(timeRange);
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].metricType).toBe('cpu');
    expect(result.metrics[0].unit).toBe('%');
    expect(result.metrics[0].dataPoints).toEqual(mockMetrics);
  });

  it('should get multiple metric types', async () => {
    // Arrange
    const timeRange = {
      from: new Date('2023-01-01T10:00:00Z'),
      to: new Date('2023-01-01T11:00:00Z')
    };
    
    const query = GetDeviceMetricsQuery.create(
      'device-123',
      timeRange,
      ['cpu', 'memory'],
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(metricsRepository.getMetrics).toHaveBeenCalledTimes(2);
    expect(metricsRepository.getMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      'cpu',
      timeRange.from,
      timeRange.to,
      tenantContext
    );
    expect(metricsRepository.getMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ getValue: expect.any(Function) }),
      'memory',
      timeRange.from,
      timeRange.to,
      tenantContext
    );
    
    expect(result.metrics).toHaveLength(2);
    expect(result.metrics[0].metricType).toBe('cpu');
    expect(result.metrics[0].unit).toBe('%');
    expect(result.metrics[1].metricType).toBe('memory');
    expect(result.metrics[1].unit).toBe('MB');
  });

  it('should throw an error if device is not found', async () => {
    // Arrange
    (deviceRepository.findById as any).mockResolvedValue(null);
    
    const timeRange = {
      from: new Date('2023-01-01T10:00:00Z'),
      to: new Date('2023-01-01T11:00:00Z')
    };
    
    const query = GetDeviceMetricsQuery.create(
      'non-existent-device',
      timeRange,
      ['cpu'],
      'customer-123',
      tenantContext
    );

    // Act & Assert
    await expect(handler.handle(query)).rejects.toThrow(DeviceNotFoundException);
    expect(metricsRepository.getMetrics).not.toHaveBeenCalled();
  });

  it('should throw an error if time range is invalid', () => {
    // Arrange
    const invalidTimeRange = {
      from: new Date('2023-01-01T11:00:00Z'), // from is after to
      to: new Date('2023-01-01T10:00:00Z')
    };

    // Act & Assert
    expect(() => GetDeviceMetricsQuery.create(
      'device-123',
      invalidTimeRange,
      ['cpu'],
      'customer-123',
      tenantContext
    )).toThrow('Invalid time range');
  });

  it('should throw an error if tenant context is missing', () => {
    // Arrange
    const timeRange = {
      from: new Date('2023-01-01T10:00:00Z'),
      to: new Date('2023-01-01T11:00:00Z')
    };

    // Act & Assert
    expect(() => GetDeviceMetricsQuery.create(
      'device-123',
      timeRange,
      ['cpu'],
      'customer-123',
      undefined as any
    )).toThrow('Tenant context is required');
  });
});