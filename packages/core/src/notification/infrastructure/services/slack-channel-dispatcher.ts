import { ChannelDispatcher, ChannelDispatchResult } from '../../domain/interfaces/channel-dispatcher.interface';
import { NotificationRecordEntity } from '../../domain/entities/notification-record.entity';
import { HttpClient } from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

export class SlackChannelDispatcher implements ChannelDispatcher {
  readonly channel = 'SLACK';

  constructor(private readonly httpClient: HttpClient) {}

  async dispatch(record: NotificationRecordEntity): Promise<ChannelDispatchResult> {
    const webhookUrl = record.recipient.getValue();
    try {
      await this.httpClient.post(webhookUrl, {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: record.subject.getValue(), emoji: true },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: record.body.getValue() },
          },
        ],
      }, { headers: { 'Content-Type': 'application/json' } });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
