import {UpdateDeviceCommand} from './update-device.command';
import {DeviceRepository} from '../../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../../domain/entities/device.entity';
import {CommandHandler} from '../../../../shared/application/command.handler';
import {DeviceNotFoundException} from '../../../domain/exceptions/device-not-found.exception';
import {UnauthorizedDeviceAccessException} from '../../../domain/exceptions/unauthorized-device-access.exception';
import {StructuredLogger} from '../../../../shared/infrastructure/logging/structured-logger';

export class UpdateDeviceHandler implements CommandHandler<UpdateDeviceCommand, DeviceEntity> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger
  ) {}

  async handle(command: UpdateDeviceCommand): Promise<DeviceEntity> {
    const { 
      deviceId, 
      name, 
      ipAddress, 
      tailscaleIp, 
      hostname, 
      sshCredentials
    } = command;
    const tenantContext = command.getTenantContext();

    if (!tenantContext) {
      throw new Error('Tenant context is required for device update');
    }

    // Find existing device
    const device = await this.deviceRepository.findById(deviceId, tenantContext);

    if (!device) {
      throw new DeviceNotFoundException(deviceId.getValue());
    }

    // Validate tenant access
    const customerId = tenantContext.getCustomerId();
    if (!tenantContext.isSuperAdmin()) {
      if (customerId) {
        try {
          device.validateBelongsToTenant(customerId);
        } catch (error) {
          const userId = tenantContext.getUserId()?.getValue() || 'unknown';
          throw new UnauthorizedDeviceAccessException(deviceId.getValue(), userId);
        }
      }
    }

    // Apply updates using entity methods (not direct assignment)
    if (name !== undefined) {
      device.updateName(name);
    }

    if (ipAddress !== undefined || tailscaleIp !== undefined || hostname !== undefined) {
      device.updateNetwork(
        ipAddress?.getValue(),
        tailscaleIp?.getValue(),
        hostname
      );
    }

    if (sshCredentials !== undefined) {
      if (sshCredentials) {
        device.updateSshCredentials(sshCredentials);
      } else {
        device.sshCredentials = undefined;
      }
    }

    // Save updated device
    await this.deviceRepository.save(device, tenantContext);

    const userId = tenantContext.getUserId();
    this.logger.info('Device updated successfully', {
      deviceId: device.getId().getValue(),
      name: device.name.getValue(),
      customerId: customerId?.getValue(),
      ipAddress: device.getIpAddress()?.getValue(),
      updatedBy: userId?.getValue() || 'system',
      changes: {
        name: name !== undefined,
        network: ipAddress !== undefined || tailscaleIp !== undefined || hostname !== undefined,
        sshCredentials: sshCredentials !== undefined
      }
    });

    return device;
  }
}