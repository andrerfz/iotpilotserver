import {AlertEntity} from '../entities/alert.entity';
import {AlertSeverity} from '../value-objects/alert-severity.vo';

/**
 * Represents a notification channel for alerts
 */
export interface NotificationChannel {
    /**
     * The name of the notification channel
     */
    name: string;
    
    /**
     * The type of the notification channel (email, slack, sms, etc.)
     */
    type: string;
    
    /**
     * The minimum severity level required to send notifications through this channel
     */
    minimumSeverity: AlertSeverity;
    
    /**
     * Whether the channel is enabled
     */
    enabled: boolean;
    
    /**
     * Configuration for the notification channel
     */
    config: Record<string, any>;
}

/**
 * Domain service responsible for dispatching notifications for alerts
 */
export class NotificationDispatcher {
    /**
     * Determines if a notification should be sent for an alert through a specific channel
     * 
     * @param alert The alert to check
     * @param channel The notification channel to check
     * @returns true if a notification should be sent, false otherwise
     */
    shouldNotify(alert: AlertEntity, channel: NotificationChannel): boolean {
        // Check if the channel is enabled
        if (!channel.enabled) {
            return false;
        }
        
        // Check if the alert severity meets the minimum severity for the channel
        return alert.severity.isHigherThan(channel.minimumSeverity) || 
               alert.severity.equals(channel.minimumSeverity);
    }
    
    /**
     * Filters notification channels that should be used for an alert
     * 
     * @param alert The alert to filter channels for
     * @param channels All available notification channels
     * @returns Channels that should be used for the alert
     */
    getChannelsForAlert(alert: AlertEntity, channels: NotificationChannel[]): NotificationChannel[] {
        return channels.filter(channel => this.shouldNotify(alert, channel));
    }
    
    /**
     * Prepares notification data for an alert
     * 
     * @param alert The alert to prepare notification data for
     * @returns Notification data for the alert
     */
    prepareNotificationData(alert: AlertEntity): Record<string, any> {
        // Create metadata object from specific properties
        const metadata = {
            metricName: alert.metricName,
            metricValue: alert.metricValue?.value,
            metricUnit: alert.metricValue?.unit,
            thresholdValue: alert.thresholdValue,
            notes: alert.notes
        };
        
        return {
            id: alert.id.value,
            title: alert.title,
            message: alert.message,
            severity: alert.severity.value,
            status: alert.status.value,
            deviceId: alert.deviceId?.value ?? 'system',
            createdAt: alert.createdAt.toISOString(),
            metadata: metadata
        };
    }
    
    /**
     * Formats a notification message for an alert based on a template
     * 
     * @param alert The alert to format a message for
     * @param template The message template
     * @returns The formatted message
     */
    formatNotificationMessage(alert: AlertEntity, template: string): string {
        // Replace placeholders in the template with alert data
        let message = template;
        
        message = message.replace('{id}', alert.id.value);
        message = message.replace('{title}', alert.title);
        message = message.replace('{message}', alert.message);
        message = message.replace('{severity}', alert.severity.value);
        message = message.replace('{status}', alert.status.value);
        message = message.replace('{deviceId}', alert.deviceId?.value ?? 'system');
        message = message.replace('{createdAt}', alert.createdAt.toISOString());
        
        // Replace specific metadata placeholders
        message = message.replace('{metadata.metricName}', alert.metricName || '');
        message = message.replace('{metadata.metricValue}', String(alert.metricValue?.value || ''));
        message = message.replace('{metadata.metricUnit}', alert.metricValue?.unit || '');
        message = message.replace('{metadata.thresholdValue}', String(alert.thresholdValue || ''));
        message = message.replace('{metadata.notes}', alert.notes || '');
        
        return message;
    }
}