import { SSHSession } from '../../domain/entities/ssh-session.entity';
import { DeviceId } from '../../domain/value-objects/device-id.vo';

// Define the shape of the SSH session data in the database
export interface SSHSessionPersistence {
  id: string;
  deviceId: string;
  startTime: Date;
  endTime: Date | null;
  userId: string;
  commandCount: number;
  status: string;
}

export interface SSHSessionDTO {
  id: string;
  deviceId: string;
  startTime: string;
  endTime: string | null;
  userId: string;
  commandCount: number;
  status: string;
  duration: number; // in seconds
}

export interface SSHSessionListItemDTO {
  id: string;
  deviceId: string;
  deviceName: string;
  startTime: string;
  endTime: string | null;
  userId: string;
  status: string;
  duration: number; // in seconds
}

export class SSHSessionMapper {
  static toDomain(persistence: SSHSessionPersistence): SSHSession {
    return new SSHSession(
      persistence.id,
      DeviceId.fromString(persistence.deviceId),
      persistence.startTime,
      persistence.endTime,
      persistence.userId,
      persistence.commandCount,
      persistence.status
    );
  }

  static toPersistence(domain: SSHSession): SSHSessionPersistence {
    return {
      id: domain.id,
      deviceId: domain.deviceId.value,
      startTime: domain.startTime,
      endTime: domain.endTime,
      userId: domain.userId,
      commandCount: domain.commandCount,
      status: domain.status
    };
  }

  static toDTO(domain: SSHSession, deviceName?: string): SSHSessionDTO {
    const duration = domain.endTime 
      ? Math.floor((domain.endTime.getTime() - domain.startTime.getTime()) / 1000)
      : Math.floor((new Date().getTime() - domain.startTime.getTime()) / 1000);

    return {
      id: domain.id,
      deviceId: domain.deviceId.value,
      startTime: domain.startTime.toISOString(),
      endTime: domain.endTime ? domain.endTime.toISOString() : null,
      userId: domain.userId,
      commandCount: domain.commandCount,
      status: domain.status,
      duration
    };
  }

  static toListItemDTO(domain: SSHSession, deviceName: string): SSHSessionListItemDTO {
    const duration = domain.endTime 
      ? Math.floor((domain.endTime.getTime() - domain.startTime.getTime()) / 1000)
      : Math.floor((new Date().getTime() - domain.startTime.getTime()) / 1000);

    return {
      id: domain.id,
      deviceId: domain.deviceId.value,
      deviceName,
      startTime: domain.startTime.toISOString(),
      endTime: domain.endTime ? domain.endTime.toISOString() : null,
      userId: domain.userId,
      status: domain.status,
      duration
    };
  }

  static fromDTO(dto: SSHSessionDTO): SSHSession {
    return new SSHSession(
      dto.id,
      DeviceId.fromString(dto.deviceId),
      new Date(dto.startTime),
      dto.endTime ? new Date(dto.endTime) : null,
      dto.userId,
      dto.commandCount,
      dto.status
    );
  }
}