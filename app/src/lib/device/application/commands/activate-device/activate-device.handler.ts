import {ActivateDeviceCommand} from './activate-device.command';
import {DeviceRepository} from '../../../domain/interfaces/device.repository';
import {DeviceEntity} from '../../../domain/entities/device.entity';
import {CommandHandler} from '../../../../shared/application/command.handler';
import {DeviceNotFoundException} from '../../../domain/exceptions/device-not-found.exception';
import {UnauthorizedDeviceAccessException} from '../../../domain/exceptions/unauthorized-device-access.exception';
import {DeviceAlreadyActiveException} from '../../../domain/exceptions/device-already-active.exception';
import {StructuredLogger} from '../../../../shared/infrastructure/logging/structured-logger';

export class ActivateDeviceHandler implements CommandHandler<ActivateDeviceCommand, DeviceEntity> {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger
  ) {}

  async handle(command: ActivateDeviceCommand): Promise<DeviceEntity> {
    const { deviceId } = command;
    const tenantContext = command.getTenantContext();

    if (!tenantContext) {
      throw new Error('Tenant context is required for device activation');
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
        throw new Error('Customer ID is required for device activation');
      }
      try {
        device.validateBelongsToTenant(customerId);
      } catch (error) {
        const userId = tenantContext.getUserId()?.getValue() || 'unknown';
        throw new UnauthorizedDeviceAccessException(deviceId.getValue(), userId);
      }
    }

    // Check if already active
    if (device.isActive()) {
      throw new DeviceAlreadyActiveException(deviceId.getValue());
    }

    // Activate device using entity method
    device.activate();

    // Save updated device
    await this.deviceRepository.save(device, tenantContext);

    const customerId = tenantContext.getCustomerId();
    const userId = tenantContext.getUserId();
    this.logger.info('Device activated successfully', {
      deviceId: device.getId().getValue(),
      name: device.name.getValue(),
      customerId: customerId?.getValue(),
      activatedBy: userId?.getValue() || 'system',
      previousStatus: 'inactive',
      newStatus: 'active'
    });

    return device;
  }
}