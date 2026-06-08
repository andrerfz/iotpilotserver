import { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import { AlertResolvedEvent } from '@iotpilot/core/monitoring/domain/events/alert-resolved.event';
import { CommandBus } from '@iotpilot/core/shared/application/bus/command.bus';
import { DispatchNotificationCommand } from '../commands/dispatch-notification/dispatch-notification.command';
import { NotificationRoutingService } from '../../domain/services/notification-routing.service';
import { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class OnAlertResolvedHandler implements EventHandler<AlertResolvedEvent> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly routingService: NotificationRoutingService,
  ) {}

  async handle(event: AlertResolvedEvent): Promise<void> {
    const customerId = event.tenantId?.value;
    if (!customerId) return;

    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
    const routes = await this.routingService.resolveRoutes(
      { value: 'ALERT_RESOLVED' } as any,
      CustomerId.create(customerId),
      'system',
      null,
    );

    for (const route of routes) {
      await this.commandBus.execute(DispatchNotificationCommand.create({
        customerId,
        userId: route.userId === 'system' ? null : route.userId,
        type: 'ALERT_RESOLVED',
        channel: route.channel,
        recipient: route.destination ?? '',
        subject: '✅ Alert Resolved',
        body: `Alert ${(event as any).alertId?.value ?? ''} has been resolved.`,
        sourceEventId: event.eventId,
        sourceEntityId: (event as any).alertId?.value ?? null,
        tenantContext,
      }));
    }
  }
}
