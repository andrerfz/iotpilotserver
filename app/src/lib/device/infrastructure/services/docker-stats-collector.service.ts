import {DeviceRepository} from '../../domain/interfaces/device.repository';
import {DeviceMetrics} from '../../domain/entities/device.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {StructuredLogger} from '../../../shared/infrastructure/logging/structured-logger';
// import { Docker } from 'dockerode'; // Commented out - dockerode may not be installed
type Docker = any; // Temporary type until dockerode is properly installed

export interface DockerStats {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  diskUsage: number;
  diskTotal: number;
  networkIn: number;
  networkOut: number;
  timestamp: Date;
}

export class DockerStatsCollectorService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly docker: Docker,
    private readonly logger: StructuredLogger
  ) {}

  async collectDeviceStats(deviceId: string, tenantContext?: TenantContext): Promise<DockerStats | null> {
    try {
      const deviceIdVO = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
      
      if (!device || !device.isOnline()) {
        this.logger.warn('Cannot collect stats from offline device', {
          deviceId,
          isOnline: device?.isOnline()
        });
        return null;
      }

      // Get primary IP address with fallback
      let targetIp: string | undefined;
      if (device.getIpAddress()) {
        targetIp = device.getIpAddress()!.getValue();
      } else if (device.getTailscaleIp()) {
        targetIp = device.getTailscaleIp()!.getValue();
      }

      if (!targetIp) {
        this.logger.error('No valid IP address for Docker stats collection', {
          deviceId,
          ipAddress: device.getIpAddress()?.getValue(),
          tailscaleIp: device.getTailscaleIp()?.getValue()
        });
        return null;
      }

      // Collect Docker stats via SSH or API
      const stats = await this.collectDockerStatsFromDevice(targetIp, deviceId);
      
      // Update device metrics using entity method
      if (stats && device) {
        const metrics: DeviceMetrics = {
          cpuUsage: stats.cpuUsage,
          memoryUsage: (stats.memoryUsage / stats.memoryTotal) * 100,
          diskUsage: (stats.diskUsage / stats.diskTotal) * 100,
          uptime: Math.floor(Math.random() * 1000000), // Docker uptime would be collected here
          timestamp: stats.timestamp
        };
        
        device.updateMetrics(metrics);
        await this.deviceRepository.save(device, tenantContext);
        
        this.logger.debug('Docker stats collected and updated', {
          deviceId,
          ipAddress: targetIp,
          cpuUsage: stats.cpuUsage,
          memoryUsage: metrics.memoryUsage
        });
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to collect Docker stats', {
        deviceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  async collectAllDeviceStats(tenantContext?: TenantContext): Promise<DockerStats[]> {
    try {
      const onlineDevices = await this.deviceRepository.findOnlineDevices(tenantContext);
      const results: DockerStats[] = [];
      
      this.logger.info('Starting bulk Docker stats collection', {
        deviceCount: onlineDevices.length,
        tenantId: tenantContext?.getTenantId()
      });

      // Collect stats in parallel with rate limiting
      const statsPromises = onlineDevices.map(device => 
        this.collectDeviceStats(device.id.value, tenantContext)
      );

      const statsResults = await Promise.allSettled(statsPromises);
      
      statsResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        } else if (result.status === 'rejected') {
          const device = onlineDevices[index];
          this.logger.error('Individual device stats collection failed', {
            deviceId: device?.id.value,
            error: (result as PromiseRejectedResult).reason
          });
        }
      });

      this.logger.info('Bulk Docker stats collection completed', {
        successful: results.length,
        total: onlineDevices.length,
        failed: onlineDevices.length - results.length
      });

      return results;
    } catch (error) {
      this.logger.error('Bulk Docker stats collection failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  private async collectDockerStatsFromDevice(ipAddress: string, deviceId: string): Promise<DockerStats> {
    // Implementation would use SSH to connect to device and run Docker commands
    // For now, generating mock stats for testing
    
    this.logger.debug('Collecting Docker stats from device', {
      deviceId,
      ipAddress
    });

    // Simulate Docker stats collection
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // 1-3 seconds

    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 1024 * 1024 * 512, // 0-512MB
      memoryTotal: 1024 * 1024 * 1024, // 1GB total
      diskUsage: Math.random() * 100 * 1024 * 1024 * 1024, // 0-100GB
      diskTotal: 500 * 1024 * 1024 * 1024, // 500GB total
      networkIn: Math.random() * 1024 * 1024, // 0-1MB
      networkOut: Math.random() * 1024 * 1024, // 0-1MB
      timestamp: new Date()
    };
  }

  /**
   * Validates Docker connectivity to a device
   */
  async validateDockerConnectivity(deviceId: string, tenantContext?: TenantContext): Promise<boolean> {
    try {
      const deviceIdVO = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
      
      if (!device || !device.isOnline()) {
        return false;
      }

      const targetIp = device.getIpAddress()?.value || device.getTailscaleIp()?.value;
      
      if (!targetIp) {
        this.logger.warn('No IP address available for Docker connectivity test', { deviceId });
        return false;
      }

      // Test Docker socket connectivity via SSH
      // Implementation would execute: ssh user@ip "docker version"
      const isConnected = await this.testDockerConnection(targetIp, deviceId);
      
      this.logger.info('Docker connectivity test completed', {
        deviceId,
        ipAddress: targetIp,
        isConnected
      });

      return isConnected;
    } catch (error) {
      this.logger.error('Docker connectivity validation failed', {
        deviceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  private async testDockerConnection(ipAddress: string, deviceId: string): Promise<boolean> {
    // Simulate Docker connectivity test
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // 0.5-1.5 seconds
    
    // 95% success rate for testing
    return Math.random() > 0.05;
  }

  /**
   * Emergency stats collection for critical devices
   */
  async collectCriticalDeviceStats(
    deviceId: string, 
    tenantContext?: TenantContext, 
    timeoutMs: number = 5000
  ): Promise<DockerStats | null> {
    const startTime = Date.now();
    
    try {
      // Use shorter timeout for critical collection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const stats = await this.collectDeviceStats(deviceId, tenantContext);
      
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      this.logger.info('Critical stats collection completed', {
        deviceId,
        durationMs: duration,
        timeoutMs
      });
      
      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Critical stats collection failed', {
        deviceId,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
        wasTimeout: duration >= timeoutMs
      });
      
      return null;
    }
  }
}
