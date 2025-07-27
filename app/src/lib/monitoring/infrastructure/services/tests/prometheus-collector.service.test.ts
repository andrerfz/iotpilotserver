import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {PrometheusCollector} from '../prometheus-collector.service';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {HttpClient} from '@/lib/shared/domain/interfaces/http-client.interface';

/// <reference types="node" />

describe('PrometheusCollector', () => {
  let prometheusCollector: PrometheusCollector;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.PROMETHEUS_URL;

    // Create mock HttpClient
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.clearAllMocks();

    prometheusCollector = new PrometheusCollector(mockHttpClient);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.PROMETHEUS_URL;
  });

  describe('constructor', () => {
    it('should initialize with default Prometheus URL', () => {
      const collector = new PrometheusCollector(mockHttpClient);
      expect(collector).toBeInstanceOf(PrometheusCollector);
    });

    it('should initialize with custom Prometheus URL from environment', () => {
      process.env.PROMETHEUS_URL = 'http://custom-prometheus:9090';
      const collector = new PrometheusCollector(mockHttpClient);
      expect(collector).toBeInstanceOf(PrometheusCollector);
    });
  });

  describe('queryMetrics', () => {
    it('should query Prometheus instant query successfully', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: { __name__: 'node_cpu_seconds_total', device_id: 'device-1' },
              value: [1672569600, '123.45']
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockResponse, status: 200, statusText: 'OK', headers: {} });

      const result = await prometheusCollector.queryMetrics('up');

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.get).toHaveBeenCalledWith('http://prometheus:9090/api/v1/query?query=up');
    });

    it('should query Prometheus range query when timeRange is provided', async () => {
      const timeRange = { start: 1672569600, end: 1672573200 };
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: []
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockResponse, status: 200, statusText: 'OK', headers: {} });

      const result = await prometheusCollector.queryMetrics('up', timeRange);

      expect(result).toEqual(mockResponse);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://prometheus:9090/api/v1/query_range?query=up&start=1672569600&end=1672573200&step=15s'
      );
    });

    it('should handle Prometheus API errors', async () => {
      (mockHttpClient.get as any).mockRejectedValue(new Error('Prometheus API error'));

      await expect(prometheusCollector.queryMetrics('up')).rejects.toThrow(
        'Failed to query metrics from Prometheus'
      );
    });

    it('should use custom Prometheus URL from environment', async () => {
      process.env.PROMETHEUS_URL = 'http://custom-prometheus:9090';
      const collector = new PrometheusCollector(mockHttpClient);

      (mockHttpClient.get as any).mockResolvedValue({ data: { status: 'success' }, status: 200, statusText: 'OK', headers: {} });

      await collector.queryMetrics('up');

      expect(mockHttpClient.get).toHaveBeenCalledWith('http://custom-prometheus:9090/api/v1/query?query=up');
    });
  });

  describe('getCpuUsage', () => {
    it('should return CPU usage for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      const mockPrometheusResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1' },
              value: [1672569600, '0.8'] // 80% idle = 20% usage
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} });

      const result = await prometheusCollector.getCpuUsage(deviceId, customerId);

      expect(result.getValue()).toBe(20);
      expect(result.getUnit()).toBe('percent');
    });

    it('should throw error when no CPU data available', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      const mockPrometheusResponse = {
        status: 'success',
        data: {
          result: []
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} });

      await expect(prometheusCollector.getCpuUsage(deviceId, customerId)).rejects.toThrow(
        'No CPU usage data available for device device-1'
      );
    });

    it('should handle Prometheus query errors', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      (mockHttpClient.get as any).mockRejectedValue(new Error('Query failed'));

      await expect(prometheusCollector.getCpuUsage(deviceId, customerId)).rejects.toThrow(
        'Failed to query metrics from Prometheus'
      );
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      const mockPrometheusResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1' },
              value: [1672569600, '1073741824'] // 1GB used
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValueOnce({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} }) // Used memory
                        .mockResolvedValueOnce({ data: mockPrometheusResponse }); // Total memory

      const result = await prometheusCollector.getMemoryUsage(deviceId, customerId);

      expect(result.getValue()).toBe(100);
      expect(result.getUnit()).toBe('percent');
    });

    it('should throw error when memory data is incomplete', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      (mockHttpClient.get as any).mockResolvedValue({ data: { status: 'success', data: { result: [] } }, status: 200, statusText: 'OK', headers: {} });

      await expect(prometheusCollector.getMemoryUsage(deviceId, customerId)).rejects.toThrow(
        'Incomplete memory data for device device-1'
      );
    });
  });

  describe('getDiskUsage', () => {
    it('should return disk usage for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      const mockPrometheusResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1', mountpoint: '/' },
              value: [1672569600, '5368709120'] // 5GB used
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValueOnce({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} }) // Used disk
                        .mockResolvedValueOnce({ data: mockPrometheusResponse }); // Total disk

      const result = await prometheusCollector.getDiskUsage(deviceId, customerId);

      expect(result.getValue()).toBe(100);
      expect(result.getUnit()).toBe('percent');
    });
  });

  describe('getSystemLoad', () => {
    it('should return system load for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      const mockPrometheusResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1' },
              value: [1672569600, '2.5']
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} });

      const result = await prometheusCollector.getSystemLoad(deviceId, customerId);

      expect(result.getValue()).toBe(2.5);
      expect(result.getUnit()).toBe('load');
    });
  });

  describe('getNetworkTraffic', () => {
    it('should return network traffic for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      const mockPrometheusResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1', device: 'eth0' },
              value: [1672569600, '1048576'] // 1MB
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} });

      const result = await prometheusCollector.getNetworkTraffic(deviceId, customerId);

      expect(result.getValue()).toBe(1048576);
      expect(result.getUnit()).toBe('bytes');
    });
  });

  describe('getTemperature', () => {
    it('should return temperature for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      const mockPrometheusResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1' },
              value: [1672569600, '45.2']
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} });

      const result = await prometheusCollector.getTemperature(deviceId, customerId);

      expect(result.getValue()).toBe(45.2);
      expect(result.getUnit()).toBe('celsius');
    });
  });

  describe('getAllMetricsForDevice', () => {
    it('should return comprehensive metrics for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      // Mock all the individual metric queries
      const mockMetricResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1' },
              value: [1672569600, '50']
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({ data: mockMetricResponse, status: 200, statusText: 'OK', headers: {} });

      const result = await prometheusCollector.getAllMetricsForDevice(deviceId, customerId);

      expect(result).toHaveProperty('cpuUsage');
      expect(result).toHaveProperty('memoryUsage');
      expect(result).toHaveProperty('diskUsage');
      expect(result).toHaveProperty('systemLoad');
      expect(result).toHaveProperty('networkTraffic');
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle partial metric failures gracefully', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('tenant-1');

      // Mock CPU to succeed, memory to fail
      const mockSuccessResponse = {
        status: 'success',
        data: { result: [{ value: [1672569600, '50'] }] }
      };

      const mockFailureResponse = {
        status: 'success',
        data: { result: [] }
      };

      (mockHttpClient.get as any).mockResolvedValueOnce({ data: mockSuccessResponse, status: 200, statusText: 'OK', headers: {} }) // CPU
                        .mockResolvedValueOnce({ data: mockFailureResponse }) // Memory used
                        .mockResolvedValueOnce({ data: mockFailureResponse }); // Memory total

      const result = await prometheusCollector.getAllMetricsForDevice(deviceId, customerId);

      expect(result.cpuUsage).toBeDefined();
      expect(result.memoryUsage).toBeUndefined(); // Should be undefined due to missing data
    });
  });

  describe('error handling', () => {
    it('should log errors when Prometheus queries fail', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (mockHttpClient.get as any).mockRejectedValue(new Error('Network error'));

      await expect(prometheusCollector.queryMetrics('up')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to query Prometheus:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
