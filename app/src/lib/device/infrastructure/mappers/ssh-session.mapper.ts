import { SSHSession } from '@/lib/device/domain/entities/ssh-session.entity';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { IpAddress } from '@/lib/device/domain/value-objects/ip-address.vo';
import { SshCredentials } from '@/lib/device/domain/value-objects/ssh-credentials.vo';

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
    // Create default values for missing fields
    const deviceId = DeviceId.fromString(persistence.deviceId);
    const ipAddress = IpAddress.create('127.0.0.1'); // Default IP address
    const sshCredentials = SshCredentials.create('default-user', 'default-password'); // Default credentials

    // Create the session using the static create method
    const session = SSHSession.create(
      persistence.id,
      deviceId,
      ipAddress,
      sshCredentials
    );

    // If the session has ended, close it
    if (persistence.endTime !== null && persistence.status === 'closed') {
      session.closeSession();
    }

    return session;
  }

  static toPersistence(domain: SSHSession): SSHSessionPersistence {
    return {
      id: domain.id,
      deviceId: domain.deviceId.value,
      startTime: domain.startTime,
      endTime: domain.endTime,
      userId: 'system', // Default value since SSHSession doesn't have userId
      commandCount: domain.commands.length, // Use the length of the commands array
      status: domain.isActive ? 'active' : 'closed' // Map isActive to status
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
      userId: 'system', // Default value since SSHSession doesn't have userId
      commandCount: domain.commands.length, // Use the length of the commands array
      status: domain.isActive ? 'active' : 'closed', // Map isActive to status
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
      userId: 'system', // Default value since SSHSession doesn't have userId
      status: domain.isActive ? 'active' : 'closed', // Map isActive to status
      duration
    };
  }

  static fromDTO(dto: SSHSessionDTO): SSHSession {
    // Create default values for missing fields
    const deviceId = DeviceId.fromString(dto.deviceId);
    const ipAddress = IpAddress.create('127.0.0.1'); // Default IP address
    const sshCredentials = SshCredentials.create('default-user', 'default-password'); // Default credentials

    // Create the session using the static create method
    const session = SSHSession.create(
      dto.id,
      deviceId,
      ipAddress,
      sshCredentials
    );

    // If the session has ended, close it
    if (dto.endTime !== null && dto.status === 'closed') {
      session.closeSession();
    }

    return session;
  }
}
