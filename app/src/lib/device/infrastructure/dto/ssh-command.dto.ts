/**
 * Data Transfer Object for SSH Command execution
 */
export interface SSHCommandDTO {
  sessionId: string;
  command: string;
  workingDirectory?: string;
  timeout?: number;
}

/**
 * Data Transfer Object for SSH Command result
 */
export interface SSHCommandResultDTO {
  sessionId: string;
  command: string;
  output: string;
  error: string | null;
  exitCode: number;
  executionTime: number; // in milliseconds
  timestamp: string;
}

/**
 * Data Transfer Object for SSH Session
 */
export interface SSHSessionDTO {
  id: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  port: number;
  startTime: string;
  endTime: string | null;
  status: 'active' | 'closed' | 'error';
  username: string;
}

/**
 * Data Transfer Object for SSH Session creation
 */
export interface CreateSSHSessionDTO {
  deviceId: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
}

/**
 * Data Transfer Object for SSH Session termination
 */
export interface TerminateSSHSessionDTO {
  sessionId: string;
  reason?: string;
}

/**
 * Data Transfer Object for SSH Session history
 */
export interface SSHSessionHistoryDTO {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  startTime: string;
  endTime: string | null;
  duration: number | null; // in seconds
  commandCount: number;
  username: string;
}

/**
 * Data Transfer Object for SSH Session command history
 */
export interface SSHSessionCommandHistoryDTO {
  sessionId: string;
  commands: {
    command: string;
    timestamp: string;
    exitCode: number;
    hasError: boolean;
  }[];
}

/**
 * Data Transfer Object for SSH File Transfer
 */
export interface SSHFileTransferDTO {
  sessionId: string;
  operation: 'upload' | 'download';
  localPath?: string;
  remotePath: string;
  fileSize?: number;
  fileName: string;
}

/**
 * Data Transfer Object for SSH File Transfer result
 */
export interface SSHFileTransferResultDTO {
  sessionId: string;
  operation: 'upload' | 'download';
  success: boolean;
  remotePath: string;
  localPath?: string;
  fileSize: number;
  fileName: string;
  error?: string;
  transferTime: number; // in milliseconds
  timestamp: string;
}

/**
 * Data Transfer Object for SSH File System operation
 */
export interface SSHFileSystemOperationDTO {
  sessionId: string;
  operation: 'list' | 'mkdir' | 'rmdir' | 'rm' | 'chmod' | 'chown' | 'rename';
  path: string;
  args?: string[];
}

/**
 * Data Transfer Object for SSH File System listing result
 */
export interface SSHFileSystemListingDTO {
  sessionId: string;
  path: string;
  items: {
    name: string;
    path: string;
    type: 'file' | 'directory' | 'link' | 'other';
    size: number;
    permissions: string;
    owner: string;
    group: string;
    modifiedTime: string;
  }[];
  error?: string;
}