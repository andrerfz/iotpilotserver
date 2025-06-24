import { DeviceId } from '../../domain/value-objects/device-id.vo';
import { DeviceStatus } from '../../domain/value-objects/device-status.vo';
import { DeviceNotification, NotificationType } from '../../domain/interfaces/device-notification.interface';
import { Server as WebSocketServer } from 'ws';
import * as http from 'http';

export class WebSocketDeviceNotifierService implements DeviceNotification {
  private server: WebSocketServer;
  private readonly clients: Map<string, Set<WebSocket>> = new Map();
  private readonly subscriptions: Map<string, Map<string, Set<NotificationType>>> = new Map();

  constructor(httpServer?: http.Server, port: number = 8080) {
    if (httpServer) {
      // Use existing HTTP server
      this.server = new WebSocketServer({ server: httpServer });
    } else {
      // Create a new WebSocket server
      this.server = new WebSocketServer({ port });
    }

    this.server.on('connection', (ws, request) => {
      // Extract user ID from request (e.g., from query parameters or headers)
      const userId = this.extractUserIdFromRequest(request);
      if (!userId) {
        ws.close(1008, 'User ID not provided');
        return;
      }

      // Store client connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws as any);

      // Handle client disconnection
      ws.on('close', () => {
        const userClients = this.clients.get(userId);
        if (userClients) {
          userClients.delete(ws as any);
          if (userClients.size === 0) {
            this.clients.delete(userId);
          }
        }
      });

      // Handle messages from client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          // Handle subscription requests or other commands
          if (data.action === 'subscribe' && data.deviceIds && data.notificationTypes) {
            this.handleSubscribeRequest(userId, data.deviceIds, data.notificationTypes);
          } else if (data.action === 'unsubscribe') {
            this.handleUnsubscribeRequest(userId, data.deviceIds, data.notificationTypes);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
    });

    console.log(`WebSocket server started on port ${port}`);
  }

  async sendStatusChangeNotification(
    deviceId: DeviceId,
    oldStatus: DeviceStatus,
    newStatus: DeviceStatus
  ): Promise<void> {
    const notification = {
      type: NotificationType.STATUS_CHANGE,
      deviceId: deviceId.value,
      oldStatus: oldStatus.value,
      newStatus: newStatus.value,
      timestamp: new Date().toISOString()
    };

    await this.broadcastNotification(deviceId, NotificationType.STATUS_CHANGE, notification);
  }

  async sendMetricsAlert(
    deviceId: DeviceId,
    metricName: string,
    value: number,
    threshold: number
  ): Promise<void> {
    const notification = {
      type: NotificationType.METRICS_ALERT,
      deviceId: deviceId.value,
      metricName,
      value,
      threshold,
      timestamp: new Date().toISOString()
    };

    await this.broadcastNotification(deviceId, NotificationType.METRICS_ALERT, notification);
  }

  async sendConnectionIssueNotification(
    deviceId: DeviceId,
    errorMessage: string
  ): Promise<void> {
    const notification = {
      type: NotificationType.CONNECTION_ISSUE,
      deviceId: deviceId.value,
      errorMessage,
      timestamp: new Date().toISOString()
    };

    await this.broadcastNotification(deviceId, NotificationType.CONNECTION_ISSUE, notification);
  }

  async sendSecurityAlert(
    deviceId: DeviceId,
    alertType: string,
    details: string
  ): Promise<void> {
    const notification = {
      type: NotificationType.SECURITY_ALERT,
      deviceId: deviceId.value,
      alertType,
      details,
      timestamp: new Date().toISOString()
    };

    await this.broadcastNotification(deviceId, NotificationType.SECURITY_ALERT, notification);
  }

  async subscribeToNotifications(
    userId: string,
    deviceIds: DeviceId[],
    notificationTypes: NotificationType[]
  ): Promise<void> {
    // Store subscription preferences
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Map());
    }
    
    const userSubscriptions = this.subscriptions.get(userId);
    
