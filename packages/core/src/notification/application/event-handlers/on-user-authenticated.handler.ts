import { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import { UserAuthenticatedEvent } from '@iotpilot/core/user/domain/events/user-authenticated.event';
import { CommandBus } from '@iotpilot/core/shared/application/bus/command.bus';
import { DispatchNotificationCommand } from '../commands/dispatch-notification/dispatch-notification.command';
import { NotificationRoutingService } from '../../domain/services/notification-routing.service';
import { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class OnUserAuthenticatedHandler implements EventHandler<UserAuthenticatedEvent> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly routingService: NotificationRoutingService,
  ) {}

  async handle(event: UserAuthenticatedEvent): Promise<void> {
    // customerId is carried by the event — no repository lookup needed
    const customerId = event.customerId?.getValue();
    if (!customerId) return; // SUPERADMIN logins have no tenant scope

    const userId = event.userId.getValue();
    const userEmail = event.email.getValue();

    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));

    // resolveRoutes checks loginNotifications preference via isNotificationAllowed
    const routes = await this.routingService.resolveRoutes(
      { value: 'USER_LOGIN_ALERT' } as any,
      CustomerId.create(customerId),
      userId,
      userEmail,
    );

    for (const route of routes) {
      await this.commandBus.execute(DispatchNotificationCommand.create({
        customerId,
        userId,
        type: 'USER_LOGIN_ALERT',
        channel: route.channel,
        recipient: route.destination ?? userEmail,
        subject: '🔐 New login to your account',
        body: `A new login was detected for your account (${userEmail}). If this wasn't you, revoke your sessions immediately.`,
        sourceEventId: event.eventId,
        sourceEntityId: userId,
        tenantContext,
      }));
    }
  }
}
