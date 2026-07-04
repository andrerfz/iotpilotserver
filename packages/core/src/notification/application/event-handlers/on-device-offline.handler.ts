import { EventHandler } from '@iotpilot/core/shared/application/bus/event.bus';
import { DeviceDisconnectedEvent } from '@iotpilot/core/device/domain/events/device-disconnected.event';
import { CommandBus } from '@iotpilot/core/shared/application/bus/command.bus';
import { DispatchNotificationCommand } from '../commands/dispatch-notification/dispatch-notification.command';
import { renderEmailLayout } from '@iotpilot/core/shared/infrastructure/services/email-layout';
import { NotificationRoutingService } from '../../domain/services/notification-routing.service';
import { TenantContextImpl } from '@iotpilot/core/shared/application/context/tenant-context.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';

export class OnDeviceOfflineHandler implements EventHandler<DeviceDisconnectedEvent> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly routingService: NotificationRoutingService,
  ) {}

  async handle(event: DeviceDisconnectedEvent): Promise<void> {
    const customerId = event.tenantId.value;
    const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const deviceName = event.deviceName.getValue();
    const reason = event.disconnectionReason ? ` Reason: ${event.disconnectionReason}.` : '';
    const graceful = event.wasGraceful ? ' (graceful)' : ' (unexpected)';
    const when = event.disconnectionTimestamp.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

    const subject = `⚠️ Device Offline: ${deviceName}`;
    const content = `
  <div style="border-left:4px solid #e0ac08;background:#f6f6f7;border-radius:8px;padding:16px 18px;">
    <div style="font-size:18px;font-weight:600;">⚠️ Device went offline${graceful}</div>
    <div style="margin-top:6px;color:#555;font-size:14px;line-height:1.4;">${esc(deviceName)} stopped reporting.${reason}</div>
  </div>
  <table style="margin-top:18px;font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:4px 16px 4px 0;color:#888;">Device</td><td style="font-weight:500;">${esc(deviceName)}</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#888;">Time</td><td>${esc(when)}</td></tr>
  </table>`;
    const body = renderEmailLayout(content, 'IoT Pilot · automated alert. Manage alert emails in Settings → Notifications.');

    const routes = await this.routingService.resolveRoutesForTenant(
      { value: 'DEVICE_OFFLINE' } as any,
      CustomerId.create(customerId),
    );

    for (const route of routes) {
      await this.commandBus.execute(DispatchNotificationCommand.create({
        customerId,
        userId: route.userId,
        type: 'DEVICE_OFFLINE',
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
