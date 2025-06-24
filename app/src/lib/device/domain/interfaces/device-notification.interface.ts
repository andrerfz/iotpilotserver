import { DeviceId } from '../value-objects/device-id.vo';
import { DeviceStatus } from '../value-objects/device-status.vo';

export enum NotificationType {
    STATUS_CHANGE = 'status_change',
    METRICS_ALERT = 'metrics_alert',
    CONNECTION_ISSUE = 'connection_issue',
    SECURITY_ALERT = 'security_alert'
}

export interface DeviceNotification {
    sendStatusChangeNotification(
        deviceId: DeviceId,
        oldStatus: DeviceStatus,
        newStatus: DeviceStatus
    ): Promise<void>;
    
    sendMetricsAlert(
        deviceId: DeviceId,
        metricName: string,
        value: number,
        threshold: number
    ): Promise<void>;
    
    sendConnectionIssueNotification(
        deviceId: DeviceId,
        errorMessage: string
    ): Promise<void>;
    
    sendSecurityAlert(
        deviceId: DeviceId,
        alertType: string,
        details: string
    ): Promise<void>;
    
    subscribeToNotifications(
        userId: string,
        deviceIds: DeviceId[],
        notificationTypes: NotificationType[]
    ): Promise<void>;
    
    unsubscribeFromNotifications(
        userId: string,
        deviceIds?: DeviceId[],
        notificationTypes?: NotificationType[]
    ): Promise<void>;
}