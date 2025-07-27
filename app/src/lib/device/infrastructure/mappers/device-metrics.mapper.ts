import {DeviceMetrics} from '../../domain/entities/device-metrics.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {CustomerId} from '../../../shared/domain/value-objects/customer-id.vo';
import {
    DeviceMetricsAlertDTO,
    DeviceMetricsDTO,
    DeviceMetricsHistoryDTO,
    DeviceMetricsSummaryDTO
} from '../dto/device-metrics.dto';

/**
 * Mapper for converting between DeviceMetrics domain entity and various data formats
 */
export class DeviceMetricsMapper {
  /**
   * Converts a DeviceMetrics domain entity to a DeviceMetricsDTO
   */
  toDTO(metrics: DeviceMetrics): DeviceMetricsDTO {
    return {
      id: metrics.getId().getValue(),
      deviceId: metrics.deviceId.getValue(),
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      diskUsage: metrics.diskUsage,
      temperature: metrics.temperature ?? 0,
      networkTraffic: (metrics.networkRx || 0) + (metrics.networkTx || 0),
      timestamp: metrics.collectedAt.toISOString()
    };
  }
  
  /**
   * Converts a DeviceMetrics domain entity to a DeviceMetricsSummaryDTO
   */
  toSummaryDTO(metrics: DeviceMetrics): DeviceMetricsSummaryDTO {
    return {
      deviceId: metrics.deviceId.getValue(),
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      diskUsage: metrics.diskUsage,
      temperature: metrics.temperature ?? 0,
      networkTraffic: (metrics.networkRx || 0) + (metrics.networkTx || 0),
      timestamp: metrics.collectedAt.toISOString()
    };
  }
  
  /**
   * Converts an array of DeviceMetrics domain entities to a DeviceMetricsHistoryDTO
   */
  toHistoryDTO(deviceId: DeviceId, metricsArray: DeviceMetrics[]): DeviceMetricsHistoryDTO {
    return {
      deviceId: deviceId.getValue(),
      metrics: metricsArray.map(metrics => ({
        timestamp: metrics.collectedAt.toISOString(),
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage,
        diskUsage: metrics.diskUsage,
        temperature: metrics.temperature ?? 0,
        networkTraffic: (metrics.networkRx || 0) + (metrics.networkTx || 0)
      }))
    };
  }
  
  /**
   * Creates a DeviceMetricsAlertDTO from a DeviceMetrics domain entity and alert information
   */
  toAlertDTO(
    metrics: DeviceMetrics, 
    metricName: string, 
    value: number, 
    threshold: number
  ): DeviceMetricsAlertDTO {
    return {
      deviceId: metrics.deviceId.getValue(),
      metricName,
      value,
      threshold,
      exceededBy: value - threshold,
      timestamp: metrics.collectedAt.toISOString()
    };
  }
  
  /**
   * Converts a raw metrics data object to a DeviceMetrics domain entity
   */
  fromRawData(
    deviceId: DeviceId,
    customerId: CustomerId,
    data: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      temperature?: number;
      networkRx?: number;
      networkTx?: number;
      uptime?: number;
      loadAverage?: number[];
      timestamp?: Date;
    }
  ): DeviceMetrics {
    return DeviceMetrics.create({
      deviceId,
      customerId,
      cpuUsage: data.cpuUsage,
      memoryUsage: data.memoryUsage,
      diskUsage: data.diskUsage,
      networkRx: data.networkRx || 0,
      networkTx: data.networkTx || 0,
      uptime: data.uptime || 0,
      loadAverage: data.loadAverage || [],
      temperature: data.temperature,
      collectedAt: data.timestamp || new Date()
    });
  }
  
  /**
   * Converts a DeviceMetricsDTO to a DeviceMetrics domain entity
   * Note: Requires customerId which should be obtained from context
   */
  fromDTO(dto: DeviceMetricsDTO, customerId: CustomerId): DeviceMetrics {
    // Split networkTraffic into Rx/Tx (assume 50/50 split if not available)
    const networkRx = dto.networkTraffic / 2;
    const networkTx = dto.networkTraffic / 2;
    
    return DeviceMetrics.create({
      deviceId: DeviceId.create(dto.deviceId),
      customerId,
      cpuUsage: dto.cpuUsage,
      memoryUsage: dto.memoryUsage,
      diskUsage: dto.diskUsage,
      networkRx,
      networkTx,
      uptime: 0, // Not available in DTO
      loadAverage: [], // Not available in DTO
      temperature: dto.temperature,
      collectedAt: new Date(dto.timestamp)
    });
  }
  
  /**
   * Converts InfluxDB query result to a DeviceMetrics domain entity
   */
  fromInfluxData(
    deviceId: DeviceId,
    customerId: CustomerId,
    influxData: any
  ): DeviceMetrics {
    // Split network_traffic into Rx/Tx if available, otherwise assume 50/50
    const networkTraffic = parseFloat(influxData.network_traffic) || 0;
    const networkRx = parseFloat(influxData.network_rx) || (networkTraffic / 2);
    const networkTx = parseFloat(influxData.network_tx) || (networkTraffic / 2);
    
    return DeviceMetrics.create({
      deviceId,
      customerId,
      cpuUsage: parseFloat(influxData.cpu_usage) || 0,
      memoryUsage: parseFloat(influxData.memory_usage) || 0,
      diskUsage: parseFloat(influxData.disk_usage) || 0,
      networkRx,
      networkTx,
      uptime: parseFloat(influxData.uptime) || 0,
      loadAverage: influxData.load_average ? (Array.isArray(influxData.load_average) ? influxData.load_average : [influxData.load_average]) : [],
      temperature: influxData.temperature ? parseFloat(influxData.temperature) : undefined,
      collectedAt: new Date(influxData._time)
    });
  }
  
  /**
   * Converts multiple InfluxDB query results to DeviceMetrics domain entities
   */
  fromInfluxDataArray(
    deviceId: DeviceId,
    customerId: CustomerId,
    influxDataArray: any[]
  ): DeviceMetrics[] {
    return influxDataArray.map(data => this.fromInfluxData(deviceId, customerId, data));
  }
}