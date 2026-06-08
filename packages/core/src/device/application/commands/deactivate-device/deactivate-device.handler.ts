import {DeactivateDeviceCommand} from './deactivate-device.command';
import {DeviceRepository} from '../../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../../domain/entities/device.entity';
import {CommandHandler} from '../../../../shared/application/command.handler';
import {DeviceNotFoundException} from '../../../domain/exceptions/device-not-found.exception';
import {UnauthorizedDeviceAccessException} from '../../../domain/exceptions/unauthorized-device-access.exception';
import {DeviceAlreadyInactiveException} from '../../../domain/exceptions/device-already-inactive.exception';
import {StructuredLogger} from '../../../../shared/infrastructure/logging/structured-logger';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';
import {DeviceDeactivatedEvent} from '../../../domain/events/device-deactivated.event';

export class DeactivateDeviceHandler implements CommandHandler<DeactivateDeviceCommand, DeviceEntity> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: DeactivateDeviceCommand): Promise<DeviceEntity> {
    const { deviceId } = command;
    const tenantContext = command.getTenantContext();

    if (!tenantContext) {
      throw new Error('Tenant context is required for device deactivation');
    }

    // Find device
    const device = await this.deviceRepository.findById(deviceId, tenantContext);

    if (!device) {
      throw new DeviceNotFoundException(deviceId.getValue());
    }

    // Validate tenant access
    if (!tenantContext.isSuperAdmin()) {
      const customerId = tenantContext.getCustomerId();
      if (!customerId) {
        throw new Error('Customer ID is required for device deactivation');
      }
      try {
        device.validateBelongsToTenant(customerId);
      } catch (error) {
        const userId = tenantContext.getUserId()?.getValue() || 'unknown';
        throw new UnauthorizedDeviceAccessException(deviceId.getValue(), userId);
      }
    }

    // Check if already inactive
    if (!device.isActive()) {
      throw new DeviceAlreadyInactiveException(deviceId.getValue());
    }

    // Deactivate device using entity method
    device.deactivate();

    // Save updated device
    await this.deviceRepository.save(device, tenantContext);

    const tenantId = device.customerId;
    if (tenantId) {
      await this.eventBus.publish(new DeviceDeactivatedEvent(device.getId(), device.name, tenantId));
    }

    const customerId = tenantContext.getCustomerId();
    const userId = tenantContext.getUserId();
    this.logger.info('Device deactivated successfully', {
      deviceId: device.getId().getValue(),
      name: device.name.getValue(),
      customerId: customerId?.getValue(),
      deactivatedBy: userId?.getValue() || 'system',
      previousStatus: 'active',
      newStatus: 'inactive'
    });

    return device;
  }
}