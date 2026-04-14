import { ChannelDispatcher, ChannelDispatchResult } from '../../domain/interfaces/channel-dispatcher.interface';
import { NotificationRecordEntity } from '../../domain/entities/notification-record.entity';
import { HttpClient } from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

export class WebhookChannelDispatcher implements ChannelDispatcher {
  readonly channel = 'WEBHOOK';

  constructor(private readonly httpClient: HttpClient) {}

  async dispatch(record: NotificationRecordEntity): Promise<ChannelDispatchResult> {
    const url = record.recipient.getValue();
    try {
      await this.httpClient.post(url, {
        notificationId: record.getId().getValue(),
        type: record.type.value,
        subject: record.subject.getValue(),
        body: record.body.getValue(),
        sourceEntityId: record.sourceEntityId?.getValue() ?? null,
        occurredAt: new Date().toISOString(),
      }, { headers: { 'Content-Type': 'application/json' } });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
