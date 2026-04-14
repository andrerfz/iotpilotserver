import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {GetDeviceMetricsQuery} from './get-device-metrics.query';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device-repository.interface';
import {DeviceNotFoundException} from '@iotpilot/core/device/domain/exceptions/device-not-found.exception';
import {MetricsRepository} from '@iotpilot/core/device/domain/interfaces/metrics-repository.interface';

/**
 * Metric data point
 */
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

/**
 * Metric series for a specific metric type
 */
export interface MetricSeries {
  metricType: string;
  unit: string;
  dataPoints: MetricDataPoint[];
}

/**
 * Result of device metrics query
 */
export interface DeviceMetricsResult {
  deviceId: string;
  deviceName: string;
  timeRange: {
    from: Date;
    to: Date;
  };
  metrics: MetricSeries[];
}

/**
 * Handler for retrieving metrics for a device
 */
export class GetDeviceMetricsHandler implements CommandHandler<GetDeviceMetricsQuery, DeviceMetricsResult> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly metricsRepository: MetricsRepository
  ) {}

  /**
   * Handles the get device metrics query
   * @param query The get device metrics query
   * @returns The device metrics
   * @throws DeviceNotFoundException if the device is not found
   */
  async handle(query: GetDeviceMetricsQuery): Promise<DeviceMetricsResult> {
    // Find the device to ensure it exists and belongs to the correct tenant
    const device = await this.deviceRepository.findById(query.deviceId, query.getTenantContext());
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${query.deviceId.getValue()} not found`);
    }

    // Get metrics for each requested metric type
    const metricsPromises = query.metricTypes.map(async (metricType) => {
      const dataPoints = await this.metricsRepository.getMetrics(
        query.deviceId,
        metricType,
        query.timeRange.from,
        query.timeRange.to,
        query.getTenantContext()
      );

      // Determine the unit based on metric type
      let unit = '';
      switch (metricType) {
        case 'cpu':
          unit = '%';
          break;
        case 'memory':
          unit = 'MB';
          break;
        case 'disk':
          unit = 'GB';
          break;
        case 'network':
          unit = 'Mbps';
          break;
        default:
          unit = '';
      }

      return {
        metricType,
        unit,
        dataPoints
      };
    });

    const metrics = await Promise.all(metricsPromises);

    return {
      deviceId: query.deviceId.getValue(),
      deviceName: device.name.getValue(),
      timeRange: query.timeRange,
      metrics
    };
  }
}