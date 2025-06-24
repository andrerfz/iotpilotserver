import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceMetrics } from '../../domain/entities/device-metrics.entity';
import { MetricsCollector } from '../../domain/interfaces/metrics-collector.interface';
import { PrismaClient } from '@prisma/client';
import { SSHClient } from '../../domain/interfaces/ssh-client.interface';
import { Port } from '../../domain/value-objects/port.vo';
import { IpAddress } from '../../domain/value-objects/ip-address.vo';
import { DeviceRepository } from '../../domain/interfaces/device-repository.interface';

export class DockerStatsCollectorService implements MetricsCollector {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sshClient: SSHClient,
    private readonly deviceRepository: DeviceRepository
  ) {}

  async collectMetrics(deviceId: DeviceId): Promise<DeviceMetrics> {
    try {
      // Get device information from the repository
      const device = await this.deviceRepository.findById(deviceId);

      if (!device) {
        throw new Error(`Device with ID ${deviceId.value} not found`);
      }

      // Check if device has an IP address
      if (!device.ipAddress.value) {
        throw new Error(`Device with ID ${deviceId.value} has no IP address`);
      }

      // Connect to the device via SSH
      const session = await this.sshClient.connect(
        deviceId,
        device.ipAddress,
        Port.create(22), // Default SSH port
        device.sshCredentials
      );

      // Execute docker stats command to get container metrics
      const { output, error } = await this.sshClient.executeCommand(
        session.id,
        'docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}"'
      );

      if (error) {
        throw new Error(`Error executing docker stats command: ${error}`);
      }

      // Parse the docker stats output
      const metrics = this.parseDockerStats(output);

      // Disconnect SSH session
      await this.sshClient.disconnect(session.id);

      // Create DeviceMetrics entity
      return DeviceMetrics.create(
        deviceId,
        metrics.cpu,
        metrics.memory,
        metrics.disk,
        metrics.networkUpload,
        metrics.networkDownload,
        new Date()
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to collect Docker metrics for device ${deviceId.value}: ${errorMessage}`);
    }
  }

  async collectMetricsForAllDevices(): Promise<DeviceMetrics[]> {
    try {
      // Get all active devices
      const devices = await this.deviceRepository.findActive();

      // Collect metrics for each device
      const metricsPromises = devices.map(device => 
        this.collectMetrics(device.id)
      );

      return await Promise.all(metricsPromises);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to collect Docker metrics for all devices: ${errorMessage}`);
    }
  }

  async getLatestMetrics(deviceId: DeviceId): Promise<DeviceMetrics | null> {
    try {
      // Get the latest metrics from the database for each metric type
      const latestCpuMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.value,
          metric: 'cpu_usage'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestMemoryMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.value,
          metric: 'memory_usage'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestDiskMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.value,
          metric: 'disk_usage'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestNetworkUploadMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.value,
          metric: 'network_upload'
        },
        orderBy: { timestamp: 'desc' }
      });

      const latestNetworkDownloadMetric = await this.prisma.deviceMetric.findFirst({
        where: { 
          deviceId: deviceId.value,
          metric: 'network_download'
        },
        orderBy: { timestamp: 'desc' }
      });

      // If no metrics found, return null
      if (!latestCpuMetric && !latestMemoryMetric && !latestDiskMetric && 
          !latestNetworkUploadMetric && !latestNetworkDownloadMetric) {
        return null;
      }

      // Use the most recent timestamp from any metric
      const timestamps = [
        latestCpuMetric?.timestamp,
        latestMemoryMetric?.timestamp,
        latestDiskMetric?.timestamp,
        latestNetworkUploadMetric?.timestamp,
        latestNetworkDownloadMetric?.timestamp
      ].filter(Boolean) as Date[];

      const mostRecentTimestamp = timestamps.length > 0 
        ? new Date(Math.max(...timestamps.map(date => date.getTime())))
        : new Date();

      // Create DeviceMetrics entity with values or defaults
      return DeviceMetrics.create(
        deviceId,
        latestCpuMetric?.value ?? 0,
        latestMemoryMetric?.value ?? 0,
        latestDiskMetric?.value ?? 0,
        latestNetworkUploadMetric?.value ?? 0,
        latestNetworkDownloadMetric?.value ?? 0,
        mostRecentTimestamp
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get latest metrics for device ${deviceId.value}: ${errorMessage}`);
    }
  }

  async getMetricsHistory(
    deviceId: DeviceId,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceMetrics[]> {
    try {
      // Get all metrics within the time range
      const allMetrics = await this.prisma.deviceMetric.findMany({
        where: {
          deviceId: deviceId.value,
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      // Group metrics by timestamp (rounded to the nearest minute to group related metrics)
      const metricsByTimestamp = new Map<string, {
        timestamp: Date,
        cpu?: number,
        memory?: number,
        disk?: number,
        networkUpload?: number,
        networkDownload?: number
      }>();

      for (const metric of allMetrics) {
        // Round to nearest minute to group related metrics
        const timestampKey = new Date(
          metric.timestamp.getFullYear(),
          metric.timestamp.getMonth(),
          metric.timestamp.getDate(),
          metric.timestamp.getHours(),
          metric.timestamp.getMinutes()
        ).toISOString();

        if (!metricsByTimestamp.has(timestampKey)) {
          metricsByTimestamp.set(timestampKey, { timestamp: metric.timestamp });
        }

        const entry = metricsByTimestamp.get(timestampKey)!;

        // Assign the value based on metric type
        switch (metric.metric) {
          case 'cpu_usage':
            entry.cpu = metric.value;
            break;
          case 'memory_usage':
            entry.memory = metric.value;
            break;
          case 'disk_usage':
            entry.disk = metric.value;
            break;
          case 'network_upload':
            entry.networkUpload = metric.value;
            break;
          case 'network_download':
            entry.networkDownload = metric.value;
            break;
        }
      }

      // Convert the grouped metrics to DeviceMetrics entities
      return Array.from(metricsByTimestamp.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(metrics => 
          DeviceMetrics.create(
            deviceId,
            metrics.cpu ?? 0,
            metrics.memory ?? 0,
            metrics.disk ?? 0,
            metrics.networkUpload ?? 0,
            metrics.networkDownload ?? 0,
            metrics.timestamp
          )
        );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get metrics history for device ${deviceId.value}: ${errorMessage}`);
    }
  }

  async saveMetrics(metrics: DeviceMetrics): Promise<void> {
    try {
      // Save each metric type separately
      const timestamp = metrics.timestamp;
      const deviceId = metrics.deviceId.value;
      const baseId = `${deviceId}-${timestamp.getTime()}`;

      // Create array of metric data objects
      const metricsData = [
        {
          id: `${baseId}-cpu`,
          deviceId: deviceId,
          metric: 'cpu_usage',
          value: metrics.cpuUsage,
          unit: '%',
          timestamp: timestamp
        },
        {
          id: `${baseId}-memory`,
          deviceId: deviceId,
          metric: 'memory_usage',
          value: metrics.memoryUsage,
          unit: '%',
          timestamp: timestamp
        },
        {
          id: `${baseId}-disk`,
          deviceId: deviceId,
          metric: 'disk_usage',
          value: metrics.diskUsage,
          unit: 'MB',
          timestamp: timestamp
        },
        {
          id: `${baseId}-network-upload`,
          deviceId: deviceId,
          metric: 'network_upload',
          value: metrics.networkUpload,
          unit: 'MB',
          timestamp: timestamp
        },
        {
          id: `${baseId}-network-download`,
          deviceId: deviceId,
          metric: 'network_download',
          value: metrics.networkDownload,
          unit: 'MB',
          timestamp: timestamp
        }
      ];

      // Save all metrics in a transaction
      await this.prisma.$transaction(
        metricsData.map(data => 
          this.prisma.deviceMetric.create({ data })
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save metrics for device ${metrics.deviceId.value}: ${errorMessage}`);
    }
  }

  private parseDockerStats(output: string): {
    cpu: number;
    memory: number;
    disk: number;
    networkUpload: number;
    networkDownload: number;
  } {
    try {
      const lines = output.trim().split('\n');
      let totalCpu = 0;
      let totalMemory = 0;
      let totalDisk = 0;
      let totalNetworkUpload = 0;
      let totalNetworkDownload = 0;

      // Process each container's stats
      for (const line of lines) {
        const [name, cpuStr, memUsage, memPerc, netIO, blockIO] = line.split(',');

        // Parse CPU percentage (remove % sign and convert to number)
        const cpu = parseFloat(cpuStr.replace('%', ''));
        totalCpu += isNaN(cpu) ? 0 : cpu;

        // Parse memory percentage (remove % sign and convert to number)
        const memory = parseFloat(memPerc.replace('%', ''));
        totalMemory += isNaN(memory) ? 0 : memory;

        // Parse network I/O (format: "100MB / 200MB")
        const [netUpStr, netDownStr] = netIO.split(' / ');
        const netUp = this.parseSize(netUpStr);
        const netDown = this.parseSize(netDownStr);
        totalNetworkUpload += netUp;
        totalNetworkDownload += netDown;

        // Parse block I/O (format: "100MB / 200MB")
        const [diskReadStr, diskWriteStr] = blockIO.split(' / ');
        const diskRead = this.parseSize(diskReadStr);
        const diskWrite = this.parseSize(diskWriteStr);
        totalDisk += diskRead + diskWrite;
      }

      // Return aggregated metrics
      return {
        cpu: totalCpu,
        memory: totalMemory,
        disk: totalDisk,
        networkUpload: totalNetworkUpload,
        networkDownload: totalNetworkDownload
      };
    } catch (error) {
      console.error('Error parsing Docker stats:', error);
      return {
        cpu: 0,
        memory: 0,
        disk: 0,
        networkUpload: 0,
        networkDownload: 0
      };
    }
  }

  private parseSize(sizeStr: string): number {
    try {
      const match = sizeStr.trim().match(/^([\d.]+)([KMGT]?B)$/);
      if (!match) return 0;

      const [, valueStr, unit] = match;
      const value = parseFloat(valueStr);

      // Convert to MB for consistency
      switch (unit) {
        case 'B': return value / (1024 * 1024);
        case 'KB': return value / 1024;
        case 'MB': return value;
        case 'GB': return value * 1024;
        case 'TB': return value * 1024 * 1024;
        default: return value;
      }
    } catch (error) {
      return 0;
    }
  }
}
