import {Device, DeviceEntity} from '../../domain/entities/device.entity';
import {CommandStatus, DeviceCommand} from '../../domain/entities/device-command.entity';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {CommandExecutionResult, CommandExecutor} from '../../domain/interfaces/command-executor.interface';

// This is a special comment that tells webpack to ignore the following import
// @ts-ignore
// eslint-disable-next-line
const SSH2 = process.env.NODE_ENV === 'production' ? {} : {};

/**
 * SSH Command Executor Service
 * Infrastructure service that executes commands via SSH on devices that have an IP address.
 * This service uses the ssh2 library and is only available on the server side.
 * 
 * This is different from NodeSSHConnectorService which manages interactive SSH sessions.
 * This service is for one-off command execution.
 */
export class SSHCommandExecutorService implements CommandExecutor {
  private readonly sshConfig: any;
  private ssh2: any = null;
  private readonly logger: StructuredLogger;

  constructor(config?: any) {
    this.logger = StructuredLogger.forService('ssh-command-executor');
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

  canHandle(device: Device | DeviceEntity): boolean {
    // Can only handle if we're on the server side and device has an IP address
    if (typeof (globalThis as any).window !== 'undefined') {
      return false; // Not available on client side
    }
    const ipAddress = device.getIpAddress()?.value;
    const tailscaleIp = device.getTailscaleIp()?.value;
    return !!ipAddress || !!tailscaleIp;
  }

  async execute(device: Device | DeviceEntity, command: DeviceCommand): Promise<CommandExecutionResult> {
    // Check if we're on the server side
    if (typeof (globalThis as any).window !== 'undefined') {
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
        this.logger.error(`Failed to load ssh2 module`, { error: err instanceof Error ? err.message : String(err) }, err instanceof Error ? err : new Error(String(err)));
        return {
          status: CommandStatus.FAILED,
          error: `Failed to load SSH module: ${err instanceof Error ? err.message : String(err)}`,
          exitCode: 1
        };
      }
    }

    // Use tailscale IP if available, otherwise use regular IP
    const host = device.getTailscaleIp()?.value || device.getIpAddress()?.value;

    if (!host) {
      return {
        status: CommandStatus.FAILED,
        error: 'No IP address available for SSH connection',
        exitCode: 1
      };
    }

    // Log the execution attempt
    const deviceName = device.hostname || device.name.getValue();
    this.logger.info(`Executing command via SSH on device ${deviceName} (${host}): ${command.command} ${command.arguments || ''}`);

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
        this.logger.error(`SSH connection error to ${host}`, { host, error: err.message }, err);
        resolve({
          status: CommandStatus.FAILED,
          error: `SSH connection error: ${err.message}`,
          exitCode: 1
        });
      });

      // Set connection timeout
      const timeout = setTimeout(() => {
        conn.end();
        this.logger.error(`SSH connection timeout to ${host}`, { host });
        resolve({
          status: CommandStatus.TIMEOUT,
          error: 'SSH connection timeout',
          exitCode: 1
        });
      }, 15000); // 15 second timeout

      conn.on('ready', () => {
        clearTimeout(timeout);
        this.logger.debug(`SSH connection established to ${host}`, { host });

        // Execute the command
        const cmd = `${command.command} ${command.arguments || ''}`.trim();
        conn.exec(cmd, (err: Error | null, stream: any) => {
          if (err) {
            conn.end();
            this.logger.error(`SSH exec error on ${host}`, { host, command: cmd, error: err.message }, err);
            resolve({
              status: CommandStatus.FAILED,
              error: `SSH exec error: ${err.message}`,
              exitCode: 1
            });
            return;
          }

          let output = '';
          let errorOutput = '';

          stream.on('data', (data: any) => {
            output += data.toString();
          });

          stream.stderr.on('data', (data: any) => {
            errorOutput += data.toString();
          });

          stream.on('close', (code: number) => {
            conn.end();
            this.logger.info(`Command executed on ${host} with exit code ${code}`, { host, command: cmd, exitCode: code });

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

// Export a factory function to create the executor (for backward compatibility)
export function createSSHExecutor(config?: any): SSHCommandExecutorService {
  return new SSHCommandExecutorService(config);
}

