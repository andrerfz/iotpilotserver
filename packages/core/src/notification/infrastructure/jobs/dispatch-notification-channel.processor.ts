import type { JobData, JobProcessor, JobResult } from '@iotpilot/core/shared/application/interfaces/job-queue.interface';
import { AppContainer } from '@iotpilot/core/shared/infrastructure/container/app-container';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { NotificationRecordRepository } from '@iotpilot/core/notification/domain/interfaces/notification-record.repository';
import { NotificationRecordId } from '@iotpilot/core/notification/domain/value-objects/notification-record-id.vo';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { MarkNotificationDeliveredCommand } from '@iotpilot/core/notification/application/commands/mark-notification-delivered/mark-notification-delivered.command';
import { MarkNotificationFailedCommand } from '@iotpilot/core/notification/application/commands/mark-notification-failed/mark-notification-failed.command';
import type { ChannelDispatcher } from '@iotpilot/core/notification/domain/interfaces/channel-dispatcher.interface';
import type { EmailService } from '@iotpilot/core/shared/domain/interfaces/email-service.interface';
import { AxiosHttpClientService } from '@iotpilot/core/shared/infrastructure/http/axios-http-client.service';
import { EmailChannelDispatcher } from '../services/email-channel-dispatcher';
import { SlackChannelDispatcher } from '../services/slack-channel-dispatcher';
import { SmsChannelDispatcher } from '../services/sms-channel-dispatcher';
import { WebhookChannelDispatcher } from '../services/webhook-channel-dispatcher';
import { PushChannelDispatcher } from '../services/push-channel-dispatcher';

export class DispatchNotificationChannelProcessor implements JobProcessor {
  readonly jobType = 'dispatch-notification-channel';

  async process(data: JobData): Promise<JobResult> {
    const { notificationRecordId, customerId } = data.payload as {
      notificationRecordId: string;
      customerId: string;
    };

    const repo = AppContainer.resolve<NotificationRecordRepository>('NotificationRecordRepository');
    const commandBus = ServiceContainer.getInstance().getCommandBus();

    const record = await repo.findById(
      NotificationRecordId.create(notificationRecordId),
      CustomerId.create(customerId),
    );

    if (!record) {
      return { success: false, error: `NotificationRecord not found: ${notificationRecordId}` };
    }

    // Idempotency: already reached a terminal state (delivered, dead, cancelled)
    if (record.status.isTerminal()) {
      console.log(`[DispatchProcessor] Skipping terminal record ${notificationRecordId} status=${record.status.value}`);
      return { success: true, data: { skipped: true, status: record.status.value } };
    }

    // Transition to SENDING before calling the channel — provides an in-progress audit trail
    try {
      record.markAsSending();
    } catch {
      // Race: became terminal between load and here
      return { success: true, data: { skipped: true } };
    }
    await repo.save(record);

    const dispatcher = this.resolveDispatcher(record.channel.value);
    if (!dispatcher) {
      const err = `Channel dispatcher not configured: ${record.channel.value}`;
      console.error(`[DispatchProcessor] ${err} record=${notificationRecordId}`);
      try {
        await commandBus.execute(MarkNotificationFailedCommand.create(notificationRecordId, customerId, err));
      } catch (markErr) {
        console.error(`[DispatchProcessor] Failed to mark as failed: ${(markErr as Error).message}`);
      }
      return { success: false, error: err };
    }

    const result = await dispatcher.dispatch(record);

    if (result.success) {
      try {
        await commandBus.execute(MarkNotificationDeliveredCommand.create(notificationRecordId, customerId));
      } catch (markErr) {
        // Dispatch succeeded but state update failed — log and return success to
        // prevent BullMQ from retrying (which would re-send the notification).
        console.error(`[DispatchProcessor] Dispatch succeeded but mark-delivered failed: ${(markErr as Error).message}`);
      }
      console.log(`[DispatchProcessor] Delivered record=${notificationRecordId} channel=${record.channel.value}`);
      return { success: true, data: { channel: record.channel.value } };
    } else {
      const errMsg = (result.error ?? 'Channel dispatch failed').slice(0, 1999);
      try {
        await commandBus.execute(MarkNotificationFailedCommand.create(notificationRecordId, customerId, errMsg));
      } catch (markErr) {
        console.error(`[DispatchProcessor] Failed to mark as failed: ${(markErr as Error).message}`);
      }
      console.error(`[DispatchProcessor] Failed record=${notificationRecordId} channel=${record.channel.value} error=${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  private resolveDispatcher(channel: string): ChannelDispatcher | null {
    const httpClient = new AxiosHttpClientService();
    switch (channel) {
      case 'EMAIL': {
        try {
          const emailService = AppContainer.resolve<EmailService>('EmailService');
          return new EmailChannelDispatcher(emailService);
        } catch {
          console.warn('[DispatchProcessor] EmailService not available');
          return null;
        }
      }
      case 'SLACK':
        return new SlackChannelDispatcher(httpClient);
      case 'SMS':
        return new SmsChannelDispatcher(httpClient);
      case 'WEBHOOK':
        return new WebhookChannelDispatcher(httpClient);
      case 'PUSH':
        return new PushChannelDispatcher(httpClient);
      default:
        return null;
    }
  }
}
