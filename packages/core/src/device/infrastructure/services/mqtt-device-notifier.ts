import {DeviceNotification, NotificationType} from '@iotpilot/core/device/domain/interfaces/device-notification.interface';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {DeviceStatus} from '@iotpilot/core/device/domain/value-objects/device-status.vo';
import * as mqtt from 'mqtt';

/**
 * Implementation of DeviceNotification using MQTT
 */
export class MQTTDeviceNotifier implements DeviceNotification {
  private readonly client: ReturnType<typeof mqtt.connect>;
  private readonly baseTopic: string;
  private readonly subscriptions: Map<string, Set<string>> = new Map();

  constructor(
    brokerUrl: string,
    clientId: string = `iotpilot-server-${Date.now()}`,
    baseTopic: string = 'iotpilot/devices'
  ) {
    this.client = mqtt.connect(brokerUrl, {
      clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000
    });
    this.baseTopic = baseTopic;

    // Set up event handlers
    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
    });

    this.client.on('error', (error) => {
      console.error('MQTT connection error:', error);
    });
  }

  private getDeviceTopic(deviceId: DeviceId, notificationType: NotificationType): string {
    return `${this.baseTopic}/${deviceId.getValue()}/${notificationType}`;
  }

  private publishNotification(topic: string, payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(
        topic,
        JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString()
        }),
        { qos: 1, retain: false },
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async sendStatusChangeNotification(
    deviceId: DeviceId,
    oldStatus: DeviceStatus,
    newStatus: DeviceStatus
  ): Promise<void> {
    const topic = this.getDeviceTopic(deviceId, NotificationType.STATUS_CHANGE);
    
    await this.publishNotification(topic, {
      deviceId: deviceId.getValue(),
      oldStatus: oldStatus.getValue(),
      newStatus: newStatus.getValue()
    });
  }

  async sendMetricsAlert(
    deviceId: DeviceId,
    metricName: string,
    value: number,
    threshold: number
  ): Promise<void> {
    const topic = this.getDeviceTopic(deviceId, NotificationType.METRICS_ALERT);
    
    await this.publishNotification(topic, {
      deviceId: deviceId.getValue(),
      metricName,
      value,
      threshold,
      exceededBy: value - threshold
    });
  }

  async sendConnectionIssueNotification(
    deviceId: DeviceId,
    errorMessage: string
  ): Promise<void> {
    const topic = this.getDeviceTopic(deviceId, NotificationType.CONNECTION_ISSUE);
    
    await this.publishNotification(topic, {
      deviceId: deviceId.getValue(),
      errorMessage
    });
  }

  async sendSecurityAlert(
    deviceId: DeviceId,
    alertType: string,
    details: string
  ): Promise<void> {
    const topic = this.getDeviceTopic(deviceId, NotificationType.SECURITY_ALERT);
    
    await this.publishNotification(topic, {
      deviceId: deviceId.getValue(),
      alertType,
      details
    });
  }

  async subscribeToNotifications(
    userId: string,
    deviceIds: DeviceId[],
    notificationTypes: NotificationType[]
  ): Promise<void> {
    // Create a set of topics for this user if it doesn't exist
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    
    const userTopics = this.subscriptions.get(userId)!;
    
    // Subscribe to each device and notification type
    for (const deviceId of deviceIds) {
      for (const notificationType of notificationTypes) {
        const topic = this.getDeviceTopic(deviceId, notificationType);
        
        // Add to user's subscriptions
        userTopics.add(topic);
        
        // Subscribe to the topic
        await new Promise<void>((resolve, reject) => {
          this.client.subscribe(topic, { qos: 1 }, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
    }
  }

  async unsubscribeFromNotifications(
    userId: string,
    deviceIds?: DeviceId[],
    notificationTypes?: NotificationType[]
  ): Promise<void> {
    // If user has no subscriptions, do nothing
    if (!this.subscriptions.has(userId)) {
      return;
    }
    
    const userTopics = this.subscriptions.get(userId)!;
    
    // If no device IDs or notification types specified, unsubscribe from all
    if (!deviceIds && !notificationTypes) {
      // Unsubscribe from all topics
      for (const topic of userTopics) {
        await new Promise<void>((resolve, reject) => {
          this.client.unsubscribe(topic, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
      
      // Clear user's subscriptions
      this.subscriptions.delete(userId);
      return;
    }
    
    // Unsubscribe from specific topics
    const topicsToRemove: string[] = [];
    
    for (const topic of userTopics) {
      // Parse the topic to get device ID and notification type
      const parts = topic.split('/');
      const topicDeviceId = parts[parts.length - 2];
      const topicNotificationType = parts[parts.length - 1] as NotificationType;
      
      // Check if this topic should be unsubscribed
      const shouldUnsubscribe = (
        // If device IDs specified, check if this topic's device ID is in the list
        (!deviceIds || deviceIds.some(id => id.getValue() === topicDeviceId)) &&
        // If notification types specified, check if this topic's type is in the list
        (!notificationTypes || notificationTypes.includes(topicNotificationType))
      );
      
      if (shouldUnsubscribe) {
        // Unsubscribe from the topic
        await new Promise<void>((resolve, reject) => {
          this.client.unsubscribe(topic, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        
        // Add to list of topics to remove
        topicsToRemove.push(topic);
      }
    }
    
    // Remove unsubscribed topics from user's subscriptions
    for (const topic of topicsToRemove) {
      userTopics.delete(topic);
    }
    
    // If user has no more subscriptions, remove the user
    if (userTopics.size === 0) {
      this.subscriptions.delete(userId);
    }
  }
  
  // Method to close the MQTT connection
  async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.end(false, {}, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}