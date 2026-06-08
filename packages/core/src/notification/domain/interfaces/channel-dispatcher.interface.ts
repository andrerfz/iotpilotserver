import { NotificationRecordEntity } from '../entities/notification-record.entity';

export interface ChannelDispatchResult {
  success: boolean;
  error?: string;
}

export interface ChannelDispatcher {
  readonly channel: string;
  dispatch(record: NotificationRecordEntity): Promise<ChannelDispatchResult>;
}
