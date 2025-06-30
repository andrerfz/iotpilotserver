import { Device, DeviceCommand, CommandStatus } from '@prisma/client';
import { logger } from './logger';

// This is a special comment that tells webpack to ignore the following import
// @ts-ignore
// eslint-disable-next-line
const SSH2 = process.env.NODE_ENV === 'production' ? {} : {};

/**
 * Result of a command execution
 */
export interface CommandExecutionResult {
  status: CommandStatus;
  output?: string;
  error?: string;
  exitCode?: number;
}

/**
 * SSH Command Executor
 * Executes commands via SSH on devices that have an IP address
 * This file is only imported on the server side
 */
export class SSHCommandExecutor {
  private readonly sshConfig: any;
  private ssh2: any = null;

  constructor(config?: any) {
    // Default SSH configuration
    this.sshConfig = {
      host: '',
      port: 22,
      username: 'pi',
      // In production, you would use key-based authentication
      // or a secure way to retrieve passwords
      password: '',
      readyTimeout: 10000,
      ...config
    };
  }

  canHandle(device: Device): boolean {
    // Can only handle if we're on the server side and device has an IP address
    if (typeof window !== 'undefined') {
      return false; // Not available on client side
    }
    return !!device.ipAddress || !!device.tailscaleIp;
  }

  async execute(device: Device, command: DeviceCommand): Promise<CommandExecutionResult> {
    // Check if we're on the server side
    if (typeof window !== 'undefined') {
      return {
        status: CommandStatus.FAILED,
        error: 'SSH functionality is only available on the server',
        exitCode: 1
      };
    }

    // Lazily load ssh2 if not already loaded
    if (!this.ssh2) {
      try {
        // Use eval to prevent webpack from analyzing this during build
        // This will only be executed at runtime on the server
        // eslint-disable-next-line no-eval
        this.ssh2 = eval("require('ssh2')");
      } catch (err) {
        logger.error(`Failed to load ssh2 module: ${err}`);
        return {
          status: CommandStatus.FAILED,
          error: `Failed to load SSH module: ${err instanceof Error ? err.message : String(err)}`,
          exitCode: 1
        };
      }
    }

    // Use tailscale IP if available, otherwise use regular IP
    const host = device.tailscaleIp || device.ipAddress;

    if (!host) {
      return {
        status: CommandStatus.FAILED,
        error: 'No IP address available for SSH connection',
        exitCode: 1
      };
    }

    // Log the execution attempt
    logger.info(`Executing command via SSH on device ${device.hostname} (${host}): ${command.command} ${command.arguments || ''}`);

    // Create SSH connection config for this specific device
    const config = {
      ...this.sshConfig,
      host
    };

    return new Promise((resolve) => {
      // Create a new SSH client
      const conn = new this.ssh2.Client();

      // Handle connection errors
      conn.on('error', (err: Error) => {
        logger.error(`SSH connection error to ${host}: ${err.message}`);
        resolve({
          status: CommandStatus.FAILED,
          error: `SSH connection error: ${err.message}`,
          exitCode: 1
        });
      });

      // Set connection timeout
      const timeout = setTimeout(() => {
        conn.end();
        logger.error(`SSH connection timeout to ${host}`);
        resolve({
          status: CommandStatus.TIMEOUT,
          error: 'SSH connection timeout',
          exitCode: 1
        });
      }, 15000); // 15 second timeout

      conn.on('ready', () => {
        clearTimeout(timeout);
        logger.debug(`SSH connection established to ${host}`);

        // Execute the command
        const cmd = `${command.command} ${command.arguments || ''}`.trim();
        conn.exec(cmd, (err: Error | null, stream: any) => {
          if (err) {
            conn.end();
            logger.error(`SSH exec error on ${host}: ${err.message}`);
            resolve({
              status: CommandStatus.FAILED,
              error: `SSH exec error: ${err.message}`,
              exitCode: 1
            });
            return;
          }

          let output = '';
          let errorOutput = '';

          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });

          stream.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString();
          });

          stream.on('close', (code: number) => {
            conn.end();
            logger.info(`Command executed on ${host} with exit code ${code}`);

            resolve({
              status: code === 0 ? CommandStatus.COMPLETED : CommandStatus.FAILED,
              output: output.trim(),
              error: errorOutput.trim(),
              exitCode: code
            });
          });
        });
      });

      // Connect to the device
      conn.connect(config);
    });
  }
}

// Export a factory function to create the executor
export function createSSHExecutor(config?: any): SSHCommandExecutor {
  return new SSHCommandExecutor(config);
}
