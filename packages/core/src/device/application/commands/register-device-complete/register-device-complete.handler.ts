import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {RegisterDeviceCompleteCommand} from './register-device-complete.command';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device-repository.interface';
import {DeviceEntity, SSHCredentials} from '@iotpilot/core/device/domain/entities/device.entity';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceName} from '@iotpilot/core/device/domain/value-objects/device-name.vo';
import {IpAddress} from '@iotpilot/core/device/domain/value-objects/ip-address.vo';
import {SshCredentials} from '@iotpilot/core/device/domain/value-objects/ssh-credentials.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {PrismaService} from '@iotpilot/core/shared/infrastructure/database/prisma.service';

type PrismaClient = ReturnType<PrismaService['getClient']>;

/**
 * Result of device registration
 */
export interface DeviceRegistrationResult {
  deviceId: string;
  message: string;
  capabilities?: string[];
}

/**
 * Handler for registering devices with complete information
 */
export class RegisterDeviceCompleteHandler implements CommandHandler<RegisterDeviceCompleteCommand, DeviceRegistrationResult> {
  private readonly prismaService: PrismaService;

  constructor(
    private readonly deviceRepository: DeviceRepository,
    prismaService: PrismaService
  ) {
    this.prismaService = prismaService;
  }

  private get prismaClient(): PrismaClient {
    return this.prismaService.getClient();
  }

  /**
   * Maps string device type to Prisma DeviceType enum string
   */
  private mapDeviceType(deviceType: string): 'PI_ZERO' | 'PI_3' | 'PI_4' | 'PI_5' | 'ORANGE_PI' | 'GENERIC' | 'UNKNOWN' {
    const lowerType = deviceType.toLowerCase();

    if (lowerType.includes('pi zero') || lowerType.includes('pi-zero')) {
      return 'PI_ZERO';
    }

    if (lowerType.includes('pi 3') || lowerType.includes('pi-3') || lowerType.includes('raspberry pi 3')) {
      return 'PI_3';
    }

    if (lowerType.includes('pi 4') || lowerType.includes('pi-4') || lowerType.includes('raspberry pi 4')) {
      return 'PI_4';
    }

    if (lowerType.includes('pi 5') || lowerType.includes('pi-5') || lowerType.includes('raspberry pi 5')) {
      return 'PI_5';
    }

    if (lowerType.includes('orange')) {
      return 'ORANGE_PI';
    }

    if (lowerType.includes('raspberry') || lowerType.includes('pi')) {
      return 'GENERIC'; // Generic Raspberry Pi
    }

    // Default to GENERIC for unknown devices
    return 'GENERIC';
  }

  /**
   * Handles the register device complete command
   * @param command The register device complete command
   * @returns The registration result
   */
  async handle(command: RegisterDeviceCompleteCommand): Promise<DeviceRegistrationResult> {
    const { deviceData } = command;
    const tenantContext = command.getTenantContext();

    try {
      // Check if device already exists (including soft-deleted)
      const existingDevice = await this.prismaClient.device.findFirst({
        where: { deviceId: deviceData.deviceId }
      });

      if (existingDevice) {
        if (existingDevice.deletedAt) {
          // Restore soft-deleted device
          console.log('🔄 DEVICE REGISTRATION: Restoring soft-deleted device');
          
          const restoredDevice = await this.prismaClient.device.update({
            where: { id: existingDevice.id },
            data: {
              hostname: deviceData.hostname,
              deviceType: this.mapDeviceType(deviceData.deviceType),
              deviceModel: deviceData.deviceModel,
              architecture: deviceData.architecture,
              location: deviceData.location,
              ipAddress: deviceData.ipAddress,
              tailscaleIp: deviceData.tailscaleIp,
              macAddress: deviceData.macAddress,
              userId: deviceData.ownerId,
              customerId: deviceData.customerId,
              status: 'ONLINE',
              deletedAt: null,
              lastSeen: new Date(),
              updatedAt: new Date()
            }
          });

          return {
            deviceId: restoredDevice.deviceId,
            message: 'Device restored successfully',
            capabilities: [] // We'd need to implement capability detection
          };
        } else {
          // Device already exists and is active
          throw new Error(`Device with ID ${deviceData.deviceId} already exists`);
        }
      }

      // Create new device entity
      const deviceId = DeviceId.create(deviceData.deviceId);
      const deviceName = DeviceName.create(deviceData.hostname);
      const ipAddress = IpAddress.create(deviceData.ipAddress || '0.0.0.0');
      const sshCredentialsVO = SshCredentials.create('pi', 'raspberry', undefined, 22); // Default SSH credentials
      const tenantId = CustomerId.create(deviceData.customerId);
      
      // Convert SshCredentials value object to SSHCredentials interface
      const sshCredentials: SSHCredentials = {
        username: sshCredentialsVO.username,
        port: sshCredentialsVO.port,
        privateKey: sshCredentialsVO.privateKey || 'password-based-auth',
        passphrase: sshCredentialsVO.password
      };
      
      const tailscaleIp = deviceData.tailscaleIp ? IpAddress.create(deviceData.tailscaleIp) : undefined;

      const device = DeviceEntity.create(
        deviceId,
        deviceName,
        tenantId,
        undefined, // status - will use default
        ipAddress,
        tailscaleIp,
        deviceData.hostname,
        sshCredentials
      );

      // Set additional registration properties on the entity
      device.deviceType = this.mapDeviceType(deviceData.deviceType);
      device.deviceModel = deviceData.deviceModel;
      device.architecture = deviceData.architecture;
      device.location = deviceData.location;

      // Save device using repository
      await this.deviceRepository.save(device, tenantContext);

      // Detect capabilities (simplified for now)
      const capabilities = await this.detectCapabilities(deviceData);

      console.log('✅ DEVICE REGISTRATION: Device registered successfully:', {
        deviceId: deviceData.deviceId,
        hostname: deviceData.hostname,
        customerId: deviceData.customerId,
        capabilities
      });

      return {
        deviceId: device.getId().getValue(),
        message: 'Device registered successfully',
        capabilities
      };

    } catch (error) {
      console.error('❌ DEVICE REGISTRATION: Failed to register device:', error);
      throw error;
    }
  }

  /**
   * Detect device capabilities based on device data
   * @param deviceData The device registration data
   * @returns Array of capability strings
   */
  private async detectCapabilities(deviceData: any): Promise<string[]> {
    const capabilities: string[] = [];

    // Basic capabilities based on device type
    switch (deviceData.deviceType?.toLowerCase()) {
      case 'raspberry-pi':
        capabilities.push('ssh', 'gpio', 'camera', 'sensors');
        break;
      case 'linux-server':
        capabilities.push('ssh', 'docker', 'monitoring');
        break;
      case 'iot-device':
        capabilities.push('sensors', 'mqtt');
        break;
      default:
        capabilities.push('basic');
    }

    // Add SSH capability if IP address is provided
    if (deviceData.ipAddress) {
      capabilities.push('remote-access');
    }

    // Add network capabilities
    if (deviceData.tailscaleIp) {
      capabilities.push('vpn');
    }

    return capabilities;
  }
}