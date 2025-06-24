import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceMetrics } from '../entities/device-metrics.entity';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { MetricsCollector as MetricsCollectorInterface } from '../interfaces/metrics-collector.interface';
import { DeviceNotFoundException } from '../exceptions/device-not-found.exception';

export class MetricsCollectorService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly metricsCollector: MetricsCollectorInterface
  ) {}

  async collectMetricsForDevice(deviceId: DeviceId): Promise<DeviceMetrics> {
    // Check if the device exists
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${deviceId.value} not found`);
    }

    // Collect metrics for the device
    const metrics = await this.metricsCollector.collectMetrics(deviceId);

    // Save the metrics
    await this.metricsCollector.saveMetrics(metrics);

    return metrics;
  }

  async collectMetricsForAllDevices(): Promise<DeviceMetrics[]> {
    // Collect metrics for all devices
    const metrics = await this.metricsCollector.collectMetricsForAllDevices();

    // Save all metrics
    for (const metric of metrics) {
      await this.metricsCollector.saveMetrics(metric);
    }

    return metrics;
  }

  async getLatestMetrics(deviceId: DeviceId): Promise<DeviceMetrics | null> {
    // Check if the device exists
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${deviceId.value} not found`);
    }

    // Get the latest metrics for the device
    return await this.metricsCollector.getLatestMetrics(deviceId);
  }

  async getMetricsHistory(
    deviceId: DeviceId,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceMetrics[]> {
    // Check if the device exists
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${deviceId.value} not found`);
    }

    // Get the metrics history for the device
    return await this.metricsCollector.getMetricsHistory(deviceId, startDate, endDate);
  }
}