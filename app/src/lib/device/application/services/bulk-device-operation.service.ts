import {DeviceRepository} from '../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../domain/entities/device.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {CustomerId} from '../../../shared/domain/value-objects/customer-id.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {StructuredLogger} from '../../../shared/infrastructure/logging/structured-logger';
import {DeviceStatus} from '../../domain/value-objects/device-status.vo';
import {IpAddress} from '../../../shared/domain/value-objects/ip-address.vo';
import {DeviceName} from '../../domain/value-objects/device-name.vo';

export interface BulkOperationResult {
  successCount: number;
  failedCount: number;
  results: Array<{
    deviceId: string;
    success: boolean;
    error?: string;
    data?: any;
  }>;
  summary: {
    totalProcessed: number;
    successRate: number;
    errors: string[];
  };
}

export class BulkDeviceOperationService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger
  ) {}

  async activateDevices(
    deviceIds: string[],
    tenantContext?: TenantContext
  ): Promise<BulkOperationResult> {
    return this.performBulkOperation(deviceIds, async (deviceId) => {
      const id = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(id, tenantContext);
      
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      // Validate tenant access
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (!customerId) {
          return { success: false, error: 'Customer ID is required for device operations' };
        }
        try {
          device.validateBelongsToTenant(customerId);
        } catch (error) {
          return { success: false, error: 'Unauthorized access to device' };
        }
      }

      if (device.isActive()) {
        return { success: false, error: 'Device already active' };
      }

      device.activate();
      await this.deviceRepository.save(device, tenantContext);
      
      return { 
        success: true, 
        data: {
          deviceId: device.getId().getValue(),
          status: 'activated',
          name: device.name.getValue()
        } 
      };
    }, 'activate', tenantContext);
  }

  async deactivateDevices(
    deviceIds: string[],
    tenantContext?: TenantContext
  ): Promise<BulkOperationResult> {
    return this.performBulkOperation(deviceIds, async (deviceId) => {
      const id = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(id, tenantContext);
      
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      // Validate tenant access
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (!customerId) {
          return { success: false, error: 'Customer ID is required for device operations' };
        }
        try {
          device.validateBelongsToTenant(customerId);
        } catch (error) {
          return { success: false, error: 'Unauthorized access to device' };
        }
      }

      if (!device.isActive()) {
        return { success: false, error: 'Device already inactive' };
      }

      device.deactivate();
      await this.deviceRepository.save(device, tenantContext);
      
      return { 
        success: true, 
        data: {
          deviceId: device.getId().getValue(),
          status: 'deactivated',
          name: device.name.getValue()
        } 
      };
    }, 'deactivate', tenantContext);
  }

  async updateDeviceNetwork(
    deviceIds: string[],
    networkConfig: {
      ipAddress?: string;
      tailscaleIp?: string;
      hostname?: string;
    },
    tenantContext?: TenantContext
  ): Promise<BulkOperationResult> {
    const { ipAddress, tailscaleIp, hostname } = networkConfig;
    
    if (!ipAddress && !tailscaleIp && !hostname) {
      throw new Error('At least one network configuration must be provided');
    }

    return this.performBulkOperation(deviceIds, async (deviceId) => {
      const id = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(id, tenantContext);
      
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      // Validate tenant access
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (!customerId) {
          return { success: false, error: 'Customer ID is required for device operations' };
        }
        try {
          device.validateBelongsToTenant(customerId);
        } catch (error) {
          return { success: false, error: 'Unauthorized access to device' };
        }
      }

      // Validate IP addresses if provided
      if (ipAddress) {
        try {
          IpAddress.fromString(ipAddress);
        } catch (error) {
          return { success: false, error: `Invalid IP address: ${ipAddress}` };
        }
      }

      if (tailscaleIp) {
        try {
          IpAddress.fromString(tailscaleIp);
        } catch (error) {
          return { success: false, error: `Invalid Tailscale IP: ${tailscaleIp}` };
        }
      }

      device.updateNetwork(ipAddress, tailscaleIp, hostname);
      await this.deviceRepository.save(device, tenantContext);
      
      return { 
        success: true, 
        data: {
          deviceId: device.getId().getValue(),
          ipAddress: device.getIpAddress()?.getValue(),
          tailscaleIp: device.getTailscaleIp()?.getValue(),
          hostname: device.hostname
        } 
      };
    }, 'update_network', tenantContext);
  }

  async bulkRegisterDevices(
    devices: Array<{
      name: string;
      ipAddress?: string;
      hostname?: string;
      sshCredentials?: any;
    }>,
    customerId: string,
    tenantContext?: TenantContext
  ): Promise<BulkOperationResult> {
    const customerIdVO = CustomerId.fromString(customerId);
    
    if (!tenantContext || !tenantContext.getCustomerId()?.equals(customerIdVO)) {
      throw new Error('Invalid customer context for bulk registration');
    }

    const results: Array<{
      deviceId: string;
      success: boolean;
      error?: string;
      data?: any;
    }> = [];

    const successCount = 0;
    const errors: string[] = [];

    for (const deviceData of devices) {
      try {
        const generatedId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const deviceId = DeviceId.fromString(generatedId);
        const deviceName = DeviceName.fromString(deviceData.name);
        
        let deviceIpAddress: IpAddress | undefined;
        if (deviceData.ipAddress) {
          deviceIpAddress = IpAddress.fromString(deviceData.ipAddress);
        }

        const device = DeviceEntity.create(
          deviceId,
          deviceName,
          customerIdVO,
          DeviceStatus.offlineInactive(),
          deviceIpAddress,
          undefined,
          deviceData.hostname,
          deviceData.sshCredentials
        );

        // Validate device belongs to tenant
        device.validateBelongsToTenant(customerIdVO);

        await this.deviceRepository.save(device, tenantContext);

        results.push({
          deviceId: generatedId,
          success: true,
          data: {
            deviceId: generatedId,
            name: device.name.getValue(),
            status: 'registered',
            ipAddress: deviceIpAddress?.getValue()
          }
        });

        this.logger.info('Device registered via bulk operation', {
          deviceId: generatedId,
          name: device.name.getValue(),
          customerId,
          registeredBy: tenantContext.getUserId()?.getValue()
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          deviceId: deviceData.name, // Use name as identifier for failed devices
          success: false,
          error: errorMsg
        });
        errors.push(`${deviceData.name}: ${errorMsg}`);
      }
    }

    const totalProcessed = devices.length;
    const successRate = Math.round((results.filter(r => r.success).length / totalProcessed) * 100);

    const summary = {
      totalProcessed,
      successRate,
      errors
    };

    this.logger.info('Bulk device registration completed', {
      customerId,
      totalProcessed,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      successRate,
      performedBy: tenantContext?.getUserId()?.getValue()
    });

    return {
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      results,
      summary
    };
  }

  private async performBulkOperation(
    deviceIds: string[],
    operation: (deviceId: string) => Promise<{ success: boolean; error?: string; data?: any }>,
    operationName: string,
    tenantContext?: TenantContext
  ): Promise<BulkOperationResult> {
    if (!deviceIds || deviceIds.length === 0) {
      throw new Error('Device IDs array cannot be empty');
    }

    if (deviceIds.length > 100) {
      throw new Error('Bulk operations limited to 100 devices at a time');
    }

    this.logger.info(`Starting bulk ${operationName} operation`, {
      deviceCount: deviceIds.length,
      tenantId: tenantContext?.getTenantId()?.getValue(),
      operation: operationName
    });

    const results: Array<{
      deviceId: string;
      success: boolean;
      error?: string;
      data?: any;
    }> = [];

    const errors: string[] = [];
    let successCount = 0;

    // Process in batches of 10 for better error handling
    const batchSize = 10;
    for (let i = 0; i < deviceIds.length; i += batchSize) {
      const batch = deviceIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (deviceId) => {
        try {
          const result = await operation(deviceId);
          if (result.success) {
            successCount++;
          } else {
            errors.push(`${deviceId}: ${result.error}`);
          }
          return { deviceId, ...result };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${deviceId}: ${errorMsg}`);
          return {
            deviceId,
            success: false,
            error: errorMsg
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle promise rejection
          const deviceId = batch[index];
          results.push({
            deviceId,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Promise rejected'
          });
          errors.push(`${deviceId}: Promise rejected`);
        }
      });

      // Small delay between batches
      if (i + batchSize < deviceIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalProcessed = deviceIds.length;
    const successRate = Math.round((successCount / totalProcessed) * 100);

    const summary = {
      totalProcessed,
      successRate,
      errors
    };

    this.logger.info(`Bulk ${operationName} operation completed`, {
      totalProcessed,
      successCount,
      failedCount: totalProcessed - successCount,
      successRate,
      tenantId: tenantContext?.getTenantId()?.getValue(),
      operation: operationName
    });

    if (errors.length > 0) {
      this.logger.warn(`Bulk ${operationName} errors`, {
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Log first 10 errors
        totalErrors: errors.length
      });
    }

    return {
      successCount,
      failedCount: totalProcessed - successCount,
      results,
      summary
    };
  }

  // Utility method for getting device summary before bulk operations
  async getBulkOperationPreview(
    deviceIds: string[],
    operation: 'activate' | 'deactivate' | 'update_network',
    tenantContext?: TenantContext
  ): Promise<BulkOperationPreview> {
    const validDevices: DeviceEntity[] = [];
    const invalidDevices: string[] = [];
    const previewData: any = {};

    for (const deviceId of deviceIds) {
      try {
        const id = DeviceId.fromString(deviceId);
        const device = await this.deviceRepository.findById(id, tenantContext);
        
        if (!device) {
          invalidDevices.push(deviceId);
          continue;
        }

        // Validate tenant access
        if (tenantContext && !tenantContext.isSuperAdmin()) {
          const customerId = tenantContext.getCustomerId();
          if (!customerId) {
            invalidDevices.push(deviceId);
            continue;
          }
          try {
            device.validateBelongsToTenant(customerId);
          } catch (error) {
            invalidDevices.push(deviceId);
            continue;
          }
        }

        validDevices.push(device);

        // Collect preview data based on operation
        switch (operation) {
          case 'activate':
            if (device.isActive()) {
              previewData.alreadyActive = (previewData.alreadyActive || 0) + 1;
            } else {
              previewData.willBeActivated = (previewData.willBeActivated || 0) + 1;
            }
            break;
            
          case 'deactivate':
            if (device.isActive()) {
              previewData.willBeDeactivated = (previewData.willBeDeactivated || 0) + 1;
            } else {
              previewData.alreadyInactive = (previewData.alreadyInactive || 0) + 1;
            }
            break;
            
          case 'update_network':
            previewData.currentIps = (previewData.currentIps || 0) + 
              (device.getIpAddress() ? 1 : 0) + (device.getTailscaleIp() ? 1 : 0);
            previewData.onlineDevices = (previewData.onlineDevices || 0) + (device.isOnline() ? 1 : 0);
            break;
        }

      } catch (error) {
        invalidDevices.push(deviceId);
      }
    }

    return {
      validCount: validDevices.length,
      invalidCount: invalidDevices.length,
      invalidDevices,
      total: deviceIds.length,
      previewData,
      canProceed: validDevices.length > 0,
      warning: invalidDevices.length > 0 ? 
        `Found ${invalidDevices.length} invalid devices` : undefined
    };
  }
}

export interface BulkOperationPreview {
  validCount: number;
  invalidCount: number;
  invalidDevices: string[];
  total: number;
  previewData: any;
  canProceed: boolean;
  warning?: string;
}
