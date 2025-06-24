import { Device } from '../entities/device.entity';
import { DeviceId } from '../value-objects/device-id.vo';
import { Port } from '../value-objects/port.vo';
import { SSHSession } from '../entities/ssh-session.entity';
import { DeviceRepository } from '../interfaces/device-repository.interface';
import { SSHClient } from '../interfaces/ssh-client.interface';
import { DeviceNotFoundException } from '../exceptions/device-not-found.exception';
import { SSHConnectionFailedException } from '../exceptions/ssh-connection-failed.exception';

export class SSHConnector {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly sshClient: SSHClient
  ) {}

  async connect(deviceId: DeviceId, port: Port): Promise<SSHSession> {
    // Find the device
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${deviceId.value} not found`);
    }

    try {
      // Establish SSH connection
      const session = await this.sshClient.connect(
        deviceId,
        device.ipAddress,
        port,
        device.sshCredentials
      );

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      throw new SSHConnectionFailedException(
        deviceId.value,
        `Failed to connect to device: ${errorMessage}`
      );
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    try {
      await this.sshClient.disconnect(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      throw new SSHConnectionFailedException(
        sessionId,
        `Failed to disconnect session: ${errorMessage}`
      );
    }
  }

  async executeCommand(
    sessionId: string,
    command: string
  ): Promise<{ output: string; error: string | null }> {
    try {
      return await this.sshClient.executeCommand(sessionId, command);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';

      throw new SSHConnectionFailedException(
        sessionId,
        `Failed to execute command: ${errorMessage}`
      );
    }
  }

  async getActiveSessions(): Promise<SSHSession[]> {
    return await this.sshClient.getActiveSessions();
  }

  async isConnected(sessionId: string): Promise<boolean> {
    return await this.sshClient.isConnected(sessionId);
  }
}
