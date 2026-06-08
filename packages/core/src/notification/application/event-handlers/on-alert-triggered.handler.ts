import { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import { AlertTriggeredEvent } from '@iotpilot/core/monitoring/domain/events/alert-triggered.event';
import { CommandBus } from '@iotpilot/core/shared/application/bus/command.bus';
import { DispatchNotificationCommand } from '../commands/dispatch-notification/dispatch-notification.command';
import { NotificationRoutingService } from '../../domain/services/notification-routing.service';
import { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class OnAlertTriggeredHandler implements EventHandler<AlertTriggeredEvent> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly routingService: NotificationRoutingService,
  ) {}

  async handle(event: AlertTriggeredEvent): Promise<void> {
    const customerId = event.tenantId.value;
    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));

    const severity = event.severity.value;
    const isCritical = severity === 'CRITICAL' || severity === 'HIGH';
    const subject = `${isCritical ? '🔴' : '🟡'} ${severity} Alert Triggered`;
    const body = `Alert ID: ${event.alertId.value}\nDevice: ${event.deviceId.value}\nThreshold: ${event.thresholdId.value}\nSeverity: ${severity}`;

    const routes = await this.routingService.resolveRoutes(
      { value: 'ALERT_TRIGGERED' } as any,
      CustomerId.create(customerId),
      'system',
      null,
    );

    for (const route of routes) {
      await this.commandBus.execute(DispatchNotificationCommand.create({
        customerId,
        userId: route.userId === 'system' ? null : route.userId,
        type: 'ALERT_TRIGGERED',
        channel: route.channel,
        recipient: route.destination ?? '',
        subject,
        body,
        sourceEventId: event.eventId,
        sourceEntityId: event.alertId.value,
        tenantContext,
      }));
    }
  }
}
