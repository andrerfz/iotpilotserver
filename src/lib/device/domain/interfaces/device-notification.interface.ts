import {Device} from '../entities/device.entity';
import {DeviceId} from '../value-objects/device-id.vo';
import {DeviceStatus} from '../value-objects/device-status.vo';

/**
 * Notification severity levels
 */
export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Notification type for device events
 */
export enum DeviceNotificationType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  METRICS_ALERT = 'METRICS_ALERT',
  CONNECTION_ISSUE = 'CONNECTION_ISSUE',
  SECURITY_ALERT = 'SECURITY_ALERT',
  MAINTENANCE = 'MAINTENANCE',
  SYSTEM = 'SYSTEM'
}

/**
 * Interface for device notification operations
 * Defines the contract for sending notifications about device events
 */
export interface DeviceNotification {
  /**
   * Send a notification about a device event
   * @param device The device the notification is about
   * @param type The type of notification
   * @param message The notification message
   * @param severity The severity level of the notification
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the notification was sent successfully
   */
  sendNotification(
    device: Device,
    type: DeviceNotificationType,
    message: string,
    severity: NotificationSeverity,
    tenantId: string
  ): Promise<boolean>;

  /**
   * Send a notification about a device event by device ID
   * @param deviceId The ID of the device the notification is about
   * @param type The type of notification
   * @param message The notification message
   * @param severity The severity level of the notification
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the notification was sent successfully
   */
  sendNotificationById(
    deviceId: DeviceId,
    type: DeviceNotificationType,
    message: string,
    severity: NotificationSeverity,
    tenantId: string
  ): Promise<boolean>;

  /**
   * Send a notification about a device status change
   * @param device The device the notification is about
   * @param oldStatus The previous status of the device
   * @param newStatus The new status of the device
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the notification was sent successfully
   */
  notifyStatusChange(
    device: Device,
    oldStatus: DeviceStatus,
    newStatus: DeviceStatus,
    tenantId: string
  ): Promise<boolean>;

  /**
   * Send a notification about a device metrics alert
   * @param device The device the notification is about
   * @param metricName The name of the metric that triggered the alert
   * @param metricValue The value of the metric that triggered the alert
   * @param threshold The threshold that was exceeded
   * @param severity The severity level of the alert
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the notification was sent successfully
   */
  notifyMetricsAlert(
    device: Device,
    metricName: string,
    metricValue: number | string,
    threshold: number | string,
    severity: NotificationSeverity,
    tenantId: string
  ): Promise<boolean>;

  /**
   * Send a notification about a device connection issue
   * @param device The device the notification is about
   * @param issue The description of the connection issue
   * @param severity The severity level of the issue
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the notification was sent successfully
   */
  notifyConnectionIssue(
    device: Device,
    issue: string,
    severity: NotificationSeverity,
    tenantId: string
  ): Promise<boolean>;

  /**
   * Send a notification about a device security alert
   * @param device The device the notification is about
   * @param alert The description of the security alert
   * @param severity The severity level of the alert
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to true if the notification was sent successfully
   */
  notifySecurityAlert(
    device: Device,
    alert: string,
    severity: NotificationSeverity,
    tenantId: string
  ): Promise<boolean>;

  /**
   * Subscribe to notifications for a specific device
   * @param deviceId The ID of the device to subscribe to
   * @param callback The callback function to be called when a notification is received
   * @param tenantId The tenant ID (for multi-tenant support)
   * @returns Promise resolving to a subscription ID that can be used to unsubscribe
   */
  subscribeToDevice(
    deviceId: DeviceId,
    callback: (notification: {
      deviceId: string;
      type: DeviceNotificationType;
      message: string;
      severity: NotificationSeverity;
      timestamp: Date;
    }) => void,
    tenantId: string
  ): Promise<string>;

  /**
   * Unsubscribe from notifications
   * @param subscriptionId The subscription ID returned from subscribeToDevice
   * @returns Promise resolving to true if the unsubscription was successful
   */
  unsubscribe(subscriptionId: string): Promise<boolean>;
}