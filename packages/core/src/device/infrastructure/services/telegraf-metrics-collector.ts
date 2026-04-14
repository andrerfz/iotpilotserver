import {MetricsCollector} from '@iotpilot/core/device/domain/interfaces/metrics-collector.interface';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceMetrics} from '@iotpilot/core/device/domain/entities/device-metrics.entity';
import {InfluxDB, Point} from '@influxdata/influxdb-client';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device-repository.interface';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

/**
 * Implementation of MetricsCollector using Telegraf and InfluxDB
 */
export class TelegrafMetricsCollector implements MetricsCollector {
  private readonly influxClient: InfluxDB;
  private readonly org: string;
  private readonly bucket: string;
  private readonly queryApi: any;
  private readonly writeApi: any;

  constructor(
    private readonly deviceRepository: DeviceRepository,
    influxUrl: string,
    influxToken: string,
    org: string,
    bucket: string
  ) {
    this.influxClient = new InfluxDB({ url: influxUrl, token: influxToken });
    this.org = org;
    this.bucket = bucket;
    this.queryApi = this.influxClient.getQueryApi(this.org);
    this.writeApi = this.influxClient.getWriteApi(this.org, this.bucket, 'ns');
  }

  async collectMetrics(deviceId: DeviceId): Promise<DeviceMetrics> {
    // Find the device to get its IP address
    const device = await this.deviceRepository.findById(deviceId);
    
    if (!device) {
      throw new Error(`Device with ID ${deviceId.getValue()} not found`);
    }
    
    // Query the latest metrics for this device from InfluxDB
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -1m)
        |> filter(fn: (r) => r._measurement == "device_metrics")
        |> filter(fn: (r) => r.device_id == "${deviceId.getValue()}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> limit(n: 1)
    `;
    
    try {
      const result = await this.queryApi.collectRows(query);
      
      // Get customerId from device
      const customerId = device.getCustomerId();
      if (!customerId) {
        throw new Error(`Device ${deviceId.getValue()} does not have a customer ID`);
      }
      
      if (result.length === 0) {
        // No metrics found, return default metrics
        return this.createDefaultMetrics(deviceId, customerId);
      }
      
      const latestMetrics = result[0];
      
      // Create metrics entity
      return DeviceMetrics.create({
        deviceId,
        customerId,
        cpuUsage: parseFloat(latestMetrics.cpu_usage) || 0,
        memoryUsage: parseFloat(latestMetrics.memory_usage) || 0,
        diskUsage: parseFloat(latestMetrics.disk_usage) || 0,
        networkRx: parseFloat(latestMetrics.network_traffic) / 2 || 0,
        networkTx: parseFloat(latestMetrics.network_traffic) / 2 || 0,
        uptime: 0,
        loadAverage: [],
        temperature: parseFloat(latestMetrics.temperature) || undefined,
        collectedAt: new Date(latestMetrics._time)
      });
    } catch (error) {
      console.error(`Error collecting metrics for device ${deviceId.getValue()}:`, error);
      // Return default metrics on error - need customerId
      const customerId = device.getCustomerId();
      if (!customerId) {
        throw new Error(`Device ${deviceId.getValue()} does not have a customer ID`);
      }
      return this.createDefaultMetrics(deviceId, customerId);
    }
  }
  
  async collectMetricsForAllDevices(): Promise<DeviceMetrics[]> {
    // Get all devices
    const devices = await this.deviceRepository.findAll();
    
    // Collect metrics for each device
    const metricsPromises = devices.map(device => this.collectMetrics(device.id));
    
    return Promise.all(metricsPromises);
  }
  
  async getLatestMetrics(deviceId: DeviceId): Promise<DeviceMetrics | null> {
    // Find the device to get customerId
    const device = await this.deviceRepository.findById(deviceId);
    
    if (!device) {
      return null;
    }
    
    const customerId = device.getCustomerId();
    if (!customerId) {
      return null;
    }
    
    // Query the latest metrics for this device from InfluxDB
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "device_metrics")
        |> filter(fn: (r) => r.device_id == "${deviceId.getValue()}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> limit(n: 1)
    `;
    
    try {
      const result = await this.queryApi.collectRows(query);
      
      if (result.length === 0) {
        return null;
      }
      
      const latestMetrics = result[0];
      
      // Create metrics entity
      return DeviceMetrics.create({
        deviceId,
        customerId,
        cpuUsage: parseFloat(latestMetrics.cpu_usage) || 0,
        memoryUsage: parseFloat(latestMetrics.memory_usage) || 0,
        diskUsage: parseFloat(latestMetrics.disk_usage) || 0,
        networkRx: parseFloat(latestMetrics.network_traffic) / 2 || 0,
        networkTx: parseFloat(latestMetrics.network_traffic) / 2 || 0,
        uptime: 0,
        loadAverage: [],
        temperature: parseFloat(latestMetrics.temperature) || undefined,
        collectedAt: new Date(latestMetrics._time)
      });
    } catch (error) {
      console.error(`Error getting latest metrics for device ${deviceId.getValue()}:`, error);
      return null;
    }
  }
  
