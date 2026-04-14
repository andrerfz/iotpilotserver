import {SSHSession} from '../../domain/entities/ssh-session.entity';
import {DeviceId} from '../../domain/value-objects/device-id.vo';
import {IpAddress} from '../../domain/value-objects/ip-address.vo';
import {SshCredentials} from '../../domain/value-objects/ssh-credentials.vo';
import {CreateSSHSessionDTO, SSHCommandResultDTO, SSHSessionDTO, SSHSessionHistoryDTO} from '../dto/ssh-command.dto';

/**
 * Mapper for converting between SSHSession domain entity and various data formats
 */
export class SSHSessionMapper {
  /**
   * Converts an SSHSession domain entity to an SSHSessionDTO
   */
  toDTO(session: SSHSession, deviceName: string, username: string): SSHSessionDTO {
    return {
      id: session.id,
      deviceId: session.deviceId.getValue(),
      deviceName,
      ipAddress: session.ipAddress.getValue(),
      port: 22, // Default SSH port since port is not available in SSHSession
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
      status: this.getSessionStatus(session),
      username
    };
  }
  
  /**
   * Converts an SSHSession domain entity to an SSHSessionHistoryDTO
   */
  toHistoryDTO(
    session: SSHSession, 
    deviceName: string, 
    username: string, 
    commandCount: number
  ): SSHSessionHistoryDTO {
    const duration = session.endTime 
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000) 
      : null;
    
    return {
      sessionId: session.id,
      deviceId: session.deviceId.getValue(),
      deviceName,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime ? session.endTime.toISOString() : null,
      duration,
      commandCount,
      username
    };
  }
  
  /**
   * Creates an SSHCommandResultDTO from command execution results
   */
  toCommandResultDTO(
    sessionId: string,
    command: string,
    output: string,
    error: string | null,
    exitCode: number,
    executionTime: number
  ): SSHCommandResultDTO {
    return {
      sessionId,
      command,
      output,
      error,
      exitCode,
      executionTime,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Converts a CreateSSHSessionDTO to an SSHSession domain entity
   */
  fromCreateDTO(
    dto: CreateSSHSessionDTO, 
    sessionId: string, 
    ipAddress: string
  ): SSHSession {
    return SSHSession.create(
      sessionId,
      DeviceId.create(dto.deviceId),
      IpAddress.create(ipAddress),
      SshCredentials.create(
        dto.username || 'root',
        dto.password,
        dto.privateKey
      )
    );
  }
  
  /**
   * Determines the status of an SSH session
   */
  private getSessionStatus(session: SSHSession): 'active' | 'closed' | 'error' {
    if (!session.endTime) {
      return 'active';
    }
    
    // If the session ended abruptly (e.g., due to an error), we might have additional information
    // in a real implementation to determine if it was an error or a normal closure
    return 'closed';
  }
}