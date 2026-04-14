import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device.repository';
import {TenantContext} from '@iotpilot/core/shared/domain/tenant-context';
import {StructuredLogger} from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import {DeviceEntity} from '@iotpilot/core/device/domain/entities/device.entity';

export interface SSHConnection {
  id: string;
  connect(config: SSHConnectionConfig): Promise<SSHConnection>;
  exec(command: string): Promise<SSHExecResult>;
  dispose(): Promise<void>;
}

export interface SSHConnectionConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
  passphrase?: string;
  timeout: number;
}

export interface SSHExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface SSHClient {
  connect(config: SSHConnectionConfig): Promise<SSHConnection>;
}

export class SSHSessionManagerService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly sshClient: SSHClient,
    private readonly logger: StructuredLogger
  ) {}

  async establishSession(deviceId: string, tenantContext?: TenantContext): Promise<SSHConnection> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    return this.createSshConnection(device);
  }

  private async createSshConnection(device: DeviceEntity): Promise<SSHConnection> {
    // Comprehensive IP address fallback logic
    const ipAddress = device.getIpAddress() || device.getTailscaleIp();
    
    if (!ipAddress) {
      throw new Error(`No valid IP address available for device ${device.getId().getValue()}`);
    }

    const credentials = device.sshCredentials;
    if (!credentials) {
      throw new Error(`No SSH credentials available for device ${device.getId().getValue()}`);
    }

    // Create SSH connection
    const connection = await this.sshClient.connect({
      host: ipAddress.value,
      port: credentials.port || 22,
      username: credentials.username,
      privateKey: credentials.privateKey,
      passphrase: credentials.passphrase,
      timeout: 10000
    });

    this.logger.debug('SSH connection established', {
      deviceId: device.getId().getValue(),
      ipAddress: ipAddress.value,
      connectionId: connection.id
    });

    return connection;
  }

  async executeCommand(deviceId: string, command: string, tenantContext?: TenantContext): Promise<{
    deviceId: string;
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    executedAt: Date;
  }> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const connection = await this.createSshConnection(device);
    
    try {
      const result = await connection.exec(command);
      
      this.logger.info('SSH command executed', {
        deviceId: device.id.value,
        command,
        exitCode: result.code,
        output: result.stdout,
        error: result.stderr
      });

      return {
        deviceId: device.id.value,
        command,
        exitCode: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        executedAt: new Date()
      };
    } finally {
      await connection.dispose();
    }
  }

  async testConnection(deviceId: string, tenantContext?: TenantContext): Promise<{
    deviceId: string;
    status: string;
    ipAddress: string | undefined;
    testedAt: Date;
  }> {
    const deviceIdVO = DeviceId.fromString(deviceId);
    const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const connection = await this.createSshConnection(device);
    
    try {
      await connection.exec('echo "Connection test successful"');
      
      this.logger.info('SSH connection test successful', {
        deviceId: device.id.value,
        ipAddress: device.getIpAddress()?.value || device.getTailscaleIp()?.value
      });

      return {
        deviceId: device.id.value,
        status: 'connected',
        ipAddress: device.getIpAddress()?.value || device.getTailscaleIp()?.value,
        testedAt: new Date()
      };
    } finally {
      await connection.dispose();
    }
  }
}
