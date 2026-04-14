import {ListDevicesQuery} from './list-devices.query';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';
import {QueryHandler} from '@iotpilot/core/shared/application/query.handler';
import {DeviceDto} from '@iotpilot/core/device/infrastructure/dto/device.dto';

export interface ListDevicesResult {
  devices: DeviceDto[];
  total: number;
}

export class ListDevicesHandler implements QueryHandler<ListDevicesQuery, ListDevicesResult> {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async handle(query: ListDevicesQuery): Promise<ListDevicesResult> {
    const tenantContext = query.getTenantContext();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    
    const devices = await this.deviceRepository.findAllWithPagination(
      { page, limit, sortBy, sortOrder },
      tenantContext
    );

    // Get total count for pagination
    const total = await this.deviceRepository.count(tenantContext);

    const deviceDtos = devices.map((device: DeviceEntity) => ({
      id: device.publicId,
      customerId: device.getCustomerId()?.getValue() || '',
      name: device.name.getValue(),
      status: device.getStatusData(),
      ipAddress: device.getIpAddress()?.getValue() || null,
      hostname: device.hostname || null,
      tailscaleIp: device.getTailscaleIp()?.getValue() || null,
      isOnline: device.isOnline(),
      isActive: device.isActive(),
      connectionQuality: device.getConnectionQuality(),
      lastSeen: device.getLastSeen(),
      lastHeartbeat: device.lastHeartbeat,
      metrics: device.metrics || null,
      firmwareVersion: device.getFirmwareVersion() || device.agentVersion || null,
      osVersion: device.getOsVersion() || null,
      capabilities: device.getCapabilities() || [],
      deviceType: device.deviceType || null,
      deviceModel: device.deviceModel || null,
      architecture: device.architecture || null,
      location: device.location || null,
      description: device.description || null,
      macAddress: device.macAddress || null,
      lastBoot: device.lastBoot || null,
      uptime: device.uptimeStr || null,
      cpuTemp: device.cpuTemp ?? null,
      memoryTotal: device.memoryTotal ?? null,
      diskTotal: device.diskTotal || null,
      loadAverage: device.loadAverage || null,
      appStatus: device.appStatus || null,
      agentVersion: device.agentVersion || null,
      sshCredentials: device.sshCredentials ? {
        username: device.sshCredentials.username,
        port: device.sshCredentials.port
      } : null,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      isDeleted: device.isDeleted()
    }));

    return {
      devices: deviceDtos,
      total
    };
  }
}
