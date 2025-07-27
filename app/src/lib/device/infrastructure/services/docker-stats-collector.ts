import {MetricsCollector} from '@/lib/device/domain/interfaces/metrics-collector.interface';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {DeviceMetrics} from '@/lib/device/domain/entities/device-metrics.entity';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device-repository.interface';
import {SSHClient} from '@/lib/device/domain/interfaces/ssh-client.interface';
import {Port} from '@/lib/device/domain/value-objects/port.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {SshCredentials} from '@/lib/device/domain/value-objects/ssh-credentials.vo';

/**
 * Implementation of MetricsCollector using Docker stats via SSH
 */
export class DockerStatsCollector implements MetricsCollector {
  private metricsCache: Map<string, DeviceMetrics> = new Map();
  
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly sshClient: SSHClient
  ) {}

  async collectMetrics(deviceId: DeviceId): Promise<DeviceMetrics> {
    // Find the device to get its IP address and SSH credentials
    const device = await this.deviceRepository.findById(deviceId);
    
    if (!device) {
      throw new Error(`Device with ID ${deviceId.getValue()} not found`);
    }
    
    if (!device.ipAddress) {
      throw new Error(`Device ${deviceId.getValue()} does not have an IP address`);
    }
    
    if (!device.sshCredentials) {
      throw new Error(`Device ${deviceId.getValue()} does not have SSH credentials`);
    }
    
    const customerId = device.getCustomerId();
    if (!customerId) {
      throw new Error(`Device ${deviceId.getValue()} does not have a customer ID`);
    }
    
    // Convert SSHCredentials interface to SshCredentials value object
    const sshCreds = SshCredentials.create({
      username: device.sshCredentials.username,
      password: undefined, // SSHCredentials interface uses privateKey, not password
      privateKey: device.sshCredentials.privateKey,
      port: device.sshCredentials.port || 22
    });
    
    try {
      // Connect to the device via SSH
      const port = Port.create(device.sshCredentials.port || 22);
      const session = await this.sshClient.connect(
        deviceId,
        device.ipAddress,
        port,
        sshCreds
      );
      
      // Execute Docker stats command to get metrics
      const { output, error } = await this.sshClient.executeCommand(
        session.id,
        'docker stats --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}|{{.NetIO}}"'
      );
      
      // Disconnect from the device
      await this.sshClient.disconnect(session.id);
      
      if (error) {
        console.error(`Error collecting Docker stats for device ${deviceId.getValue()}:`, error);
        return this.getDefaultMetrics(deviceId, customerId);
      }
      
      // Parse the output
      const metrics = this.parseDockerStats(output, deviceId, customerId);
      
      // Cache the metrics
      this.metricsCache.set(deviceId.getValue(), metrics);
      
      return metrics;
    } catch (error) {
      console.error(`Error collecting metrics for device ${deviceId.getValue()}:`, error);
      return this.getDefaultMetrics(deviceId, customerId);
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
    // Check if we have cached metrics for this device
    const cachedMetrics = this.metricsCache.get(deviceId.getValue());
    
    if (cachedMetrics) {
      // Check if the metrics are recent (less than 5 minutes old)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      if (cachedMetrics.collectedAt > fiveMinutesAgo) {
        return cachedMetrics;
      }
    }
    
    // If no recent cached metrics, collect new metrics
    return this.collectMetrics(deviceId);
  }
  
  async getMetricsHistory(
    deviceId: DeviceId,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceMetrics[]> {
    // This implementation doesn't store historical metrics
    // Return the latest metrics if available and within the date range
    const latestMetrics = await this.getLatestMetrics(deviceId);
    
    if (latestMetrics && latestMetrics.collectedAt >= startDate && latestMetrics.collectedAt <= endDate) {
      return [latestMetrics];
    }
    
    return [];
  }
  
  async saveMetrics(metrics: DeviceMetrics): Promise<void> {
    // Cache the metrics
    this.metricsCache.set(metrics.deviceId.getValue(), metrics);
  }
  
  private parseDockerStats(output: string, deviceId: DeviceId, customerId: CustomerId): DeviceMetrics {
    try {
      // Split the output by lines
      const lines = output.trim().split('\n');
      
      if (lines.length === 0) {
        return this.getDefaultMetrics(deviceId, customerId);
      }
      
      // Aggregate metrics from all containers
      let totalCpuUsage = 0;
      let totalMemoryUsage = 0;
      let totalNetworkTraffic = 0;
      
      for (const line of lines) {
        const [cpuPerc, memPerc, memUsage, netIO] = line.split('|');
        
        // Parse CPU usage (remove % and convert to number)
        const cpuUsage = parseFloat(cpuPerc.replace('%', '')) || 0;
        
        // Parse memory usage (remove % and convert to number)
        const memUsagePerc = parseFloat(memPerc.replace('%', '')) || 0;
        
        // Parse network I/O (format: "100MB / 200MB")
        const netIOParts = netIO.split('/');
        const netIn = this.parseSize(netIOParts[0].trim());
        const netOut = this.parseSize(netIOParts[1]?.trim() || '0B');
        
        // Add to totals
        totalCpuUsage += cpuUsage;
        totalMemoryUsage += memUsagePerc;
        totalNetworkTraffic += (netIn + netOut);
      }
      
      // Create metrics entity
      return DeviceMetrics.create({
        deviceId,
        customerId,
        cpuUsage: totalCpuUsage,
        memoryUsage: totalMemoryUsage,
        diskUsage: 0, // Not available from Docker stats
        networkRx: totalNetworkTraffic / 2, // Split network traffic
        networkTx: totalNetworkTraffic / 2,
        uptime: 0, // Not available from Docker stats
        loadAverage: [],
        temperature: undefined, // Not available from Docker stats
        collectedAt: new Date()
      });
    } catch (error) {
      console.error(`Error parsing Docker stats for device ${deviceId.getValue()}:`, error);
      return this.getDefaultMetrics(deviceId, customerId);
    }
  }
  
  private parseSize(sizeStr: string): number {
    try {
      const units: { [key: string]: number } = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
      };
      
      // Extract number and unit
      const match = sizeStr.match(/^([\d.]+)([A-Z]+)$/);
      
      if (!match) {
        return 0;
      }
      
      const size = parseFloat(match[1]);
      const unit = match[2];
      
      // Convert to bytes
      return size * (units[unit] || 1);
    } catch (error) {
      return 0;
    }
  }
  
  private getDefaultMetrics(deviceId: DeviceId, customerId: CustomerId): DeviceMetrics {
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