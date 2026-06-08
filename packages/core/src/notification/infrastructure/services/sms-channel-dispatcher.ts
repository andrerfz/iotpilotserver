import { ChannelDispatcher, ChannelDispatchResult } from '../../domain/interfaces/channel-dispatcher.interface';
import { NotificationRecordEntity } from '../../domain/entities/notification-record.entity';
import { HttpClient } from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

export class SmsChannelDispatcher implements ChannelDispatcher {
  readonly channel = 'SMS';

  private readonly enabled: boolean;
  private readonly apiKey: string;
  private readonly fromNumber: string;
  private readonly provider: string;

  constructor(private readonly httpClient: HttpClient) {
    this.enabled = process.env.SMS_NOTIFICATIONS_ENABLED === 'true';
    this.apiKey = process.env.SMS_API_KEY ?? '';
    this.fromNumber = process.env.SMS_FROM_NUMBER ?? '';
    this.provider = process.env.SMS_PROVIDER ?? 'twilio';
  }

  async dispatch(record: NotificationRecordEntity): Promise<ChannelDispatchResult> {
    if (!this.enabled) return { success: true };
    if (!this.apiKey || !this.fromNumber) {
      return { success: false, error: 'SMS provider not configured' };
    }
    try {
      await this.sendViaTwilio(record.recipient.getValue(), record.body.getValue());
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendViaTwilio(to: string, body: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.apiKey}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: this.fromNumber, Body: body });
    const credentials = Buffer.from(`${this.apiKey}:${process.env.SMS_AUTH_TOKEN ?? ''}`).toString('base64');
    await this.httpClient.post(url, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
    });
  }
}
