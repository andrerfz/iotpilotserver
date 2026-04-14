import { ChannelDispatcher, ChannelDispatchResult } from '../../domain/interfaces/channel-dispatcher.interface';
import { NotificationRecordEntity } from '../../domain/entities/notification-record.entity';
import { EmailService } from '@iotpilot/core/shared/domain/interfaces/email-service.interface';

export class EmailChannelDispatcher implements ChannelDispatcher {
  readonly channel = 'EMAIL';

  constructor(private readonly emailService: EmailService) {}

  async dispatch(record: NotificationRecordEntity): Promise<ChannelDispatchResult> {
    try {
      await this.emailService.send({
        to: record.recipient.getValue(),
        subject: record.subject.getValue(),
        html: record.body.getValue(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
