import {Device} from '../entities/device.entity';
import {SSHSession} from '../entities/ssh-session.entity';
import {SSHCredentials} from '../value-objects/ssh-credentials.vo';
import {IPAddress} from '../value-objects/ip-address.vo';
import {Port} from '../value-objects/port.vo';

/**
 * Interface for SSH client operations
 * Defines the contract for SSH operations on devices
 */
export interface SSHClient {
  /**
   * Connect to a device via SSH
   * @param device The device to connect to
   * @param credentials The SSH credentials
   * @param port Optional SSH port (defaults to 22)
   * @returns Promise resolving to an SSH session
   * @throws SSHConnectionFailedException if the connection fails
   */
  connect(device: Device, credentials: SSHCredentials, port?: Port): Promise<SSHSession>;

  /**
   * Connect to a device via SSH using IP address
   * @param ipAddress The IP address to connect to
   * @param credentials The SSH credentials
   * @param port Optional SSH port (defaults to 22)
   * @returns Promise resolving to an SSH session
   * @throws SSHConnectionFailedException if the connection fails
   */
  connectToIp(ipAddress: IPAddress, credentials: SSHCredentials, port?: Port): Promise<SSHSession>;

  /**
   * Execute a command on a device via SSH
   * @param session The SSH session
   * @param command The command to execute
   * @returns Promise resolving to the command output
   * @throws SSHConnectionFailedException if the command execution fails
   */
  executeCommand(session: SSHSession, command: string): Promise<string>;

  /**
   * Execute a command on a device via SSH with a timeout
   * @param session The SSH session
   * @param command The command to execute
   * @param timeoutMs The timeout in milliseconds
   * @returns Promise resolving to the command output
   * @throws SSHConnectionFailedException if the command execution fails or times out
   */
  executeCommandWithTimeout(session: SSHSession, command: string, timeoutMs: number): Promise<string>;

  /**
   * Upload a file to a device via SSH
   * @param session The SSH session
   * @param localPath The local file path
   * @param remotePath The remote file path
   * @returns Promise resolving to true if the upload was successful
   * @throws SSHConnectionFailedException if the file upload fails
   */
  uploadFile(session: SSHSession, localPath: string, remotePath: string): Promise<boolean>;

  /**
   * Download a file from a device via SSH
   * @param session The SSH session
   * @param remotePath The remote file path
   * @param localPath The local file path
   * @returns Promise resolving to true if the download was successful
   * @throws SSHConnectionFailedException if the file download fails
   */
  downloadFile(session: SSHSession, remotePath: string, localPath: string): Promise<boolean>;

  /**
   * Close an SSH session
   * @param session The SSH session to close
   * @returns Promise resolving to true if the session was closed successfully
   */
  disconnect(session: SSHSession): Promise<boolean>;

  /**
   * Check if an SSH session is active
   * @param session The SSH session to check
   * @returns Promise resolving to true if the session is active
   */
  isSessionActive(session: SSHSession): Promise<boolean>;
}