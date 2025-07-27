import {DeviceAccessiblePolicy} from '../device-accessible.policy';
import {DeviceRepository} from '../../interfaces/device-repository.interface';
import {MetricsCollector} from '../../interfaces/metrics-collector.interface';
import {Device} from '../../entities/device.entity';
import {DeviceId} from '../../value-objects/device-id.vo';
import {DeviceName} from '../../value-objects/device-name.vo';
import {IPAddress} from '../../value-objects/ip-address.vo';
import {DeviceStatus} from '../../value-objects/device-status.vo';
import {DeviceNotFoundException} from '../../exceptions/device-not-found.exception';
import {DeviceAccessDeniedException} from '../../exceptions/device-access-denied.exception';

// Mock implementation of DeviceRepository
const mockDeviceRepository: jest.Mocked<DeviceRepository> = {
  findById: jest.fn(),
  findByName: jest.fn(),
  findByIpAddress: jest.fn(),
  findAll: jest.fn(),
  findByType: jest.fn(),
  findByStatus: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  existsByName: jest.fn(),
  existsByIpAddress: jest.fn(),
  count: jest.fn()
};

// Mock implementation of MetricsCollector
const mockMetricsCollector: jest.Mocked<MetricsCollector> = {
  collectMetrics: jest.fn(),
  collectMetricsById: jest.fn(),
  collectMetricsByIp: jest.fn(),
  collectCpuUsage: jest.fn(),
  collectMemoryUsage: jest.fn(),
  collectDiskUsage: jest.fn(),
  collectNetworkStats: jest.fn(),
  collectTemperature: jest.fn(),
  collectUptime: jest.fn(),
  collectProcesses: jest.fn(),
  isDeviceOnline: jest.fn(),
  isDeviceOnlineByIp: jest.fn()
};

describe('DeviceAccessiblePolicy', () => {
  let policy: DeviceAccessiblePolicy;
  const tenantId = 'tenant-1';
  let device: Device;

  beforeEach(() => {
    jest.clearAllMocks();
    policy = new DeviceAccessiblePolicy(mockDeviceRepository, mockMetricsCollector);
    
    // Create a test device
    const deviceId = DeviceId.create('device-1');
    const deviceName = DeviceName.create('Test Device');
    const ipAddress = IPAddress.create('192.168.1.1');
    
    device = new Device(deviceId, deviceName, ipAddress);
    // Add status property for testing
    (device as any).status = DeviceStatus.online();
  });

  describe('checkDeviceAccessible', () => {
    it('should not throw an error when device is online', async () => {
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(true);

      await expect(policy.checkDeviceAccessible(device, 'test_operation', tenantId)).resolves.not.toThrow();
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });

    it('should throw DeviceAccessDeniedException when device is offline', async () => {
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(false);

      await expect(policy.checkDeviceAccessible(device, 'test_operation', tenantId))
        .rejects.toThrow(DeviceAccessDeniedException);
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });
  });

  describe('checkDeviceAccessibleById', () => {
    it('should not throw an error when device exists and is online', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(device);
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(true);

      await expect(policy.checkDeviceAccessibleById(deviceId, 'test_operation', tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });

    it('should throw DeviceNotFoundException when device does not exist', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(null);

      await expect(policy.checkDeviceAccessibleById(deviceId, 'test_operation', tenantId))
        .rejects.toThrow(DeviceNotFoundException);
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
      expect(mockMetricsCollector.isDeviceOnline).not.toHaveBeenCalled();
    });

    it('should throw DeviceAccessDeniedException when device exists but is offline', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(device);
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(false);

      await expect(policy.checkDeviceAccessibleById(deviceId, 'test_operation', tenantId))
        .rejects.toThrow(DeviceAccessDeniedException);
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });
  });

  describe('checkDeviceStatus', () => {
    it('should not throw an error when device has the required status', async () => {
      const status = DeviceStatus.online();

      await expect(policy.checkDeviceStatus(device, status, 'test_operation')).resolves.not.toThrow();
    });

    it('should throw DeviceAccessDeniedException when device does not have the required status', async () => {
      const status = DeviceStatus.maintenance();

      await expect(policy.checkDeviceStatus(device, status, 'test_operation'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });
  });

  describe('checkDeviceAvailable', () => {
    it('should not throw an error when device is available', async () => {
      // Device status is already set to ONLINE in beforeEach

      await expect(policy.checkDeviceAvailable(device, 'test_operation')).resolves.not.toThrow();
    });

    it('should throw DeviceAccessDeniedException when device is unavailable', async () => {
      // Change device status to MAINTENANCE
      (device as any).status = DeviceStatus.maintenance();

      await expect(policy.checkDeviceAvailable(device, 'test_operation'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });

    it('should throw DeviceAccessDeniedException when device is offline', async () => {
      // Change device status to OFFLINE
      (device as any).status = DeviceStatus.offline();

      await expect(policy.checkDeviceAvailable(device, 'test_operation'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });

    it('should throw DeviceAccessDeniedException when device has error status', async () => {
      // Change device status to ERROR
      (device as any).status = DeviceStatus.error();

      await expect(policy.checkDeviceAvailable(device, 'test_operation'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });

    it('should throw DeviceAccessDeniedException when device has unknown status', async () => {
      // Change device status to UNKNOWN
      (device as any).status = DeviceStatus.unknown();

      await expect(policy.checkDeviceAvailable(device, 'test_operation'))
        .rejects.toThrow(DeviceAccessDeniedException);
    });
  });
});