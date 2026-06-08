import {CommandHandler} from '@iotpilot/core/shared/application/interfaces/command.interface';
import {RemoveDeviceCommand} from './remove-device.command';
import {DeviceRemover} from '@iotpilot/core/device/domain/services/device-remover.service';
import {DeviceRepository} from '@iotpilot/core/device/domain/interfaces/device-repository.interface';
import {DeviceNotFoundException} from '@iotpilot/core/device/domain/exceptions/device-not-found.exception';
import {DeviceRemovedEvent} from '@iotpilot/core/device/domain/events/device-removed.event';
import {EventBus} from '@iotpilot/core/shared/application/bus/event.bus';

/**
 * Handler for removing a device
 */
export class RemoveDeviceHandler implements CommandHandler<RemoveDeviceCommand, void> {
  constructor(
    private readonly deviceRemover: DeviceRemover,
    private readonly deviceRepository: DeviceRepository,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Handles the remove device command
   * @param command The remove device command
   */
  async handle(command: RemoveDeviceCommand): Promise<void> {
    // Find the device to get its details before removal
    const device = await this.deviceRepository.findById(command.deviceId, command.getTenantContext());
    if (!device) {
      throw new DeviceNotFoundException(`Device with ID ${command.deviceId.getValue()} not found`);
    }

    // Remove the device using the device remover service
    await this.deviceRemover.removeDevice(command.deviceId);

    // Publish device removed event
    const event = new DeviceRemovedEvent(
      command.deviceId,
      device.name,
      command.getTenantContext().getUserId().getValue(),
      command.customerId
    );
    
    await this.eventBus.publish(event);
  }
}