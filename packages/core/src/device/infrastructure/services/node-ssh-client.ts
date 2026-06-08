import {SSHClient} from '@iotpilot/core/device/domain/interfaces/ssh-client.interface';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {Port} from '@iotpilot/core/device/domain/value-objects/port.vo';
import {SshCredentials} from '@iotpilot/core/device/domain/value-objects/ssh-credentials.vo';
import {SSHSession} from '@iotpilot/core/device/domain/entities/ssh-session.entity';
import {SSHSessionId} from '@iotpilot/core/device/domain/value-objects/ssh-session-id.vo';
import {NodeSSH} from 'node-ssh';
import {randomUUID} from 'crypto';

/**
 * Implementation of SSHClient using node-ssh
 */
export class NodeSSHClient implements SSHClient {
  private sessions: Map<string, {
    ssh: NodeSSH;
    session: SSHSession;
    lastActivity: Date;
  }> = new Map();

  // Session timeout in milliseconds (30 minutes)
  private readonly sessionTimeout: number = 30 * 60 * 1000;

  constructor() {
    // Start session cleanup interval
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000); // Run every 5 minutes
  }

  async connect(
    deviceId: DeviceId,
    ipAddress: IpAddress,
    port: Port,
    credentials: SshCredentials
  ): Promise<SSHSession> {
    const ssh = new NodeSSH();

    try {
      // Prepare connection options
      const connectionOptions: any = {
        host: ipAddress.getValue(),
        port: port.getValue,
        username: credentials.getUsername(),
      };

      // Add authentication method based on what's available
      if (credentials.getPrivateKey()) {
        connectionOptions.privateKey = credentials.getPrivateKey();
      } else if (credentials.getPassword()) {
        connectionOptions.password = credentials.getPassword();
      } else {
        throw new Error('No authentication method provided');
      }

      // Connect to the device
      await ssh.connect(connectionOptions);

      // Create a new session
      const sessionId = SSHSessionId.create(randomUUID());
      const now = new Date();
      
      const session = SSHSession.create(
        sessionId.getValue(),
        deviceId,
        ipAddress,
        credentials
      );

      // Store the session
      this.sessions.set(sessionId.getValue(), {
        ssh,
        session,
        lastActivity: now
      });

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      throw new Error(`Failed to connect to device: ${errorMessage}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      // Disconnect from the device
      await sessionData.ssh.dispose();
      
      // Close the session
      sessionData.session.closeSession();
      
      // Remove the session
      this.sessions.delete(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      throw new Error(`Failed to disconnect from device: ${errorMessage}`);
    }
  }

  async executeCommand(
    sessionId: string,
    command: string
  ): Promise<{ output: string; error: string | null }> {
    const sessionData = this.sessions.get(sessionId);
    
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      // Update last activity time
      sessionData.lastActivity = new Date();
      
      // Execute the command
      const result = await sessionData.ssh.execCommand(command);
      
      return {
        output: result.stdout,
        error: result.stderr || null
      };
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
      throw new Error(`Failed to execute command: ${errorMessage}`);
    }
  }

  async isConnected(sessionId: string): Promise<boolean> {
    const sessionData = this.sessions.get(sessionId);
    
    if (!sessionData) {
      return false;
    }
    
    try {
      // Execute a simple command to check if the connection is still alive
      await sessionData.ssh.execCommand('echo 1');
      
      // Update last activity time
      sessionData.lastActivity = new Date();
      
      return true;
    } catch (error) {
      // If the command fails, the connection is no longer active
      this.sessions.delete(sessionId);
      return false;
    }
  }

  async isDeviceConnected(
    ipAddress: IpAddress,
    credentials: SshCredentials
  ): Promise<boolean> {
    const ssh = new NodeSSH();

    try {
      // Prepare connection options
      const connectionOptions: any = {
        host: ipAddress.getValue(),
        port: 22, // Default SSH port
        username: credentials.getUsername(),
        readyTimeout: 10000, // 10 seconds timeout for quick connection test
      };

      // Add authentication method based on what's available
      if (credentials.getPrivateKey()) {
        connectionOptions.privateKey = credentials.getPrivateKey();
      } else if (credentials.getPassword()) {
        connectionOptions.password = credentials.getPassword();
      } else {
        return false; // No authentication method provided
      }

      // Attempt to connect to the device
      await ssh.connect(connectionOptions);

      // If we get here, connection was successful
      // Immediately disconnect to clean up
      await ssh.dispose();
      return true;
    } catch (error) {
      // Connection failed
      return false;
    }
  }

  async getActiveSessions(): Promise<SSHSession[]> {
    const activeSessions: SSHSession[] = [];
    
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (await this.isConnected(sessionId)) {
        activeSessions.push(sessionData.session);
      }
    }
    
    return activeSessions;
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = new Date();
    
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      // Check if the session has been inactive for too long
      const inactiveTime = now.getTime() - sessionData.lastActivity.getTime();
      
      if (inactiveTime > this.sessionTimeout) {
        try {
          await this.disconnect(sessionId);
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : String(error);
          console.error(`Failed to clean up session ${sessionId}: ${errorMessage}`);
          // Remove the session anyway
          this.sessions.delete(sessionId);
        }
      }
    }
  }
}