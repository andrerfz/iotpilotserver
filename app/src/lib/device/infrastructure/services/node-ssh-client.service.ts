import { NodeSSH } from 'node-ssh';
import { DeviceId } from '@/lib/device/domain/value-objects/device-id.vo';
import { IpAddress } from '@/lib/device/domain/value-objects/ip-address.vo';
import { Port } from '@/lib/device/domain/value-objects/port.vo';
import { SshCredentials } from '@/lib/device/domain/value-objects/ssh-credentials.vo';
import { SSHSession } from '@/lib/device/domain/entities/ssh-session.entity';
import { SSHClient } from '@/lib/device/domain/interfaces/ssh-client.interface';
import { SSHConnectionFailedException } from '@/lib/device/domain/exceptions/ssh-connection-failed.exception';

// Note: Port.getValue is a getter property, not a method, so it should be accessed without parentheses

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
        port: port.getValue,
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
        ipAddress,
        credentials
      );

      // Store the session
      this.activeSessions.set(sessionId, { ssh, session });

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      throw new SSHConnectionFailedException(
          deviceId.value,
        `Failed to connect to device at ${ipAddress.value}:${port.getValue}: ${errorMessage}`
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
      sessionData.session.closeSession();

      // Remove the session from active sessions
      this.activeSessions.delete(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      throw new Error(`Failed to disconnect session ${sessionId}: ${errorMessage}`);
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
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      throw new Error(`Failed to execute command on session ${sessionId}: ${errorMessage}`);
    }
  }

  async isConnected(sessionId: string): Promise<boolean> {
    return this.activeSessions.has(sessionId);
  }

  async getActiveSessions(): Promise<SSHSession[]> {
    return Array.from(this.activeSessions.values()).map(data => data.session);
  }
}
