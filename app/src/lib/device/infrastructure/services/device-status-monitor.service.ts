import {DeviceRepository} from '../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../domain/entities/device.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {DeviceStatus} from '../../domain/value-objects/device-status.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {StructuredLogger} from '../../../shared/infrastructure/logging/structured-logger';
import {DeviceStatusMonitorRepository} from '../repositories/device-status-monitor.repository';

export class DeviceStatusMonitorService {
  private readonly HEARTBEAT_TIMEOUT = 120000; // 2 minutes
  private readonly STATUS_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly statusMonitorRepository: DeviceStatusMonitorRepository,
    private readonly logger: StructuredLogger
  ) {}

  async monitorDeviceStatus(deviceId: string, tenantContext?: TenantContext): Promise<void> {
    try {
      const deviceIdVO = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
      
      if (!device) {
        this.logger.warn('Device not found during status monitoring', { deviceId });
        return;
      }

      const now = Date.now();
      const lastSeen = device.getLastSeen()?.getTime() || 0;
      const isStale = now - lastSeen > this.HEARTBEAT_TIMEOUT;

      let newStatus: DeviceStatus;

      if (isStale) {
        // Mark as offline if no recent heartbeat
        if (device.isOnline()) {
          newStatus = new DeviceStatus({
            ...device.status,
            connectivity: 'offline'
          });
          
          this.logger.info('Device marked offline due to stale heartbeat', {
            deviceId,
            lastSeenMinutes: Math.round((now - lastSeen) / 60000),
            customerId: device.customerId?.getValue()
          });
        } else {
          newStatus = device.status;
        }
      } else {
        // Device is online
        if (!device.isOnline()) {
          newStatus = new DeviceStatus({
            ...device.status,
            connectivity: 'online'
          });
          
          this.logger.info('Device marked online after heartbeat received', {
            deviceId,
            customerId: device.customerId?.getValue()
          });
        } else {
          newStatus = device.status;
        }
      }

      // Update status if changed
      if (!device.status.equals(newStatus)) {
        device.updateStatus(newStatus);
        await this.deviceRepository.save(device, tenantContext);
        
        // Record status change
        await this.statusMonitorRepository.recordStatusChange(
          deviceIdVO,
          JSON.stringify(device.status),
          JSON.stringify(newStatus),
          tenantContext
        );
      }

      // Update last monitored timestamp
      await this.statusMonitorRepository.updateLastMonitored(deviceIdVO, now, tenantContext);

    } catch (error) {
      this.logger.error('Device status monitoring failed', {
        deviceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  async monitorAllDevices(tenantContext?: TenantContext): Promise<StatusMonitorResult> {
    try {
      const onlineDevices = await this.deviceRepository.findOnlineDevices(tenantContext);
      const offlineDevices = await this.deviceRepository.findAll(tenantContext);
      const offlineOnly = offlineDevices.filter(d => !d.isOnline());
      
      this.logger.info('Starting device status monitoring cycle', {
        onlineCount: onlineDevices.length,
        offlineCount: offlineOnly.length,
        totalDevices: onlineDevices.length + offlineOnly.length,
        tenantId: tenantContext?.getTenantId()?.getValue()
      });

      // Monitor online devices first (quick heartbeat check)
      const onlinePromises = onlineDevices.map(device => 
        this.checkDeviceHeartbeat(device, tenantContext)
      );

      const offlinePromises = offlineOnly.slice(0, 10).map(device => // Limit offline checks
        this.attemptDeviceRecovery(device, tenantContext)
      );

      const [onlineResults, offlineResults] = await Promise.allSettled([
        Promise.all(onlinePromises),
        Promise.all(offlinePromises)
      ]);

      const statusChanges = [];
      
      // Process online results
      if (onlineResults.status === 'fulfilled') {
        onlineResults.value.forEach(result => {
          if (result.changed) {
            statusChanges.push(result);
          }
        });
      }

      // Process offline results
      if (offlineResults.status === 'fulfilled') {
        offlineResults.value.forEach(result => {
          if (result.recovered) {
            statusChanges.push(result);
          }
        });
      }

      const result: StatusMonitorResult = {
        monitoredOnline: onlineDevices.length,
        monitoredOffline: offlineOnly.length,
        statusChanges: statusChanges.length,
        recoveredDevices: offlineResults.status === 'fulfilled' ? 
          offlineResults.value.filter(r => r.recovered).length : 0,
        timestamp: new Date(),
        tenantId: tenantContext?.getTenantId()?.getValue()
      };

      this.logger.info('Device status monitoring cycle completed', result);

      // Schedule next monitoring cycle
      setTimeout(() => {
        this.monitorAllDevices(tenantContext);
      }, this.STATUS_CHECK_INTERVAL);

      return result;

    } catch (error) {
      this.logger.error('Bulk device monitoring failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        monitoredOnline: 0,
        monitoredOffline: 0,
        statusChanges: 0,
        recoveredDevices: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkDeviceHeartbeat(
    device: DeviceEntity, 
    tenantContext?: TenantContext
  ): Promise<{ deviceId: string; changed: boolean; previousStatus: string; newStatus: string }> {
    const deviceId = device.id.value;
    const now = Date.now();
    const lastSeen = device.getLastSeen()?.getTime() || 0;
    const isStale = now - lastSeen > this.HEARTBEAT_TIMEOUT;

    if (isStale && device.isOnline()) {
      // Device went offline
      const previousStatus = device.status.connectivity;
      const newStatus = 'offline';
      
      device.status = new DeviceStatus({
        ...device.status,
        connectivity: newStatus
      });
      
      await this.deviceRepository.save(device, tenantContext);
      
      return {
        deviceId,
        changed: true,
        previousStatus,
        newStatus
      };
    }

    return {
      deviceId,
      changed: false,
      previousStatus: device.status.connectivity,
      newStatus: device.status.connectivity
    };
  }

  private async attemptDeviceRecovery(
    device: DeviceEntity, 
    tenantContext?: TenantContext
  ): Promise<{ deviceId: string; recovered: boolean; method: string }> {
    const deviceId = device.id.value;
    
    // Try to ping device
    const pingResult = await this.pingDevice(device);
    
    if (pingResult.success) {
      // Device is reachable, try to re-establish connection
      const recoveryResult = await this.recoverDeviceConnection(device, tenantContext);
      
      if (recoveryResult.success) {
        device.status = DeviceStatus.offlineButActive(); // Business status remains, connectivity online
        device.lastHeartbeat = Date.now();
        await this.deviceRepository.save(device, tenantContext);
        
        this.logger.info('Device recovered from offline state', {
          deviceId,
          ipAddress: device.getIpAddress()?.value,
          method: recoveryResult.method,
          customerId: device.customerId?.getValue()
        });
        
        return {
          deviceId,
          recovered: true,
          method: recoveryResult.method
        };
      }
    }

    return {
      deviceId,
      recovered: false,
      method: 'ping'
    };
  }

  private async pingDevice(device: DeviceEntity): Promise<{ success: boolean; responseTime?: number }> {
    try {
      const ipAddress = device.getIpAddress()?.value || device.getTailscaleIp()?.value;
      
      if (!ipAddress) {
        return { success: false };
      }

      // Implementation would use ping command or ICMP
      // For now, simulate with random success rate
      const success = Math.random() > 0.3; // 70% success rate
      const responseTime = success ? Math.random() * 200 + 50 : undefined; // 50-250ms
      
      return {
        success,
        responseTime
      };
      
    } catch (error) {
      return { success: false };
    }
  }

  private async recoverDeviceConnection(
    device: DeviceEntity, 
    tenantContext?: TenantContext
  ): Promise<{ success: boolean; method: string }> {
    try {
      // Try different recovery methods
      const methods = ['restart_network', 'reconnect_tailscale', 'reboot_device'];
      const randomMethod = methods[Math.floor(Math.random() * methods.length)];
      
      // Simulate recovery attempt
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000)); // 2-5 seconds
      
      const success = Math.random() > 0.2; // 80% success rate
      
      return {
        success,
        method: randomMethod
      };
      
    } catch (error) {
      return {
        success: false,
        method: 'unknown'
      };
    }
  }

  // Alert generation for critical status changes
  async generateStatusAlerts(
    device: DeviceEntity, 
    previousStatus: DeviceStatus, 
    newStatus: DeviceStatus,
    tenantContext?: TenantContext
  ): Promise<void> {
    const criticalChanges = [
      { from: 'online', to: 'offline', severity: 'critical' },
      { from: 'active', to: 'inactive', severity: 'high' },
      { from: 'offline', to: 'online', severity: 'info' }
    ];

    const change = criticalChanges.find(c => 
      c.from === previousStatus.connectivity && c.to === newStatus.connectivity
    );

    if (change) {
      await this.statusMonitorRepository.createStatusAlert(
        device.id,
        'STATUS_CHANGE',
        `Device status changed from ${previousStatus.toString()} to ${newStatus.toString()}`,
        change.severity,
        tenantContext
      );

      this.logger[change.severity === 'critical' ? 'error' : 'warn'](
        `${change.severity.toUpperCase()} device status change`,
        {
          deviceId: device.getId().getValue(),
          deviceName: device.name.getValue(),
          previousStatus: previousStatus.toString(),
          newStatus: newStatus.toString(),
          severity: change.severity,
          customerId: device.customerId?.getValue()
        }
      );
    }
  }

  // Get monitoring statistics
  async getMonitoringStats(tenantContext?: TenantContext): Promise<MonitoringStats> {
    const onlineCount = await this.deviceRepository.countOnlineDevices(tenantContext);
    const totalCount = await this.deviceRepository.count(tenantContext);
    const offlineCount = totalCount - onlineCount;
    
    // Note: getRecentStatusChanges requires a DeviceId, not tenantContext
    // For monitoring stats, we'd need a different method to get all recent changes
    // For now, we'll skip this and return empty array
    const recentStatusChanges: any[] = [];

    return {
      totalDevices: totalCount,
      onlineDevices: onlineCount,
      offlineDevices: offlineCount,
      uptimePercentage: totalCount > 0 ? (onlineCount / totalCount * 100) : 0,
      recentStatusChanges: recentStatusChanges.length,
      lastUpdated: new Date(),
      monitoringActive: true,
      tenantId: tenantContext?.getTenantId()?.getValue()
    };
  }

  // Stop monitoring for a specific device
  async stopMonitoringDevice(deviceId: string, tenantContext?: TenantContext): Promise<void> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    
    await this.statusMonitorRepository.stopMonitoring(deviceIdVO, tenantContext);
    
    this.logger.info('Device monitoring stopped', {
      deviceId,
      customerId: tenantContext?.getCustomerId()?.value
    });
  }

  // Emergency status update (manual intervention)
  async emergencyStatusUpdate(
    deviceId: string,
    newStatus: 'online' | 'offline' | 'maintenance',
    reason: string,
    tenantContext?: TenantContext
  ): Promise<void> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const previousStatus = device.status;
    let statusData: any = { ...device.status };
    
    if (newStatus === 'online') {
      statusData.connectivity = 'online';
      device.lastHeartbeat = Date.now();
    } else if (newStatus === 'offline') {
      statusData.connectivity = 'offline';
    } else if (newStatus === 'maintenance') {
      statusData.businessStatus = 'maintenance';
    }
    
    const updatedStatus = DeviceStatus.create(statusData);
    device.updateStatus(updatedStatus);
    
    await this.deviceRepository.save(device, tenantContext);
    
    // Record emergency update
    await this.statusMonitorRepository.recordEmergencyUpdate(
      deviceIdVO,
      'EMERGENCY_STATUS_UPDATE',
      {
        previousStatus: previousStatus.toString(),
        newStatus: updatedStatus.toString(),
        reason
      },
      tenantContext
    );

    this.logger.warn('Emergency device status update', {
      deviceId,
      previousStatus: previousStatus.toString(),
      newStatus: updatedStatus.toString(),
      reason,
      updatedBy: tenantContext?.getUserId()?.getValue() || 'system'
    });
  }
}

export interface StatusMonitorResult {
  monitoredOnline: number;
  monitoredOffline: number;
  statusChanges: number;
  recoveredDevices: number;
  timestamp: Date;
  tenantId?: string;
  error?: string;
}

export interface MonitoringStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  uptimePercentage: number;
  recentStatusChanges: number;
  lastUpdated: Date;
  monitoringActive: boolean;
  tenantId?: string;
}
