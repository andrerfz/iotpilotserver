import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {GetDeviceStatusQuery} from './get-device-status.query';
import {GetDeviceStatusHandler} from './get-device-status.handler';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {MetricsRepository} from '@/lib/device/domain/interfaces/metrics-repository.interface';
import {SSHClient} from '@/lib/device/domain/interfaces/ssh-client.interface';
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
vi.mock('@/lib/device/domain/interfaces/ssh-client.interface');
vi.mock('@/lib/device/domain/value-objects/device-id.vo', () => ({
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
  let metricsRepository: MetricsRepository;
  let sshClient: SSHClient;
  let tenantContext: TenantContext;
  let mockDevice: Device;
  let mockMetrics: { timestamp: Date; value: number };

  beforeEach(() => {
    // Create mocks
    deviceRepository = {
      findById: vi.fn()
    } as unknown as DeviceRepository;

    metricsRepository = {
      getLatestMetric: vi.fn()
    } as unknown as MetricsRepository;

    sshClient = {
      isDeviceConnected: vi.fn(),
      getActiveSessions: vi.fn()
    } as unknown as SSHClient;

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
    mockMetrics = { 
      timestamp: new Date('2023-01-01T10:00:00Z'), 
      value: 25.5 
    };

    // Setup repository mocks
    (deviceRepository.findById as any).mockResolvedValue(mockDevice);
    (metricsRepository.getLatestMetric as any).mockResolvedValue(mockMetrics);
    (sshClient.isDeviceConnected as any).mockResolvedValue(true);
    (sshClient.getActiveSessions as any).mockResolvedValue([]);

    // Create handler
    handler = new GetDeviceStatusHandler(deviceRepository, metricsRepository, sshClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get device status with metrics', async () => {
    // Arrange
    const query = GetDeviceStatusQuery.create(
      'device-123',
      true, // includeMetrics
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
    
    expect(sshClient.isDeviceConnected).toHaveBeenCalledWith(
      mockDevice.ipAddress,
      mockDevice.sshCredentials
    );
    
    expect(metricsRepository.getLatestMetric).toHaveBeenCalledTimes(4); // cpu, memory, disk, network
    
    expect(result.deviceId).toBe('device-123');
    expect(result.deviceName).toBe('Test Device');
    expect(result.ipAddress).toBe('192.168.1.1');
    expect(result.status).toBe('active');
    expect(result.isConnected).toBe(true);
    expect(result.lastSeen).toBeInstanceOf(Date);
    expect(result.metrics).toBeDefined();
    expect(result.metrics?.cpu).toBeDefined();
    expect(result.metrics?.memory).toBeDefined();
    expect(result.metrics?.disk).toBeDefined();
    expect(result.metrics?.network).toBeDefined();
  });

  it('should get device status without metrics', async () => {
    // Arrange
    const query = GetDeviceStatusQuery.create(
      'device-123',
      false, // includeMetrics
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
    
    expect(sshClient.isDeviceConnected).toHaveBeenCalledWith(
      mockDevice.ipAddress,
      mockDevice.sshCredentials
    );
    
    expect(metricsRepository.getLatestMetric).not.toHaveBeenCalled();
    
    expect(result.deviceId).toBe('device-123');
    expect(result.deviceName).toBe('Test Device');
    expect(result.ipAddress).toBe('192.168.1.1');
    expect(result.status).toBe('active');
    expect(result.isConnected).toBe(true);
    expect(result.lastSeen).toBeNull();
    expect(result.metrics).toBeUndefined();
  });

  it('should handle missing metrics', async () => {
    // Arrange
    (metricsRepository.getLatestMetric as any).mockResolvedValue(null);
    
    const query = GetDeviceStatusQuery.create(
      'device-123',
      true, // includeMetrics
      'customer-123',
      tenantContext
    );

    // Act
    const result = await handler.handle(query);

    // Assert
    expect(result.metrics).toBeDefined();
    expect(result.metrics?.cpu).toBeUndefined();
    expect(result.metrics?.memory).toBeUndefined();
    expect(result.metrics?.disk).toBeUndefined();
    expect(result.metrics?.network).toBeUndefined();
    expect(result.lastSeen).toBeNull();
  });

  it('should throw an error if device is not found', async () => {
    // Arrange
    (deviceRepository.findById as any).mockResolvedValue(null);
    
    const query = GetDeviceStatusQuery.create(
      'non-existent-device',
      true,
      'customer-123',
      tenantContext
    );

    // Act & Assert
    await expect(handler.handle(query)).rejects.toThrow(DeviceNotFoundException);
    expect(sshClient.getActiveSessions).not.toHaveBeenCalled();
    expect(metricsRepository.getLatestMetric).not.toHaveBeenCalled();
  });

  it('should throw an error if tenant context is missing', () => {
    // Act & Assert
    expect(() => GetDeviceStatusQuery.create(
      'device-123',
      true,
      'customer-123',
      undefined as any
    )).toThrow('Tenant context is required');
  });
});