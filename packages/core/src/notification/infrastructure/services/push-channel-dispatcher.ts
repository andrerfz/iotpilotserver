import { ChannelDispatcher, ChannelDispatchResult } from '../../domain/interfaces/channel-dispatcher.interface';
import { NotificationRecordEntity } from '../../domain/entities/notification-record.entity';
import { HttpClient } from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

export class PushChannelDispatcher implements ChannelDispatcher {
  readonly channel = 'PUSH';

  private readonly appId: string;
  private readonly apiKey: string;

  constructor(private readonly httpClient: HttpClient) {
    this.appId = process.env.PUSHER_APP_ID ?? '';
    this.apiKey = process.env.PUSHER_API_KEY ?? '';
  }

  async dispatch(record: NotificationRecordEntity): Promise<ChannelDispatchResult> {
    if (!this.appId || !this.apiKey) {
      return { success: false, error: 'Pusher not configured' };
    }
    const channelId = record.recipient.getValue();
    try {
      await this.httpClient.post(
        `https://api.pusherapp.com/apps/${this.appId}/events`,
        {
          name: record.type.value,
          channels: [channelId],
          data: JSON.stringify({
            subject: record.subject.getValue(),
            body: record.body.getValue(),
            sourceEntityId: record.sourceEntityId?.getValue() ?? null,
          }),
        },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` } },
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
