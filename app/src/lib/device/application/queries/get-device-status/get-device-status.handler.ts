import {GetDeviceStatusQuery} from './get-device-status.query';
import {DeviceRepository} from '../../../domain/interfaces/device.repository';
import {QueryHandler} from '../../../../shared/application/query.handler';
import {DeviceNotFoundException} from '../../../domain/exceptions/device-not-found.exception';
import {UnauthorizedDeviceAccessException} from '../../../domain/exceptions/unauthorized-device-access.exception';
import {DeviceStatusData} from '../../../domain/value-objects/device-status.vo';

export interface DeviceStatusResponse {
  deviceId: string;
  status: DeviceStatusData;
  isOnline: boolean;
  connectionQuality: 'good' | 'fair' | 'poor' | 'disconnected';
  lastSeen: Date | null;
  ipAddress: string | null;
  tailscaleIp: string | null;
  lastHeartbeat: number;
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
}

export class GetDeviceStatusHandler implements QueryHandler<GetDeviceStatusQuery, DeviceStatusResponse> {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async handle(query: GetDeviceStatusQuery): Promise<DeviceStatusResponse> {
    const { deviceId } = query;
    const tenantContext = query.getTenantContext();

    if (!tenantContext) {
      throw new Error('Tenant context is required for device status query');
    }

    // Find device - deviceId is already a DeviceId object
    const device = await this.deviceRepository.findById(deviceId, tenantContext);

    if (!device) {
      throw new DeviceNotFoundException(deviceId.getValue());
    }

    // Validate tenant access
    if (!tenantContext.isSuperAdmin()) {
      const customerId = tenantContext.getCustomerId();
      if (!customerId) {
        throw new Error('Customer ID is required for device status query');
      }
      try {
        device.validateBelongsToTenant(customerId);
      } catch (error) {
        const userId = tenantContext.getUserId()?.getValue() || 'unknown';
        throw new UnauthorizedDeviceAccessException(deviceId.getValue(), userId);
      }
    }

    // Build response with null safety
    return {
      deviceId: device.getId().getValue(),
      status: device.getStatusData(),
      isOnline: device.isOnline(),
      connectionQuality: device.getConnectionQuality(),
      lastSeen: device.getLastSeen(),
      ipAddress: device.getIpAddress()?.getValue() || null, // Null safety
      tailscaleIp: device.getTailscaleIp()?.getValue() || null, // Null safety
      lastHeartbeat: device.lastHeartbeat,
      metrics: device.metrics
    };
  }
}