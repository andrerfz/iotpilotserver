import {Injectable} from '@nestjs/common';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {MetricValue} from '@/lib/monitoring/domain/value-objects/metric-value.vo';
import type {HttpClient} from '@/lib/shared/domain/interfaces/http-client.interface';

@Injectable()
export class PrometheusCollector {
  private readonly prometheusUrl: string;

  constructor(private readonly httpClient: HttpClient) {
    this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
  }

  /**
   * Queries Prometheus for metrics
   * @param query The PromQL query
   * @param timeRange Optional time range (defaults to last 5 minutes)
   * @returns The query result
   */
  async queryMetrics(query: string, timeRange?: { start: number; end: number }): Promise<any> {
    try {
      let url = `${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
      
      if (timeRange) {
        url = `${this.prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${timeRange.start}&end=${timeRange.end}&step=15s`;
      }
      
      const response = await this.httpClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to query Prometheus:', error);
      throw new Error('Failed to query metrics from Prometheus');
    }
  }

  /**
   * Gets CPU usage for a specific device
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @returns The CPU usage as a MetricValue
   */
  async getCpuUsage(deviceId: DeviceId, customerId: CustomerId): Promise<MetricValue> {
      const query = `node_cpu_seconds_total{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", mode="idle"}`;
    const result = await this.queryMetrics(query);
    
    if (result.status === 'success' && result.data.result.length > 0) {
      // Calculate CPU usage from idle time
      const idleValue = parseFloat(result.data.result[0].value[1]);
      const cpuUsage = 100 - (idleValue * 100);
      return MetricValue.create(cpuUsage, 'percent');
    }
    
    return MetricValue.create(0, 'percent');
  }

  /**
   * Gets memory usage for a specific device
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @returns The memory usage as a MetricValue
   */
  async getMemoryUsage(deviceId: DeviceId, customerId: CustomerId): Promise<MetricValue> {
    const totalMemQuery = `node_memory_MemTotal_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}"}`;
    const freeMemQuery = `node_memory_MemFree_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}"}`;
    
    const totalMemResult = await this.queryMetrics(totalMemQuery);
    const freeMemResult = await this.queryMetrics(freeMemQuery);
    
    if (
      totalMemResult.status === 'success' && 
      totalMemResult.data.result.length > 0 &&
      freeMemResult.status === 'success' && 
      freeMemResult.data.result.length > 0
    ) {
      const totalMem = parseFloat(totalMemResult.data.result[0].value[1]);
      const freeMem = parseFloat(freeMemResult.data.result[0].value[1]);
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      
      return MetricValue.create(memoryUsage, 'percent');
    }
    
    return MetricValue.create(0, 'percent');
  }

  /**
   * Gets disk usage for a specific device
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @returns The disk usage as a MetricValue
   */
  async getDiskUsage(deviceId: DeviceId, customerId: CustomerId): Promise<MetricValue> {
    const totalDiskQuery = `node_filesystem_size_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", mountpoint="/"}`;
    const freeDiskQuery = `node_filesystem_free_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", mountpoint="/"}`;
    
    const totalDiskResult = await this.queryMetrics(totalDiskQuery);
    const freeDiskResult = await this.queryMetrics(freeDiskQuery);
    
    if (
      totalDiskResult.status === 'success' && 
      totalDiskResult.data.result.length > 0 &&
      freeDiskResult.status === 'success' && 
      freeDiskResult.data.result.length > 0
    ) {
      const totalDisk = parseFloat(totalDiskResult.data.result[0].value[1]);
      const freeDisk = parseFloat(freeDiskResult.data.result[0].value[1]);
      const diskUsage = ((totalDisk - freeDisk) / totalDisk) * 100;
      
      return MetricValue.create(diskUsage, 'percent');
    }
    
    return MetricValue.create(0, 'percent');
  }

  /**
   * Gets temperature for a specific device
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @returns The temperature as a MetricValue
   */
  async getTemperature(deviceId: DeviceId, customerId: CustomerId): Promise<MetricValue> {
    const query = `node_thermal_zone_temp{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}"}`;
    const result = await this.queryMetrics(query);
    
    if (result.status === 'success' && result.data.result.length > 0) {
      const temperature = parseFloat(result.data.result[0].value[1]);
      return MetricValue.create(temperature, 'celsius');
    }
    
    return MetricValue.create(0, 'celsius');
  }

  /**
   * Gets network traffic for a specific device
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @param interface The network interface (defaults to eth0)
   * @returns The network traffic metrics
   */
  async getNetworkTraffic(
    deviceId: DeviceId, 
    customerId: CustomerId, 
    networkInterface: string = 'eth0'
  ): Promise<{ received: MetricValue; transmitted: MetricValue }> {
    const receivedQuery = `node_network_receive_bytes_total{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", device="${networkInterface}"}`;
    const transmittedQuery = `node_network_transmit_bytes_total{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", device="${networkInterface}"}`;
    
    const receivedResult = await this.queryMetrics(receivedQuery);
    const transmittedResult = await this.queryMetrics(transmittedQuery);
    
    const received = receivedResult.status === 'success' && receivedResult.data.result.length > 0
      ? MetricValue.create(parseFloat(receivedResult.data.result[0].value[1]), 'bytes')
      : MetricValue.create(0, 'bytes');
      
    const transmitted = transmittedResult.status === 'success' && transmittedResult.data.result.length > 0
      ? MetricValue.create(parseFloat(transmittedResult.data.result[0].value[1]), 'bytes')
      : MetricValue.create(0, 'bytes');
    
    return { received, transmitted };
  }

  /**
   * Gets all system metrics for a specific device
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @returns All system metrics
   */
  async getAllSystemMetrics(deviceId: DeviceId, customerId: CustomerId): Promise<{
    cpuUsage: MetricValue;
    memoryUsage: MetricValue;
    diskUsage: MetricValue;
    temperature: MetricValue;
    network: { received: MetricValue; transmitted: MetricValue };
  }> {
    const [cpuUsage, memoryUsage, diskUsage, temperature, network] = await Promise.all([
      this.getCpuUsage(deviceId, customerId),
      this.getMemoryUsage(deviceId, customerId),
      this.getDiskUsage(deviceId, customerId),
      this.getTemperature(deviceId, customerId),
      this.getNetworkTraffic(deviceId, customerId)
    ]);
    
    return {
      cpuUsage,
      memoryUsage,
      diskUsage,
      temperature,
      network
    };
  }

  /**
   * Gets metrics history for a specific device
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @param metricName The metric name
   * @param timeRange The time range
   * @returns The metrics history
   */
  async getMetricsHistory(
    deviceId: DeviceId,
    customerId: CustomerId,
    metricName: string,
    timeRange: { start: number; end: number }
  ): Promise<MetricValue[]> {
    let query: string;
    
    switch (metricName) {
      case 'cpu_usage':
        query = `100 - (avg by (instance) (rate(node_cpu_seconds_total{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", mode="idle"}[5m])) * 100)`;
        break;
      case 'memory_usage':
        query = `(1 - (node_memory_MemFree_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}"} / node_memory_MemTotal_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}"})) * 100`;
        break;
      case 'disk_usage':
        query = `(1 - (node_filesystem_free_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", mountpoint="/"} / node_filesystem_size_bytes{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}", mountpoint="/"})) * 100`;
        break;
      case 'temperature':
        query = `node_thermal_zone_temp{device_id="${deviceId.getValue()}", customer_id="${customerId.getValue()}"}`;
        break;
      default:
        throw new Error(`Unsupported metric: ${metricName}`);
    }
    
    const result = await this.queryMetrics(query, timeRange);
    
    if (result.status === 'success' && result.data.result.length > 0) {
      const values = result.data.result[0].values;
      return values.map((value: [number, string]) => {
        return MetricValue.create(
          parseFloat(value[1]), 
          metricName === 'temperature' ? 'celsius' : 'percent'
        );
      });
    }
    
    return [];
  }
}