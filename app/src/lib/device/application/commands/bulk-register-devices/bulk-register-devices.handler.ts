import {BulkRegisterDevicesCommand} from './bulk-register-devices.command';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceName} from '../../../domain/value-objects/device-name.vo';
import {DeviceRepository} from '../../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../../domain/entities/device.entity';
import {CommandHandler} from '../../../../shared/application/command.handler';
import {StructuredLogger} from '../../../../shared/infrastructure/logging/structured-logger';
import {DeviceStatus} from '../../../domain/value-objects/device-status.vo';
import {IpAddress} from '@/lib/shared/domain/value-objects/ip-address.vo';
import {Uuid} from '@/lib/shared/domain/value-objects/uuid.vo';
import {CryptoService} from '@/lib/shared/domain/interfaces/crypto-service.interface';

interface BulkRegistrationResult {
  successful: number;
  failed: number;
  total: number;
  errors: string[];
}

export class BulkRegisterDevicesHandler implements CommandHandler<BulkRegisterDevicesCommand, BulkRegistrationResult> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger,
    private readonly cryptoService: CryptoService
  ) {}

  async handle(command: BulkRegisterDevicesCommand): Promise<BulkRegistrationResult> {
    const devices = command.devices;
    const tenantContext = command.getTenantContext();
    const customerId = command.customerId;
    
    const result: BulkRegistrationResult = {
      successful: 0,
      failed: 0,
      total: devices.length,
      errors: []
    };

    const createdDevices: DeviceEntity[] = [];

    // Process each device
    for (const deviceData of devices) {
      try {
        // Generate a unique device ID for each device
        const deviceId = DeviceId.create(Uuid.random(this.cryptoService).getValue());
        const name = DeviceName.fromString(deviceData.name);
        
        // Handle IP address (required in DeviceRegistrationData)
        let ipAddressVO: IpAddress;
          try {
            ipAddressVO = IpAddress.fromString(deviceData.ipAddress);
          } catch (error) {
            result.failed++;
          result.errors.push(`Invalid IP for device ${deviceData.name}: ${deviceData.ipAddress}`);
            continue;
        }

        // Create device entity
        const device = DeviceEntity.create(deviceId, name, customerId);
        
        // Update network properties
        device.updateNetwork(deviceData.ipAddress, undefined, undefined);

        // Set SSH credentials
        // Note: SSHCredentials requires privateKey, but we have password
        // For password-based auth, we'll need to handle this differently
        // For now, create a minimal privateKey or use password as passphrase
        device.sshCredentials = {
          username: deviceData.sshUsername,
          privateKey: deviceData.sshPassword || 'password-based-auth', // Temporary: password auth not fully supported in SSHCredentials interface
          port: deviceData.sshPort,
          passphrase: deviceData.sshPassword
        };

        // Set default status
        device.status = DeviceStatus.offlineInactive();

        createdDevices.push(device);
        result.successful++;
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to create device ${deviceData.name}: ${errorMessage}`);
        this.logger.error('Device creation failed in bulk operation', {
          deviceName: deviceData.name,
          error: errorMessage
        });
      }
    }

    // Save all valid devices
    if (createdDevices.length > 0) {
      await this.deviceRepository.saveAll(createdDevices, tenantContext);
    }

    this.logger.info('Bulk device registration completed', {
      totalDevices: devices.length,
      successfulDevices: result.successful,
      failedDevices: result.failed,
      customerId: customerId.getValue()
    });

    return result;
  }
}