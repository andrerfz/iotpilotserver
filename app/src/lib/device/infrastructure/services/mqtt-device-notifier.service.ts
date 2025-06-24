import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceStatus } from '../../domain/value-objects/device-status.vo';
import { DeviceNotification, NotificationType } from '../../domain/interfaces/device-notification.interface';
import * as mqtt from 'mqtt';

export class MQTTDeviceNotifierService implements DeviceNotification {
  private client: mqtt.Client;
  private readonly baseTopic: string;
  private readonly subscriptions: Map<string, Set<NotificationType>> = new Map();

  constructor(
    private readonly brokerUrl: string,
    baseTopic: string = 'iot-pilot/devices'
  ) {
    this.baseTopic = baseTopic;
    this.client = mqtt.connect(brokerUrl, {
      clientId: `iot-pilot-notifier-${Date.now()}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
    });

    this.client.on('error', (error) => {
      console.error('MQTT connection error:', error);
    });
  }

  async sendStatusChangeNotification(
    deviceId: DeviceId,
    oldStatus: DeviceStatus,
    newStatus: DeviceStatus
  ): Promise<void> {
    const topic = `${this.baseTopic}/${deviceId.value}/status`;
    const payload = JSON.stringify({
      deviceId: deviceId.value,
      oldStatus: oldStatus.value,
      newStatus: newStatus.value,
      timestamp: new Date().toISOString()
    });

    await this.publishMessage(topic, payload);
  }

  async sendMetricsAlert(
    deviceId: DeviceId,
    metricName: string,
    value: number,
    threshold: number
  ): Promise<void> {
    const topic = `${this.baseTopic}/${deviceId.value}/metrics/alerts`;
    const payload = JSON.stringify({
      deviceId: deviceId.value,
      metricName,
      value,
      threshold,
      timestamp: new Date().toISOString()
    });

    await this.publishMessage(topic, payload);
  }

  async sendConnectionIssueNotification(
    deviceId: DeviceId,
    errorMessage: string
  ): Promise<void> {
    const topic = `${this.baseTopic}/${deviceId.value}/connection/issues`;
    const payload = JSON.stringify({
      deviceId: deviceId.value,
      errorMessage,
      timestamp: new Date().toISOString()
    });

    await this.publishMessage(topic, payload);
  }

  async sendSecurityAlert(
    deviceId: DeviceId,
    alertType: string,
    details: string
  ): Promise<void> {
    const topic = `${this.baseTopic}/${deviceId.value}/security/alerts`;
    const payload = JSON.stringify({
      deviceId: deviceId.value,
      alertType,
      details,
      timestamp: new Date().toISOString()
    });

    await this.publishMessage(topic, payload);
  }

  async subscribeToNotifications(
    userId: string,
    deviceIds: DeviceId[],
    notificationTypes: NotificationType[]
  ): Promise<void> {
    // Store subscription preferences
    for (const deviceId of deviceIds) {
      const key = `${userId}:${deviceId.value}`;
      if (!this.subscriptions.has(key)) {
        this.subscriptions.set(key, new Set());
      }
      
      const userSubscriptions = this.subscriptions.get(key);
      for (const type of notificationTypes) {
        userSubscriptions.add(type);
      }
    }

    // Subscribe to MQTT topics based on notification types
    for (const deviceId of deviceIds) {
      for (const type of notificationTypes) {
        let topic: string;
        
        switch (type) {
          case NotificationType.STATUS_CHANGE:
            topic = `${this.baseTopic}/${deviceId.value}/status`;
            break;
          case NotificationType.METRICS_ALERT:
            topic = `${this.baseTopic}/${deviceId.value}/metrics/alerts`;
            break;
          case NotificationType.CONNECTION_ISSUE:
            topic = `${this.baseTopic}/${deviceId.value}/connection/issues`;
            break;
          case NotificationType.SECURITY_ALERT:
            topic = `${this.baseTopic}/${deviceId.value}/security/alerts`;
            break;
          default:
            continue;
        }
        
        await this.subscribeToTopic(topic);
      }
    }
  }

  async unsubscribeFromNotifications(
    userId: string,
    deviceIds?: DeviceId[],
    notificationTypes?: NotificationType[]
  ): Promise<void> {
    // If no device IDs provided, unsubscribe from all
    if (!deviceIds || deviceIds.length === 0) {
      // Get all device IDs for this user
      const userDeviceIds = Array.from(this.subscriptions.keys())
        .filter(key => key.startsWith(`${userId}:`))
        .map(key => key.split(':')[1]);
      
      // Create DeviceId objects
      deviceIds = userDeviceIds.map(id => DeviceId.create(id));
    }

    // Update subscription preferences
    for (const deviceId of deviceIds) {
      const key = `${userId}:${deviceId.value}`;
      
      if (!this.subscriptions.has(key)) {
        continue;
      }
      
      // If notification types are specified, remove only those types
      if (notificationTypes && notificationTypes.length > 0) {
        const userSubscriptions = this.subscriptions.get(key);
        for (const type of notificationTypes) {
          userSubscriptions.delete(type);
        }
        
        // If no subscriptions left, remove the entry
        if (userSubscriptions.size === 0) {
          this.subscriptions.delete(key);
        }
      } else {
        // Remove all subscriptions for this device
        this.subscriptions.delete(key);
      }
    }

    // Unsubscribe from MQTT topics if no users are subscribed
    for (const deviceId of deviceIds) {
      // Check if any user is still subscribed to this device
      const isAnyUserSubscribed = Array.from(this.subscriptions.keys())
        .some(key => key.endsWith(`:${deviceId.value}`));
      
      if (!isAnyUserSubscribed) {
        // Unsubscribe from all topics for this device
        const topics = [
          `${this.baseTopic}/${deviceId.value}/status`,
          `${this.baseTopic}/${deviceId.value}/metrics/alerts`,
          `${this.baseTopic}/${deviceId.value}/connection/issues`,
          `${this.baseTopic}/${deviceId.value}/security/alerts`
        ];
        
        for (const topic of topics) {
          await this.unsubscribeFromTopic(topic);
        }
      }
    }
  }

  private async publishMessage(topic: string, payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, { qos: 1 }, (error) => {
        if (error) {
          reject(new Error(`Failed to publish message to ${topic}: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  private async subscribeToTopic(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          reject(new Error(`Failed to subscribe to ${topic}: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  private async unsubscribeFromTopic(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          reject(new Error(`Failed to unsubscribe from ${topic}: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  // Method to close the MQTT connection
  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.end(false, {}, (error) => {
        if (error) {
          reject(new Error(`Failed to disconnect from MQTT broker: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}