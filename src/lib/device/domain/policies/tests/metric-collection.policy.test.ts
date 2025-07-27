import {MetricCollectionPolicy} from '../metric-collection.policy';
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

describe('MetricCollectionPolicy', () => {
  let policy: MetricCollectionPolicy;
  const tenantId = 'tenant-1';
  let device: Device;

  beforeEach(() => {
    jest.clearAllMocks();
    policy = new MetricCollectionPolicy(mockDeviceRepository, mockMetricsCollector);
    
    // Create a test device
    const deviceId = DeviceId.create('device-1');
    const deviceName = DeviceName.create('Test Device');
    const ipAddress = IPAddress.create('192.168.1.1');
    
    device = new Device(deviceId, deviceName, ipAddress);
    // Add status property for testing
    (device as any).status = DeviceStatus.online();
  });

  describe('checkMetricsCollectionAllowed', () => {
    it('should not throw an error when device is online', async () => {
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(true);

      await expect(policy.checkMetricsCollectionAllowed(device)).resolves.not.toThrow();
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });

    it('should throw DeviceAccessDeniedException when device is offline', async () => {
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(false);

      await expect(policy.checkMetricsCollectionAllowed(device))
        .rejects.toThrow(DeviceAccessDeniedException);
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });

    it('should throw DeviceAccessDeniedException when device is in maintenance mode', async () => {
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(true);
      // Change device status to MAINTENANCE
      (device as any).status = DeviceStatus.maintenance();

      await expect(policy.checkMetricsCollectionAllowed(device))
        .rejects.toThrow(DeviceAccessDeniedException);
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });
  });

  describe('checkMetricsCollectionAllowedById', () => {
    it('should not throw an error when device exists and is online', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(device);
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(true);

      await expect(policy.checkMetricsCollectionAllowedById(deviceId, tenantId)).resolves.not.toThrow();
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });

    it('should throw DeviceNotFoundException when device does not exist', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(null);

      await expect(policy.checkMetricsCollectionAllowedById(deviceId, tenantId))
        .rejects.toThrow(DeviceNotFoundException);
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
      expect(mockMetricsCollector.isDeviceOnline).not.toHaveBeenCalled();
    });

    it('should throw DeviceAccessDeniedException when device exists but is offline', async () => {
      const deviceId = DeviceId.create('device-1');
      mockDeviceRepository.findById.mockResolvedValue(device);
      mockMetricsCollector.isDeviceOnline.mockResolvedValue(false);

      await expect(policy.checkMetricsCollectionAllowedById(deviceId, tenantId))
        .rejects.toThrow(DeviceAccessDeniedException);
      expect(mockDeviceRepository.findById).toHaveBeenCalledWith(deviceId, tenantId);
      expect(mockMetricsCollector.isDeviceOnline).toHaveBeenCalledWith(device);
    });
  });

  describe('getCollectionInterval', () => {
    it('should return the default collection interval', () => {
      const interval = policy.getCollectionInterval(device);
      
      // Access the private static property using any
      const defaultInterval = (MetricCollectionPolicy as any).DEFAULT_COLLECTION_INTERVAL;
      expect(interval).toBe(defaultInterval);
    });
  });

  describe('isMetricExceedingThreshold', () => {
    it('should return true when CPU usage exceeds threshold', () => {
      const result = policy.isMetricExceedingThreshold('cpu_usage', 95, device);
      expect(result).toBe(true);
    });

    it('should return false when CPU usage is below threshold', () => {
      const result = policy.isMetricExceedingThreshold('cpu_usage', 85, device);
      expect(result).toBe(false);
    });

    it('should return true when memory usage exceeds threshold', () => {
      const result = policy.isMetricExceedingThreshold('memory_usage', 90, device);
      expect(result).toBe(true);
    });

    it('should return false when memory usage is below threshold', () => {
      const result = policy.isMetricExceedingThreshold('memory_usage', 80, device);
      expect(result).toBe(false);
    });

    it('should return true when disk usage exceeds threshold', () => {
      const result = policy.isMetricExceedingThreshold('disk_usage', 95, device);
      expect(result).toBe(true);
    });

    it('should return false when disk usage is below threshold', () => {
      const result = policy.isMetricExceedingThreshold('disk_usage', 85, device);
      expect(result).toBe(false);
    });

    it('should return true when temperature exceeds threshold', () => {
      const result = policy.isMetricExceedingThreshold('temperature', 85, device);
      expect(result).toBe(true);
    });

    it('should return false when temperature is below threshold', () => {
      const result = policy.isMetricExceedingThreshold('temperature', 75, device);
      expect(result).toBe(false);
    });

    it('should return true when unknown metric exceeds default threshold', () => {
      const result = policy.isMetricExceedingThreshold('unknown_metric', 96, device);
      expect(result).toBe(true);
    });

    it('should return false when unknown metric is below default threshold', () => {
      const result = policy.isMetricExceedingThreshold('unknown_metric', 94, device);
      expect(result).toBe(false);
    });
  });

  describe('getMetricThreshold', () => {
    it('should return the correct threshold for CPU usage', () => {
      // Access private method using any
      const threshold = (policy as any).getMetricThreshold('cpu_usage', device);
      // Access the private static property using any
      const defaultThreshold = (MetricCollectionPolicy as any).DEFAULT_CPU_THRESHOLD;
      expect(threshold).toBe(defaultThreshold);
    });

    it('should return the correct threshold for memory usage', () => {
      // Access private method using any
      const threshold = (policy as any).getMetricThreshold('memory_usage', device);
      // Access the private static property using any
      const defaultThreshold = (MetricCollectionPolicy as any).DEFAULT_MEMORY_THRESHOLD;
      expect(threshold).toBe(defaultThreshold);
    });

    it('should return the correct threshold for disk usage', () => {
      // Access private method using any
      const threshold = (policy as any).getMetricThreshold('disk_usage', device);
      // Access the private static property using any
      const defaultThreshold = (MetricCollectionPolicy as any).DEFAULT_DISK_THRESHOLD;
      expect(threshold).toBe(defaultThreshold);
    });

    it('should return the correct threshold for temperature', () => {
      // Access private method using any
      const threshold = (policy as any).getMetricThreshold('temperature', device);
      // Access the private static property using any
      const defaultThreshold = (MetricCollectionPolicy as any).DEFAULT_TEMPERATURE_THRESHOLD;
      expect(threshold).toBe(defaultThreshold);
    });

    it('should return a high threshold for unknown metrics', () => {
      // Access private method using any
      const threshold = (policy as any).getMetricThreshold('unknown_metric', device);
      expect(threshold).toBe(95);
    });
  });

  describe('shouldTriggerAlert', () => {
    it('should return true when metric exceeds threshold', () => {
      // Mock isMetricExceedingThreshold to return true
      jest.spyOn(policy, 'isMetricExceedingThreshold').mockReturnValue(true);

      const result = policy.shouldTriggerAlert('cpu_usage', 95, device);
      
      expect(result).toBe(true);
      expect(policy.isMetricExceedingThreshold).toHaveBeenCalledWith('cpu_usage', 95, device);
    });

    it('should return false when metric does not exceed threshold', () => {
      // Mock isMetricExceedingThreshold to return false
      jest.spyOn(policy, 'isMetricExceedingThreshold').mockReturnValue(false);

      const result = policy.shouldTriggerAlert('cpu_usage', 85, device);
      
      expect(result).toBe(false);
      expect(policy.isMetricExceedingThreshold).toHaveBeenCalledWith('cpu_usage', 85, device);
    });
  });
});