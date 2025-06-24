import { DeviceMetrics } from '@/lib/device/domain/entities/device-metrics.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
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
    const deviceId = DeviceId.fromString(persistence.deviceId);
    const cpu = persistence.cpu;
    const memory = persistence.memory;
    const disk = persistence.disk;
    const networkUpload = persistence.networkUpload;
    const networkDownload = persistence.networkDownload;
    const timestamp = persistence.timestamp;

    return new DeviceMetrics(
      deviceId,
      cpu,
      memory,
      disk,
      networkUpload,
      networkDownload,
      timestamp
    );
  }

  static toPersistence(domain: DeviceMetrics): DeviceMetricsPersistence {
    // Generate a random ID if needed for persistence
    const id = crypto.randomUUID();

    return {
      id: id,
      deviceId: domain.deviceId.value,
      cpu: domain.cpuUsage,
      memory: domain.memoryUsage,
      disk: domain.diskUsage,
      networkUpload: domain.networkUpload,
      networkDownload: domain.networkDownload,
      timestamp: domain.timestamp
    };
  }

  static toDTO(domain: DeviceMetrics): DeviceMetricsDTO {
    return {
      id: crypto.randomUUID(), // Generate an ID for the DTO
      deviceId: domain.deviceId.value,
      cpu: domain.cpuUsage,
      memory: domain.memoryUsage,
      disk: domain.diskUsage,
      networkUpload: domain.networkUpload,
      networkDownload: domain.networkDownload,
      timestamp: domain.timestamp.toISOString()
    };
  }

  static toListItemDTO(domain: DeviceMetrics): DeviceMetricsListItemDTO {
    return {
      deviceId: domain.deviceId.value,
      cpu: domain.cpuUsage,
      memory: domain.memoryUsage,
      disk: domain.diskUsage,
      timestamp: domain.timestamp.toISOString()
    };
  }

  static fromDTO(dto: DeviceMetricsDTO): DeviceMetrics {
    const deviceId = DeviceId.fromString(dto.deviceId);
    const cpu = dto.cpu;
    const memory = dto.memory;
    const disk = dto.disk;
    const networkUpload = dto.networkUpload;
    const networkDownload = dto.networkDownload;
    const timestamp = new Date(dto.timestamp);

    return new DeviceMetrics(
      deviceId,
      cpu,
      memory,
      disk,
      networkUpload,
      networkDownload,
      timestamp
    );
  }
}
