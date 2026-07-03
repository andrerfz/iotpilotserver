import { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import { AlertTriggeredEvent } from '@iotpilot/core/monitoring/domain/events/alert-triggered.event';
import { CommandBus } from '@iotpilot/core/shared/application/bus/command.bus';
import { DispatchNotificationCommand } from '../commands/dispatch-notification/dispatch-notification.command';
import { renderEmailLayout } from '@iotpilot/core/shared/infrastructure/services/email-layout';
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
    const emoji = isCritical ? '🔴' : '🟡';
    const accent = isCritical ? '#c5000f' : '#e0ac08';
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const title = event.title ?? `${severity} Alert`;
    const deviceName = event.deviceName ?? event.deviceId.value;
    const message = event.message ?? '';
    const when = String((event.eventData?.timestamp as string) ?? new Date().toISOString())
      .replace('T', ' ').slice(0, 19) + ' UTC';

    const subject = `${emoji} ${title}`;
    const content = `
  <div style="border-left:4px solid ${accent};background:#f6f6f7;border-radius:8px;padding:16px 18px;">
    <div style="font-size:18px;font-weight:600;">${emoji} ${esc(title)}</div>
    ${message ? `<div style="margin-top:6px;color:#555;font-size:14px;line-height:1.4;">${esc(message)}</div>` : ''}
  </div>
  <table style="margin-top:18px;font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:4px 16px 4px 0;color:#888;">Device</td><td style="font-weight:500;">${esc(deviceName)}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;">Severity</td><td><strong style="color:${accent};">${esc(severity)}</strong></td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;">Time</td><td>${esc(when)}</td></tr>
  </table>`;
    const body = renderEmailLayout(content, 'IoT Pilot · automated alert. Manage alert emails in Settings → Notifications.');

    const routes = await this.routingService.resolveRoutesForTenant(
      { value: 'ALERT_TRIGGERED' } as any,
      CustomerId.create(customerId),
    );

    for (const route of routes) {
      await this.commandBus.execute(DispatchNotificationCommand.create({
        customerId,
        userId: route.userId,
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
