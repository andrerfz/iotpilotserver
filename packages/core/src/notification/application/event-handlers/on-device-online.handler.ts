import { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import { DeviceConnectedEvent } from '@iotpilot/core/device/domain/events/device-connected.event';
import { CommandBus } from '@iotpilot/core/shared/application/bus/command.bus';
import { DispatchNotificationCommand } from '../commands/dispatch-notification/dispatch-notification.command';
import { NotificationRoutingService } from '../../domain/services/notification-routing.service';
import { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class OnDeviceOnlineHandler implements EventHandler<DeviceConnectedEvent> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly routingService: NotificationRoutingService,
  ) {}

  async handle(event: DeviceConnectedEvent): Promise<void> {
    const customerId = event.tenantId.value;
    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));

    const deviceName = event.deviceName.getValue();
    const ip = event.ipAddress.getValue();

    const subject = `✅ Device Online: ${deviceName}`;
    const body = `Device "${deviceName}" (ID: ${event.deviceId.getValue()}) is now online. IP: ${ip}`;

    const routes = await this.routingService.resolveRoutesForTenant(
      { value: 'DEVICE_ONLINE' } as any,
      CustomerId.create(customerId),
    );

    for (const route of routes) {
      await this.commandBus.execute(DispatchNotificationCommand.create({
        customerId,
        userId: route.userId,
        type: 'DEVICE_ONLINE',
        channel: route.channel,
        recipient: route.destination ?? '',
        subject,
        body,
        sourceEventId: event.eventId,
        sourceEntityId: event.deviceId.getValue(),
        tenantContext,
      }));
    }
  }
}
