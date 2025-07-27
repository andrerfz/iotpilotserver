import {DeviceNotification, NotificationType} from '@/lib/device/domain/interfaces/device-notification.interface';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {DeviceStatus} from '@/lib/device/domain/value-objects/device-status.vo';
import {Server as SocketIOServer} from 'socket.io';

/**
 * Implementation of DeviceNotification using WebSockets (Socket.IO)
 */
export class WebSocketDeviceNotifier implements DeviceNotification {
  private readonly io: SocketIOServer;
  private readonly userRooms: Map<string, Set<string>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;

    // Set up connection handler
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', (userId: string) => {
        // Associate socket with user ID
        socket.data.userId = userId;
        console.log(`WebSocket client authenticated: ${socket.id} as user ${userId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });
    });
  }

  private getDeviceRoom(deviceId: DeviceId, notificationType: NotificationType): string {
    return `device:${deviceId.getValue()}:${notificationType}`;
  }

  private emitNotification(room: string, eventName: string, payload: any): void {
    this.io.to(room).emit(eventName, {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }

  async sendStatusChangeNotification(
    deviceId: DeviceId,
    oldStatus: DeviceStatus,
    newStatus: DeviceStatus
  ): Promise<void> {
    const room = this.getDeviceRoom(deviceId, NotificationType.STATUS_CHANGE);
    
    this.emitNotification(room, 'device:status_change', {
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
    const room = this.getDeviceRoom(deviceId, NotificationType.METRICS_ALERT);
    
    this.emitNotification(room, 'device:metrics_alert', {
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
    const room = this.getDeviceRoom(deviceId, NotificationType.CONNECTION_ISSUE);
    
    this.emitNotification(room, 'device:connection_issue', {
      deviceId: deviceId.getValue(),
      errorMessage
    });
  }

  async sendSecurityAlert(
    deviceId: DeviceId,
    alertType: string,
    details: string
  ): Promise<void> {
    const room = this.getDeviceRoom(deviceId, NotificationType.SECURITY_ALERT);
    
    this.emitNotification(room, 'device:security_alert', {
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
    // Create a set of rooms for this user if it doesn't exist
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    
    const userRooms = this.userRooms.get(userId)!;
    
    // Get all sockets for this user
    const userSockets = await this.getUserSockets(userId);
    
    if (userSockets.length === 0) {
      console.warn(`No active sockets found for user ${userId}`);
      return;
    }
    
    // Subscribe to each device and notification type
    for (const deviceId of deviceIds) {
      for (const notificationType of notificationTypes) {
        const room = this.getDeviceRoom(deviceId, notificationType);
        
        // Add to user's rooms
        userRooms.add(room);
        
        // Join all user's sockets to the room
        for (const socket of userSockets) {
          socket.join(room);
        }
      }
    }
  }

  async unsubscribeFromNotifications(
    userId: string,
    deviceIds?: DeviceId[],
    notificationTypes?: NotificationType[]
  ): Promise<void> {
    // If user has no subscriptions, do nothing
    if (!this.userRooms.has(userId)) {
      return;
    }
    
    const userRooms = this.userRooms.get(userId)!;
    
    // Get all sockets for this user
    const userSockets = await this.getUserSockets(userId);
    
    if (userSockets.length === 0) {
      console.warn(`No active sockets found for user ${userId}`);
      return;
    }
    
    // If no device IDs or notification types specified, unsubscribe from all
    if (!deviceIds && !notificationTypes) {
      // Leave all rooms
      for (const room of userRooms) {
        for (const socket of userSockets) {
          socket.leave(room);
        }
      }
      
      // Clear user's rooms
      this.userRooms.delete(userId);
      return;
    }
    
    // Unsubscribe from specific rooms
    const roomsToRemove: string[] = [];
    
    for (const room of userRooms) {
      // Parse the room to get device ID and notification type
      const parts = room.split(':');
      const roomDeviceId = parts[1];
      const roomNotificationType = parts[2] as NotificationType;
      
      // Check if this room should be unsubscribed
      const shouldUnsubscribe = (
        // If device IDs specified, check if this room's device ID is in the list
        (!deviceIds || deviceIds.some(id => id.getValue() === roomDeviceId)) &&
        // If notification types specified, check if this room's type is in the list
        (!notificationTypes || notificationTypes.includes(roomNotificationType))
      );
      
      if (shouldUnsubscribe) {
        // Leave the room
        for (const socket of userSockets) {
          socket.leave(room);
        }
        
        // Add to list of rooms to remove
        roomsToRemove.push(room);
      }
    }
    
    // Remove unsubscribed rooms from user's rooms
    for (const room of roomsToRemove) {
      userRooms.delete(room);
    }
    
    // If user has no more rooms, remove the user
    if (userRooms.size === 0) {
      this.userRooms.delete(userId);
    }
  }
  
  private async getUserSockets(userId: string): Promise<any[]> {
    const sockets = await this.io.fetchSockets();
    return sockets.filter(socket => socket.data.userId === userId);
  }
}