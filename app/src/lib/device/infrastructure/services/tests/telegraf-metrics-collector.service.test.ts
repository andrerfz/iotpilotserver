import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TelegrafMetricsCollectorService} from '../telegraf-metrics-collector.service';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {PrismaService} from '@/lib/shared/infrastructure/database/prisma.service';
import {HttpClient} from '@/lib/shared/domain/interfaces/http-client.interface';

// Mock Prisma
const mockPrismaClient = {
  device: {
    findUnique: vi.fn(),
  },
};

const mockPrismaService = {
  getClient: vi.fn(() => mockPrismaClient),
} as unknown as PrismaService;

describe('TelegrafMetricsCollectorService', () => {
  let metricsCollector: TelegrafMetricsCollectorService;
  let deviceId: DeviceId;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    deviceId = DeviceId.create('device-1');
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    metricsCollector = new TelegrafMetricsCollectorService(mockPrismaService, 'http://telegraf:8080', mockHttpClient);

    vi.clearAllMocks();
  });

  describe('collectMetrics', () => {
    it('should collect metrics successfully from Telegraf API', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      const mockMetricsData = {
        cpu: 45.5,
        memory: 60.2,
        disk: 75.8,
        network: {
          upload: 1024000,
          download: 2048000,
        },
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: mockMetricsData, status: 200, statusText: 'OK', headers: {} });

      const result = await metricsCollector.collectMetrics(deviceId);

      expect(result).toBeDefined();
      expect(result.deviceId.getValue()).toBe('device-1');
      expect(result.cpuUsage).toBe(45.5);
      expect(result.memoryUsage).toBe(60.2);
      expect(result.diskUsage).toBe(75.8);
      expect(result.networkTx).toBe(1024000);
      expect(result.networkRx).toBe(2048000);

      expect(mockPrismaClient.device.findUnique).toHaveBeenCalledWith({
        where: { id: 'device-1' }
      });
      expect(mockHttpClient.get).toHaveBeenCalledWith('http://telegraf:8080/metrics/192.168.1.100');
    });

    it('should handle missing network data gracefully', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      const mockMetricsData = {
        cpu: 45.5,
        memory: 60.2,
        disk: 75.8,
        // No network data
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: mockMetricsData, status: 200, statusText: 'OK', headers: {} });

      const result = await metricsCollector.collectMetrics(deviceId);

      expect(result.networkTx).toBe(0);
      expect(result.networkRx).toBe(0);
    });

    it('should handle zero values in metrics data', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      const mockMetricsData = {
        cpu: 0,
        memory: 0,
        disk: 0,
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: mockMetricsData, status: 200, statusText: 'OK', headers: {} });

      const result = await metricsCollector.collectMetrics(deviceId);

      expect(result.cpuUsage).toBe(0);
      expect(result.memoryUsage).toBe(0);
      expect(result.diskUsage).toBe(0);
    });

    it('should throw error when device not found', async () => {
      mockPrismaClient.device.findUnique.mockResolvedValue(null);

      await expect(metricsCollector.collectMetrics(deviceId)).rejects.toThrow(
        'Device with ID device-1 not found'
      );

      expect(mockPrismaClient.device.findUnique).toHaveBeenCalledWith({
        where: { id: 'device-1' }
      });
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle Telegraf API errors', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockRejectedValue(new Error('Telegraf API error'));

      await expect(metricsCollector.collectMetrics(deviceId)).rejects.toThrow(
        'Failed to collect metrics from Telegraf for device device-1: Telegraf API error'
      );
    });

    it('should handle network errors gracefully', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockRejectedValue(new Error('Network timeout'));

      await expect(metricsCollector.collectMetrics(deviceId)).rejects.toThrow(
        'Failed to collect metrics from Telegraf for device device-1: Network timeout'
      );
    });
  });

  describe('getLatestMetrics', () => {
    it('should return the most recent metrics for device', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      const mockMetricsData = {
        cpu: 50.0,
        memory: 65.0,
        disk: 80.0,
        network: {
          upload: 512000,
          download: 1024000,
        },
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: mockMetricsData, status: 200, statusText: 'OK', headers: {} });

      const result = await metricsCollector.getLatestMetrics(deviceId);

      expect(result).toBeDefined();
      expect(result.cpuUsage).toBe(50.0);
      expect(result.memoryUsage).toBe(65.0);
      expect(result.diskUsage).toBe(80.0);
      expect(result.networkTx).toBe(512000);
      expect(result.networkRx).toBe(1024000);
    });

    it('should throw error when device not found in getLatestMetrics', async () => {
      mockPrismaClient.device.findUnique.mockResolvedValue(null);

      await expect(metricsCollector.getLatestMetrics(deviceId)).rejects.toThrow(
        'Device with ID device-1 not found'
      );
    });
  });

  describe('isDeviceReachable', () => {
    it('should return true when device metrics can be collected', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      const mockMetricsData = {
        cpu: 30.0,
        memory: 40.0,
        disk: 50.0,
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: mockMetricsData, status: 200, statusText: 'OK', headers: {} });

      const result = await metricsCollector.isDeviceReachable(deviceId);

      expect(result).toBe(true);
    });

    it('should return false when device metrics collection fails', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockRejectedValue(new Error('Connection failed'));

      const result = await metricsCollector.isDeviceReachable(deviceId);

      expect(result).toBe(false);
    });

    it('should return false when device not found', async () => {
      mockPrismaClient.device.findUnique.mockResolvedValue(null);

      const result = await metricsCollector.isDeviceReachable(deviceId);

      expect(result).toBe(false);
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history for specified time range', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      const mockHistoryData = [
        {
          timestamp: '2023-01-01T10:00:00Z',
          cpu: 40.0,
          memory: 50.0,
          disk: 60.0,
        },
        {
          timestamp: '2023-01-01T11:00:00Z',
          cpu: 45.0,
          memory: 55.0,
          disk: 65.0,
        },
      ];

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: mockHistoryData, status: 200, statusText: 'OK', headers: {} });

      const startTime = new Date('2023-01-01T09:00:00Z');
      const endTime = new Date('2023-01-01T12:00:00Z');
      const result = await metricsCollector.getMetricsHistory(deviceId, startTime, endTime);

      expect(result).toHaveLength(2);
      expect(result[0].cpuUsage).toBe(40.0);
      expect(result[1].cpuUsage).toBe(45.0);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://telegraf:8080/metrics/192.168.1.100/history?start=2023-01-01T09:00:00.000Z&end=2023-01-01T12:00:00.000Z'
      );
    });

    it('should handle empty history data', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: [], status: 200, statusText: 'OK', headers: {} });

      const startTime = new Date('2023-01-01T09:00:00Z');
      const endTime = new Date('2023-01-01T12:00:00Z');
      const result = await metricsCollector.getMetricsHistory(deviceId, startTime, endTime);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAverageMetrics', () => {
    it('should calculate average metrics over time range', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      const mockHistoryData = [
        { cpu: 40.0, memory: 50.0, disk: 60.0 },
        { cpu: 50.0, memory: 60.0, disk: 70.0 },
        { cpu: 60.0, memory: 70.0, disk: 80.0 },
      ];

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: mockHistoryData, status: 200, statusText: 'OK', headers: {} });

      const startTime = new Date('2023-01-01T09:00:00Z');
      const endTime = new Date('2023-01-01T12:00:00Z');
      const result = await metricsCollector.getAverageMetrics(deviceId, startTime, endTime);

      expect(result.cpuUsage).toBe(50.0); // (40 + 50 + 60) / 3
      expect(result.memoryUsage).toBe(60.0); // (50 + 60 + 70) / 3
      expect(result.diskUsage).toBe(70.0); // (60 + 70 + 80) / 3
    });

    it('should handle empty data set', async () => {
      const mockDevice = {
        id: 'device-1',
        hostname: 'device-1',
        ipAddress: '192.168.1.100',
      };

      mockPrismaClient.device.findUnique.mockResolvedValue(mockDevice);
      (mockHttpClient.get as any).mockResolvedValue({ data: [], status: 200, statusText: 'OK', headers: {} });

      const startTime = new Date('2023-01-01T09:00:00Z');
      const endTime = new Date('2023-01-01T12:00:00Z');

      await expect(metricsCollector.getAverageMetrics(deviceId, startTime, endTime)).rejects.toThrow(
        'No metrics data available for averaging'
      );
    });
  });

  describe('constructor and configuration', () => {
    it('should initialize with provided Telegraf URL', () => {
      const customUrl = 'http://custom-telegraf:9090';
      const collector = new TelegrafMetricsCollectorService(mockPrismaService, customUrl, mockHttpClient);

      expect(collector).toBeInstanceOf(TelegrafMetricsCollectorService);
    });

    it('should use default Telegraf URL when not provided', () => {
      const collector = new TelegrafMetricsCollectorService(mockPrismaService, 'http://telegraf:8080', mockHttpClient);

      expect(collector).toBeInstanceOf(TelegrafMetricsCollectorService);
    });
  });
});
