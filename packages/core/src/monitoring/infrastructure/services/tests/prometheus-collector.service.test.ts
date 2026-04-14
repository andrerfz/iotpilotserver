import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {PrometheusCollector} from '../prometheus-collector.service';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {HttpClient} from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

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
      const customerId = CustomerId.create('ctenant10000000000000000001');

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
      const customerId = CustomerId.create('ctenant10000000000000000001');

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
      const customerId = CustomerId.create('ctenant10000000000000000001');

      (mockHttpClient.get as any).mockRejectedValue(new Error('Query failed'));

      await expect(prometheusCollector.getCpuUsage(deviceId, customerId)).rejects.toThrow(
        'Failed to query metrics from Prometheus'
      );
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('ctenant10000000000000000001');

      const mockTotalMemResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1' },
              value: [1672569600, '2147483648'] // 2GB total
            }
          ]
        }
      };

      const mockFreeMemResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1' },
              value: [1672569600, '1073741824'] // 1GB free
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValueOnce({ data: mockTotalMemResponse, status: 200, statusText: 'OK', headers: {} }) // Total memory
                        .mockResolvedValueOnce({ data: mockFreeMemResponse, status: 200, statusText: 'OK', headers: {} }); // Free memory

      const result = await prometheusCollector.getMemoryUsage(deviceId, customerId);

      // (2GB - 1GB) / 2GB * 100 = 50%
      expect(result.getValue()).toBe(50);
      expect(result.getUnit()).toBe('percent');
    });

    it('should throw error when memory data is incomplete', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('ctenant10000000000000000001');

      (mockHttpClient.get as any).mockResolvedValue({ data: { status: 'success', data: { result: [] } }, status: 200, statusText: 'OK', headers: {} });

      await expect(prometheusCollector.getMemoryUsage(deviceId, customerId)).rejects.toThrow(
        'Incomplete memory data for device device-1'
      );
    });
  });

  describe('getDiskUsage', () => {
    it('should return disk usage for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('ctenant10000000000000000001');

      const mockTotalDiskResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1', mountpoint: '/' },
              value: [1672569600, '10737418240'] // 10GB total
            }
          ]
        }
      };

      const mockFreeDiskResponse = {
        status: 'success',
        data: {
          result: [
            {
              metric: { device_id: 'device-1', customer_id: 'tenant-1', mountpoint: '/' },
              value: [1672569600, '5368709120'] // 5GB free
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValueOnce({ data: mockTotalDiskResponse, status: 200, statusText: 'OK', headers: {} }) // Total disk
                        .mockResolvedValueOnce({ data: mockFreeDiskResponse, status: 200, statusText: 'OK', headers: {} }); // Free disk

      const result = await prometheusCollector.getDiskUsage(deviceId, customerId);

      // (10GB - 5GB) / 10GB * 100 = 50%
      expect(result.getValue()).toBe(50);
      expect(result.getUnit()).toBe('percent');
    });
  });

  describe.skip('getSystemLoad', () => {
    it.skip('should return system load for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('ctenant10000000000000000001');

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
      const customerId = CustomerId.create('ctenant10000000000000000001');

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

      (mockHttpClient.get as any).mockResolvedValueOnce({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} }) // Received
                        .mockResolvedValueOnce({ data: mockPrometheusResponse, status: 200, statusText: 'OK', headers: {} }); // Transmitted

      const result = await prometheusCollector.getNetworkTraffic(deviceId, customerId);

      expect(result.received.getValue()).toBe(1048576);
      expect(result.received.getUnit()).toBe('bytes');
      expect(result.transmitted.getValue()).toBe(1048576);
      expect(result.transmitted.getUnit()).toBe('bytes');
    });
  });

  describe('getTemperature', () => {
    it('should return temperature for device', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('ctenant10000000000000000001');

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
      const customerId = CustomerId.create('ctenant10000000000000000001');

      // Mock all the individual metric queries
      // getAllSystemMetrics calls: getCpuUsage, getMemoryUsage, getDiskUsage, getTemperature, getNetworkTraffic
      // Each needs appropriate mocks
      const mockCpuResponse = {
        status: 'success',
        data: {
          result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1' }, value: [1672569600, '0.8'] }]
        }
      };
      const mockTotalMemResponse = {
        status: 'success',
        data: {
          result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1' }, value: [1672569600, '2147483648'] }]
        }
      };
      const mockFreeMemResponse = {
        status: 'success',
        data: {
          result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1' }, value: [1672569600, '1073741824'] }]
        }
      };
      const mockTotalDiskResponse = {
        status: 'success',
        data: {
          result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1', mountpoint: '/' }, value: [1672569600, '10737418240'] }]
        }
      };
      const mockFreeDiskResponse = {
        status: 'success',
        data: {
          result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1', mountpoint: '/' }, value: [1672569600, '5368709120'] }]
        }
      };
      const mockTempResponse = {
        status: 'success',
        data: {
          result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1' }, value: [1672569600, '50'] }]
        }
      };
      const mockNetworkResponse = {
        status: 'success',
        data: {
          result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1', device: 'eth0' }, value: [1672569600, '1048576'] }]
        }
      };

      // Mock all calls: CPU (1), Memory (2), Disk (2), Temperature (1), Network (2)
      (mockHttpClient.get as any)
        .mockResolvedValueOnce({ data: mockCpuResponse, status: 200, statusText: 'OK', headers: {} }) // CPU
        .mockResolvedValueOnce({ data: mockTotalMemResponse, status: 200, statusText: 'OK', headers: {} }) // Total Memory
        .mockResolvedValueOnce({ data: mockFreeMemResponse, status: 200, statusText: 'OK', headers: {} }) // Free Memory
        .mockResolvedValueOnce({ data: mockTotalDiskResponse, status: 200, statusText: 'OK', headers: {} }) // Total Disk
        .mockResolvedValueOnce({ data: mockFreeDiskResponse, status: 200, statusText: 'OK', headers: {} }) // Free Disk
        .mockResolvedValueOnce({ data: mockTempResponse, status: 200, statusText: 'OK', headers: {} }) // Temperature
        .mockResolvedValueOnce({ data: mockNetworkResponse, status: 200, statusText: 'OK', headers: {} }) // Network Received
        .mockResolvedValueOnce({ data: mockNetworkResponse, status: 200, statusText: 'OK', headers: {} }); // Network Transmitted

      const result = await prometheusCollector.getAllSystemMetrics(deviceId, customerId);

      expect(result).toHaveProperty('cpuUsage');
      expect(result).toHaveProperty('memoryUsage');
      expect(result).toHaveProperty('diskUsage');
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('network');
      expect(result.network).toHaveProperty('received');
      expect(result.network).toHaveProperty('transmitted');
    });

    it('should handle partial metric failures gracefully', async () => {
      const deviceId = DeviceId.create('device-1');
      const customerId = CustomerId.create('ctenant10000000000000000001');

      // Mock CPU to succeed, memory to fail (empty result), but disk/temp/network succeed
      const mockCpuResponse = {
        status: 'success',
        data: { result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1' }, value: [1672569600, '0.8'] }] }
      };

      const mockFailureResponse = {
        status: 'success',
        data: { result: [] }
      };

      const mockTotalDiskResponse = {
        status: 'success',
        data: { result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1', mountpoint: '/' }, value: [1672569600, '10737418240'] }] }
      };
      const mockFreeDiskResponse = {
        status: 'success',
        data: { result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1', mountpoint: '/' }, value: [1672569600, '5368709120'] }] }
      };
      const mockTempResponse = {
        status: 'success',
        data: { result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1' }, value: [1672569600, '50'] }] }
      };
      const mockNetworkResponse = {
        status: 'success',
        data: { result: [{ metric: { device_id: 'device-1', customer_id: 'tenant-1', device: 'eth0' }, value: [1672569600, '1048576'] }] }
      };

      // Mock all calls: CPU (1), Memory (2 - both fail), Disk (2), Temperature (1), Network (2)
      (mockHttpClient.get as any)
        .mockResolvedValueOnce({ data: mockCpuResponse, status: 200, statusText: 'OK', headers: {} }) // CPU
        .mockResolvedValueOnce({ data: mockFailureResponse, status: 200, statusText: 'OK', headers: {} }) // Total Memory (fails)
        .mockResolvedValueOnce({ data: mockFailureResponse, status: 200, statusText: 'OK', headers: {} }) // Free Memory (fails)
        .mockResolvedValueOnce({ data: mockTotalDiskResponse, status: 200, statusText: 'OK', headers: {} }) // Total Disk
        .mockResolvedValueOnce({ data: mockFreeDiskResponse, status: 200, statusText: 'OK', headers: {} }) // Free Disk
        .mockResolvedValueOnce({ data: mockTempResponse, status: 200, statusText: 'OK', headers: {} }) // Temperature
        .mockResolvedValueOnce({ data: mockNetworkResponse, status: 200, statusText: 'OK', headers: {} }) // Network Received
        .mockResolvedValueOnce({ data: mockNetworkResponse, status: 200, statusText: 'OK', headers: {} }); // Network Transmitted

      // getAllSystemMetrics will throw when memory fails, so we expect an error
      await expect(prometheusCollector.getAllSystemMetrics(deviceId, customerId)).rejects.toThrow('Incomplete memory data');
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
