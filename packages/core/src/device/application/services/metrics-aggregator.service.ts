import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';

export interface AggregatedMetrics {
  deviceId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  timestamp: Date;
}

export interface DeviceMetricsResult {
  deviceId: string;
  metrics?: AggregatedMetrics;
  error?: string;
  isOnline: boolean;
}

export class MetricsAggregatorService {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async aggregateDeviceMetrics(deviceId: string, tenantContext?: TenantContext): Promise<AggregatedMetrics> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    // Implementation would aggregate metrics from InfluxDB/Telegraf
    return {
      deviceId: deviceId,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      uptime: Math.floor(Math.random() * 1000),
      timestamp: new Date()
    };
  }

  async aggregateAllMetrics(tenantContext?: TenantContext): Promise<DeviceMetricsResult[]> {
    const devices = await this.deviceRepository.findOnlineDevices(tenantContext);
    const results: DeviceMetricsResult[] = [];

    for (const device of devices) {
      try {
        const metrics = await this.aggregateDeviceMetrics(device.id.value, tenantContext);
        results.push({
          deviceId: device.id.value,
          metrics,
          isOnline: device.isOnline()
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          deviceId: device.id.value,
          error: errorMessage,
          isOnline: false
        });
      }
    }

    return results;
  }
}