    for (const deviceId of deviceIds) {
      if (!userSubscriptions.has(deviceId.value)) {
        userSubscriptions.set(deviceId.value, new Set());
      }
      
      const deviceSubscriptions = userSubscriptions.get(deviceId.value);
      for (const type of notificationTypes) {
        deviceSubscriptions.add(type);
      }
    }
  }

  async unsubscribeFromNotifications(
    userId: string,
    deviceIds?: DeviceId[],
    notificationTypes?: NotificationType[]
  ): Promise<void> {
    if (!this.subscriptions.has(userId)) {
      return;
    }
    
    const userSubscriptions = this.subscriptions.get(userId);
    
    // If no device IDs provided, unsubscribe from all or specific notification types
    if (!deviceIds || deviceIds.length === 0) {
      if (!notificationTypes || notificationTypes.length === 0) {
        // Unsubscribe from all
        this.subscriptions.delete(userId);
      } else {
        // Unsubscribe from specific notification types for all devices
        for (const [deviceId, deviceSubscriptions] of userSubscriptions.entries()) {
          for (const type of notificationTypes) {
            deviceSubscriptions.delete(type);
          }
          
          if (deviceSubscriptions.size === 0) {
            userSubscriptions.delete(deviceId);
          }
        }
        
        if (userSubscriptions.size === 0) {
          this.subscriptions.delete(userId);
        }
      }
    } else {
      // Unsubscribe from specific devices
      for (const deviceId of deviceIds) {
        if (!userSubscriptions.has(deviceId.value)) {
          continue;
        }
        
        if (!notificationTypes || notificationTypes.length === 0) {
          // Unsubscribe from all notification types for this device
          userSubscriptions.delete(deviceId.value);
        } else {
          // Unsubscribe from specific notification types for this device
          const deviceSubscriptions = userSubscriptions.get(deviceId.value);
          for (const type of notificationTypes) {
            deviceSubscriptions.delete(type);
          }
          
          if (deviceSubscriptions.size === 0) {
            userSubscriptions.delete(deviceId.value);
          }
        }
      }
      
      if (userSubscriptions.size === 0) {
        this.subscriptions.delete(userId);
      }
    }
  }

  private async broadcastNotification(
    deviceId: DeviceId,
    notificationType: NotificationType,
    notification: any
  ): Promise<void> {
    const message = JSON.stringify(notification);
    
    // Find all users subscribed to this device and notification type
    for (const [userId, userSubscriptions] of this.subscriptions.entries()) {
      if (userSubscriptions.has(deviceId.value)) {
        const deviceSubscriptions = userSubscriptions.get(deviceId.value);
        if (deviceSubscriptions.has(notificationType)) {
          // Send notification to all connected clients for this user
          const userClients = this.clients.get(userId);
          if (userClients) {
            for (const client of userClients) {
              if (this.isClientConnected(client)) {
                client.send(message);
              }
            }
          }
        }
      }
    }
  }

  private isClientConnected(client: WebSocket): boolean {
    return client.readyState === WebSocket.OPEN;
  }

  private extractUserIdFromRequest(request: http.IncomingMessage): string | null {
    // Extract user ID from query parameters
    const url = new URL(request.url, `http://${request.headers.host}`);
    return url.searchParams.get('userId');
  }

  private handleSubscribeRequest(
    userId: string,
    deviceIds: string[],
    notificationTypes: NotificationType[]
  ): void {
    const deviceIdObjects = deviceIds.map(id => DeviceId.create(id));
    this.subscribeToNotifications(userId, deviceIdObjects, notificationTypes)
      .catch(error => console.error('Error handling subscribe request:', error));
  }

  private handleUnsubscribeRequest(
    userId: string,
    deviceIds?: string[],
    notificationTypes?: NotificationType[]
  ): void {
    const deviceIdObjects = deviceIds ? deviceIds.map(id => DeviceId.create(id)) : undefined;
    this.unsubscribeFromNotifications(userId, deviceIdObjects, notificationTypes)
      .catch(error => console.error('Error handling unsubscribe request:', error));
  }

  // Method to close the WebSocket server
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(new Error(`Failed to close WebSocket server: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}