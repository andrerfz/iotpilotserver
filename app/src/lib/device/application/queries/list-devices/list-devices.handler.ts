import {ListDevicesQuery} from './list-devices.query';
import {DeviceRepository} from '@/lib/device/domain/interfaces/device.repository';
import {DeviceEntity} from '@/lib/device/domain/entities/device.entity';
import {QueryHandler} from '@/lib/shared/application/query.handler';
import {DeviceDto} from '@/lib/device/infrastructure/dto/device.dto';

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
      id: device.id.value,
      customerId: device.customerId?.value || '',
      name: device.name.value,
      status: device.getStatusData(),
      ipAddress: device.getIpAddress()?.value || null,
      hostname: device.hostname || null,
      tailscaleIp: device.getTailscaleIp()?.value || null,
      isOnline: device.isOnline(),
      isActive: device.isActive(),
      connectionQuality: device.getConnectionQuality(),
      lastSeen: device.getLastSeen(),
      lastHeartbeat: device.lastHeartbeat,
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
