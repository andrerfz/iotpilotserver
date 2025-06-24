import { DeviceMetrics } from '../../domain/entities/device-metrics.entity';
import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceMetricsDTO, DeviceMetricsListItemDTO } from '../dto/device-metrics.dto';

// Define the shape of the device metrics data in the database
export interface DeviceMetricsPersistence {
  id: string;
  deviceId: string;
  cpu: number;
  memory: number;
  disk: number;
  networkUpload: number;
  networkDownload: number;
  timestamp: Date;
}

export class DeviceMetricsMapper {
  static toDomain(persistence: DeviceMetricsPersistence): DeviceMetrics {
    return new DeviceMetrics(
      persistence.id,
      DeviceId.fromString(persistence.deviceId),
      persistence.cpu,
      persistence.memory,
      persistence.disk,
      persistence.networkUpload,
      persistence.networkDownload,
      persistence.timestamp
    );
  }

  static toPersistence(domain: DeviceMetrics): DeviceMetricsPersistence {
    return {
      id: domain.id,
      deviceId: domain.deviceId.value,
      cpu: domain.cpu,
      memory: domain.memory,
      disk: domain.disk,
      networkUpload: domain.networkUpload,
      networkDownload: domain.networkDownload,
      timestamp: domain.timestamp
    };
  }

  static toDTO(domain: DeviceMetrics): DeviceMetricsDTO {
    return {
      id: domain.id,
      deviceId: domain.deviceId.value,
      cpu: domain.cpu,
      memory: domain.memory,
      disk: domain.disk,
      networkUpload: domain.networkUpload,
      networkDownload: domain.networkDownload,
      timestamp: domain.timestamp.toISOString()
    };
  }

  static toListItemDTO(domain: DeviceMetrics): DeviceMetricsListItemDTO {
    return {
      deviceId: domain.deviceId.value,
      cpu: domain.cpu,
      memory: domain.memory,
      disk: domain.disk,
      timestamp: domain.timestamp.toISOString()
    };
  }

  static fromDTO(dto: DeviceMetricsDTO): DeviceMetrics {
    return new DeviceMetrics(
      dto.id,
      DeviceId.fromString(dto.deviceId),
      dto.cpu,
      dto.memory,
      dto.disk,
      dto.networkUpload,
      dto.networkDownload,
      new Date(dto.timestamp)
    );
  }
}