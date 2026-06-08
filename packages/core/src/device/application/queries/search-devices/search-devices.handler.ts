import {SearchDevicesQuery} from './search-devices.query';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';
import {DeviceDto} from '@iotpilot/core/device/infrastructure/dto/device.dto';
import {QueryHandler} from '@iotpilot/core/shared/application/query.handler';

// Handler returns DTOs, repository returns entities
export interface DeviceSearchResultDTO {
  devices: DeviceDto[];
  total: number;
  limit: number;
  offset: number;
}

export class SearchDevicesHandler implements QueryHandler<SearchDevicesQuery, DeviceSearchResultDTO> {
  constructor(
    private readonly deviceRepository: DeviceRepository
  ) {}

  async handle(query: SearchDevicesQuery): Promise<DeviceSearchResultDTO> {
    const tenantContext = query.getTenantContext();
    const { searchTerm, ipAddress, status, page = 1, limit = 50 } = query;
    
    // Build search criteria
    const criteria: Record<string, unknown> = {
      deletedAt: null,
      OR: [] as Record<string, unknown>[]
    };

    if (searchTerm) {
      (criteria.OR as Record<string, unknown>[]).push({
        name: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      });
      (criteria.OR as Record<string, unknown>[]).push({
        hostname: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      });
    }

    if (ipAddress) {
      (criteria.OR as Record<string, unknown>[]).push({
        ipAddress: {
          contains: ipAddress,
          mode: 'insensitive'
        }
      });
    }

    if (status) {
      criteria.status = status;
    }

    // Tenant filtering
    if (tenantContext && !tenantContext.isSuperAdmin()) {
      criteria.customerId = tenantContext.getCustomerId()?.value;
    }

    // Execute search
    const result = await this.deviceRepository.search(criteria, { page, limit }, tenantContext);

    // Transform devices to DTOs with explicit typing
    const deviceDtos: DeviceDto[] = result.devices.map((device: DeviceEntity) => ({
      id: device.getId().getValue(),
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
      sshCredentials: device.sshCredentials ? {
        username: device.sshCredentials.username,
        port: device.sshCredentials.port
      } : null,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      isDeleted: device.isDeleted()
    }));

    // Return DTOs as expected by the query interface
    return {
      devices: deviceDtos,
      total: result.total,
      limit: result.limit,
      offset: result.offset
    };
  }
}
