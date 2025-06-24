import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceMetrics } from '../../domain/entities/device-metrics.entity';
import { MetricsCollector } from '../../domain/interfaces/metrics-collector.interface';
import { PrismaClient } from '@prisma/client';
import { SSHClient } from '../../domain/interfaces/ssh-client.interface';
import { Port } from '../../domain/value-objects/port.vo';

export class DockerStatsCollectorService implements MetricsCollector {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sshClient: SSHClient
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
      throw new Error(`Failed to collect Docker metrics for device ${deviceId.value}: ${error.message}`);
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
      throw new Error(`Failed to collect Docker metrics for all devices: ${error.message}`);
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