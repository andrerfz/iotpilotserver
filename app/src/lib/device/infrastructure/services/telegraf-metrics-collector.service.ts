import axios from 'axios';
import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceMetrics } from '../../domain/entities/device-metrics.entity';
import { MetricsCollector } from '../../domain/interfaces/metrics-collector.interface';
import { PrismaClient } from '@prisma/client';

export class TelegrafMetricsCollectorService implements MetricsCollector {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly telegrafUrl: string
  ) {}

  async collectMetrics(deviceId: DeviceId): Promise<DeviceMetrics> {
    try {
      // Get device information from the database
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId.value }
      });

      if (!device) {
        throw new Error(`Device with ID ${deviceId.value} not found`);
      }

      // Query Telegraf API for metrics
      const response = await axios.get(`${this.telegrafUrl}/metrics/${device.ipAddress}`);
      const metricsData = response.data;

      // Create DeviceMetrics entity
      return DeviceMetrics.create(
        deviceId,
        metricsData.cpu || 0,
        metricsData.memory || 0,
        metricsData.disk || 0,
        metricsData.network?.upload || 0,
        metricsData.network?.download || 0,
        new Date()
      );
    } catch (error) {
      throw new Error(`Failed to collect metrics for device ${deviceId.value}: ${error.message}`);
    }
  }

  async collectMetricsForAllDevices(): Promise<DeviceMetrics[]> {
    try {
      // Get all active devices
      const devices = await this.prisma.device.findMany({
        where: { status: 'active' }
      });

      // Collect metrics for each device
      const metricsPromises = devices.map(device => 
        this.collectMetrics(DeviceId.create(device.id))
      );

      return await Promise.all(metricsPromises);
    } catch (error) {
      throw new Error(`Failed to collect metrics for all devices: ${error.message}`);
    }
  }

  async getLatestMetrics(deviceId: DeviceId): Promise<DeviceMetrics | null> {
    try {
      // Get the latest metrics from the database
      const latestMetrics = await this.prisma.deviceMetrics.findFirst({
        where: { deviceId: deviceId.value },
        orderBy: { timestamp: 'desc' }
      });

      if (!latestMetrics) {
        return null;
      }

      // Create DeviceMetrics entity
      return DeviceMetrics.create(
        deviceId,
        latestMetrics.cpu,
        latestMetrics.memory,
        latestMetrics.disk,
        latestMetrics.networkUpload,
        latestMetrics.networkDownload,
        latestMetrics.timestamp
      );
    } catch (error) {
      throw new Error(`Failed to get latest metrics for device ${deviceId.value}: ${error.message}`);
    }
  }

  async getMetricsHistory(
    deviceId: DeviceId,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceMetrics[]> {
    try {
      // Get metrics history from the database
      const metricsHistory = await this.prisma.deviceMetrics.findMany({
        where: {
          deviceId: deviceId.value,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      // Create DeviceMetrics entities
      return metricsHistory.map(metrics => 
        DeviceMetrics.create(
          deviceId,
          metrics.cpu,
          metrics.memory,
          metrics.disk,
          metrics.networkUpload,
          metrics.networkDownload,
          metrics.timestamp
        )
      );
    } catch (error) {
      throw new Error(`Failed to get metrics history for device ${deviceId.value}: ${error.message}`);
    }
  }

  async saveMetrics(metrics: DeviceMetrics): Promise<void> {
    try {
      // Save metrics to the database
      await this.prisma.deviceMetrics.create({
        data: {
          id: `${metrics.deviceId.value}-${metrics.timestamp.getTime()}`,
          deviceId: metrics.deviceId.value,
          cpu: metrics.cpu,
          memory: metrics.memory,
          disk: metrics.disk,
          networkUpload: metrics.networkUpload,
          networkDownload: metrics.networkDownload,
          timestamp: metrics.timestamp
        }
      });
    } catch (error) {
      throw new Error(`Failed to save metrics for device ${metrics.deviceId.value}: ${error.message}`);
    }
  }
}