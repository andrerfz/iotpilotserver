import { NodeSSH } from 'node-ssh';
import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { IpAddress } from '../../domain/value-objects/ip-address.vo';
import { Port } from '../../domain/value-objects/port.vo';
import { SshCredentials } from '../../domain/value-objects/ssh-credentials.vo';
import { SSHSession } from '../../domain/entities/ssh-session.entity';
import { SSHClient } from '../../domain/interfaces/ssh-client.interface';
import { SSHConnectionFailedException } from '../../domain/exceptions/ssh-connection-failed.exception';

export class NodeSSHClientService implements SSHClient {
  private activeSessions: Map<string, { ssh: NodeSSH; session: SSHSession }> = new Map();

  async connect(
    deviceId: DeviceId,
    ipAddress: IpAddress,
    port: Port,
    credentials: SshCredentials
  ): Promise<SSHSession> {
    try {
      const ssh = new NodeSSH();
      
      await ssh.connect({
        host: ipAddress.value,
        port: port.value,
        username: credentials.username,
        password: credentials.password,
        // Add additional options as needed
        readyTimeout: 30000, // 30 seconds
        keepaliveInterval: 10000, // 10 seconds
      });

      // Create a new session
      const sessionId = `${deviceId.value}-${Date.now()}`;
      const session = SSHSession.create(
        sessionId,
        deviceId,
        new Date(),
        null // End time will be set when the session ends
      );

      // Store the session
      this.activeSessions.set(sessionId, { ssh, session });

      return session;
    } catch (error) {
      throw new SSHConnectionFailedException(
        `Failed to connect to device ${deviceId.value} at ${ipAddress.value}:${port.value}: ${error.message}`
      );
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Disconnect the SSH connection
      sessionData.ssh.dispose();
      
      // Update the session end time
      sessionData.session.end(new Date());
      
      // Remove the session from active sessions
      this.activeSessions.delete(sessionId);
    } catch (error) {
      throw new Error(`Failed to disconnect session ${sessionId}: ${error.message}`);
    }
  }

  async executeCommand(
    sessionId: string,
    command: string
  ): Promise<{ output: string; error: string | null }> {
    const sessionData = this.activeSessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const result = await sessionData.ssh.execCommand(command);
      return {
        output: result.stdout,
        error: result.stderr || null
      };
    } catch (error) {
      throw new Error(`Failed to execute command on session ${sessionId}: ${error.message}`);
    }
  }

  async isConnected(sessionId: string): Promise<boolean> {
    return this.activeSessions.has(sessionId);
  }

  async getActiveSessions(): Promise<SSHSession[]> {
    return Array.from(this.activeSessions.values()).map(data => data.session);
  }
}