  async getMetricsHistory(
    deviceId: DeviceId,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceMetrics[]> {
    // Find the device to get customerId
    const device = await this.deviceRepository.findById(deviceId);
    
    if (!device) {
      return [];
    }
    
    const customerId = device.getCustomerId();
    if (!customerId) {
      return [];
    }
    
    // Query metrics history for this device from InfluxDB
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startDate.toISOString()}, stop: ${endDate.toISOString()})
        |> filter(fn: (r) => r._measurement == "device_metrics")
        |> filter(fn: (r) => r.device_id == "${deviceId.getValue()}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;
    
    try {
      const result = await this.queryApi.collectRows(query);
      
      // Map results to metrics entities
      return result.map((metrics: any) => DeviceMetrics.create({
        deviceId,
        customerId,
        cpuUsage: parseFloat(metrics.cpu_usage) || 0,
        memoryUsage: parseFloat(metrics.memory_usage) || 0,
        diskUsage: parseFloat(metrics.disk_usage) || 0,
        networkRx: parseFloat(metrics.network_traffic) / 2 || 0,
        networkTx: parseFloat(metrics.network_traffic) / 2 || 0,
        uptime: 0,
        loadAverage: [],
        temperature: parseFloat(metrics.temperature) || undefined,
        collectedAt: new Date(metrics._time)
      }));
    } catch (error) {
      console.error(`Error getting metrics history for device ${deviceId.getValue()}:`, error);
      return [];
    }
  }
  
  async saveMetrics(metrics: DeviceMetrics): Promise<void> {
    // Create a point
    const point = new Point('device_metrics')
      .tag('device_id', metrics.deviceId.getValue())
      .floatField('cpu_usage', metrics.cpuUsage)
      .floatField('memory_usage', metrics.memoryUsage)
      .floatField('disk_usage', metrics.diskUsage)
      .floatField('network_traffic', (metrics.networkRx || 0) + (metrics.networkTx || 0))
      .timestamp(metrics.collectedAt);
    
    // Add temperature field only if it exists
    if (metrics.temperature !== undefined) {
      point.floatField('temperature', metrics.temperature);
    }
    
    // Write to InfluxDB
    this.writeApi.writePoint(point);
    
    try {
      await this.writeApi.flush();
    } catch (error) {
      console.error(`Error saving metrics for device ${metrics.deviceId.getValue()}:`, error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      throw new Error(`Failed to save metrics: ${errorMessage}`);
    }
  }
  
  private createDefaultMetrics(deviceId: DeviceId, customerId: CustomerId): DeviceMetrics {
    return DeviceMetrics.create({
      deviceId,
      customerId,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkRx: 0,
      networkTx: 0,
      uptime: 0,
      loadAverage: [],
      temperature: undefined,
      collectedAt: new Date()
    });
  }
}