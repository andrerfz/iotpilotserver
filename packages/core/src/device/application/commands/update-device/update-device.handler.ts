import {UpdateDeviceCommand} from './update-device.command';
import {DeviceRepository} from '../../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../../domain/entities/device.entity';
import {CommandHandler} from '../../../../shared/application/command.handler';
import {DeviceNotFoundException} from '../../../domain/exceptions/device-not-found.exception';
import {UnauthorizedDeviceAccessException} from '../../../domain/exceptions/unauthorized-device-access.exception';
import {StructuredLogger} from '../../../../shared/infrastructure/logging/structured-logger';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {DeviceUpdatedEvent} from '../../../domain/events/device-updated.event';

export class UpdateDeviceHandler implements CommandHandler<UpdateDeviceCommand, DeviceEntity> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger,
    private readonly eventBus: EventBus
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

    const tenantId = device.customerId;
    if (tenantId) {
      const updatedFields = [
        name !== undefined && 'name',
        (ipAddress !== undefined || tailscaleIp !== undefined || hostname !== undefined) && 'network',
        sshCredentials !== undefined && 'sshCredentials',
      ].filter(Boolean) as string[];
      const deviceIpAddress = device.getIpAddress();
      if (deviceIpAddress) {
        await this.eventBus.publish(new DeviceUpdatedEvent(
          device.getId(), device.name, deviceIpAddress, device.status, updatedFields, tenantId
        ));
      }
    }

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