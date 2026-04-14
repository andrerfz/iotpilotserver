import {RegisterDeviceCommand} from './register-device.command';
import {DeviceRepository} from '../../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../../domain/entities/device.entity';
import {DeviceStatus} from '../../../domain/value-objects/device-status.vo';
import {CommandHandler} from '../../../../shared/application/command.handler';
import {DeviceAlreadyExistsException} from '../../../domain/exceptions/device-already-exists.exception';
import {StructuredLogger} from '../../../../shared/infrastructure/logging/structured-logger';

export class RegisterDeviceHandler implements CommandHandler<RegisterDeviceCommand, DeviceEntity> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger
  ) {}

  async handle(command: RegisterDeviceCommand): Promise<DeviceEntity> {
    const { 
      deviceId, 
      name, 
      ipAddress, 
      tailscaleIp, 
      hostname, 
      sshCredentials
    } = command;
    const tenantContext = command.getTenantContext();

    // Validate tenant context
    if (!tenantContext) {
      throw new Error('Tenant context is required for device registration');
    }

    // Use value objects from command
    const id = deviceId;
    const deviceName = name;
    const customerId = tenantContext.getCustomerId();

    if (!customerId) {
      throw new Error('Customer ID not found in tenant context');
    }

    // Check if device already exists
    const existingDevice = await this.deviceRepository.findById(id, tenantContext);
    if (existingDevice) {
      throw new DeviceAlreadyExistsException(id.getValue());
    }

    // Use IP addresses from command
    const deviceIpAddress = ipAddress;
    const deviceTailscaleIp = tailscaleIp;

    // Create device entity
    const device = DeviceEntity.create(
      id,
      deviceName,
      customerId,
      DeviceStatus.offlineInactive(),
      deviceIpAddress,
      deviceTailscaleIp,
      hostname,
      sshCredentials
    );

    // Validate device belongs to tenant
    device.validateBelongsToTenant(customerId);

    // Save device
    await this.deviceRepository.save(device, tenantContext);

    const userId = tenantContext.getUserId();
    this.logger.info('Device registered successfully', {
      deviceId: device.getId().getValue(),
      name: device.name.getValue(),
      customerId: customerId.getValue(),
      ipAddress: deviceIpAddress?.getValue(),
      registeredBy: userId?.getValue() || 'system'
    });

    return device;
  }
}