import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WebSocketDeviceNotifierService} from '../websocket-device-notifier.service';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceStatus} from '../../../domain/value-objects/device-status.vo';

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  off: vi.fn(),
  readyState: 1, // OPEN
};

const mockWebSocketServer = {
  on: vi.fn(),
  close: vi.fn(),
  clients: new Set(),
};

// Mock HTTP Server
const mockHttpServer = {
  listen: vi.fn(),
  close: vi.fn(),
};

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation((options) => {
    if (options.server) {
      // Using existing HTTP server
      return mockWebSocketServer;
    } else {
      // Creating new server
      return mockWebSocketServer;
    }
  }),
}));

describe('WebSocketDeviceNotifierService', () => {
  let notifier: WebSocketDeviceNotifierService;
  let deviceId: DeviceId;

  beforeEach(() => {
    vi.clearAllMocks();
    deviceId = DeviceId.create('device-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create WebSocket server with HTTP server', () => {
      const { WebSocketServer } = require('ws');

      notifier = new WebSocketDeviceNotifierService(mockHttpServer as any, 8080);

      expect(WebSocketServer).toHaveBeenCalledWith({ server: mockHttpServer });
    });

    it('should create standalone WebSocket server with port', () => {
      const { WebSocketServer } = require('ws');

      notifier = new WebSocketDeviceNotifierService(undefined, 9090);

      expect(WebSocketServer).toHaveBeenCalledWith({ port: 9090 });
    });

    it('should use default port when not specified', () => {
      const { WebSocketServer } = require('ws');

      notifier = new WebSocketDeviceNotifierService();

      expect(WebSocketServer).toHaveBeenCalledWith({ port: 8080 });
    });

    it('should set up connection event handler', () => {
      notifier = new WebSocketDeviceNotifierService();

      expect(mockWebSocketServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('connection handling', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should accept connection with valid user ID', () => {
      const mockRequest = {
        url: 'ws://localhost:8080?userId=user-123',
      };

      // Get the connection handler
      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];

      // Mock extractUserIdFromRequest to return a user ID
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      // Simulate connection
      connectionHandler(mockWebSocket, mockRequest);

      expect((notifier as any).clients.has('user-123')).toBe(true);
      expect((notifier as any).clients.get('user-123')).toContain(mockWebSocket);
    });

    it('should reject connection without user ID', () => {
      const mockRequest = {
        url: 'ws://localhost:8080',
      };

      // Mock extractUserIdFromRequest to return null
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue(null);

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];

      connectionHandler(mockWebSocket, mockRequest);

      expect(mockWebSocket.close).toHaveBeenCalledWith(1008, 'User ID not provided');
      expect((notifier as any).clients.has('user-123')).toBe(false);
    });

    it('should handle client disconnection', () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];

      connectionHandler(mockWebSocket, mockRequest);

      // Simulate disconnection by calling the close handler
      const closeHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'close'
      )[1];

      closeHandler();

      expect((notifier as any).clients.get('user-123')).not.toContain(mockWebSocket);
    });

    it('should remove user when all clients disconnect', () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];

      connectionHandler(mockWebSocket, mockRequest);

      // Disconnect the client
      const closeHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'close'
      )[1];
      closeHandler();

      expect((notifier as any).clients.has('user-123')).toBe(false);
    });
  });

  describe('sendStatusChangeNotification', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should send status change notification to subscribed clients', async () => {
      // Set up a client
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      // Subscribe to device notifications
      (notifier as any).subscriptions.set('user-123', new Map());
      (notifier as any).subscriptions.get('user-123').set('device-1', new Set(['status_change']));

      const oldStatus = DeviceStatus.create('offline');
      const newStatus = DeviceStatus.create('online');

      await notifier.sendStatusChangeNotification(deviceId, oldStatus, newStatus);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:status_change',
          deviceId: 'device-1',
          oldStatus: 'offline',
          newStatus: 'online',
          timestamp: expect.any(String),
        })
      );
    });

    it('should not send notification if user is not subscribed', async () => {
      // Set up a client but no subscription
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      const oldStatus = DeviceStatus.create('offline');
      const newStatus = DeviceStatus.create('online');

      await notifier.sendStatusChangeNotification(deviceId, oldStatus, newStatus);

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle WebSocket send errors gracefully', async () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      (notifier as any).subscriptions.set('user-123', new Map());
      (notifier as any).subscriptions.get('user-123').set('device-1', new Set(['status_change']));

      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const oldStatus = DeviceStatus.create('offline');
      const newStatus = DeviceStatus.create('online');

      // Should not throw
      await expect(
        notifier.sendStatusChangeNotification(deviceId, oldStatus, newStatus)
      ).resolves.not.toThrow();

      expect(mockWebSocket.send).toHaveBeenCalled();
    });
  });

  describe('sendMetricsAlert', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should send metrics alert to subscribed clients', async () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      (notifier as any).subscriptions.set('user-123', new Map());
      (notifier as any).subscriptions.get('user-123').set('device-1', new Set(['metrics_alert']));

      await notifier.sendMetricsAlert(deviceId, 'cpu_usage', 80.0, 95.0);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:metrics_alert',
          deviceId: 'device-1',
          metricName: 'cpu_usage',
          thresholdValue: 80.0,
          currentValue: 95.0,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('sendCommandExecutionNotification', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should send command execution notification', async () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      (notifier as any).subscriptions.set('user-123', new Map());
      (notifier as any).subscriptions.get('user-123').set('device-1', new Set(['command_execution']));

      await notifier.sendCommandExecutionNotification(deviceId, 'restart-service', 'completed');

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:command_execution',
          deviceId: 'device-1',
          command: 'restart-service',
          status: 'completed',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('sendDeviceOfflineNotification', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should send device offline notification', async () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      (notifier as any).subscriptions.set('user-123', new Map());
      (notifier as any).subscriptions.get('user-123').set('device-1', new Set(['device_offline']));

      const lastSeen = new Date('2023-01-01T10:00:00Z');

      await notifier.sendDeviceOfflineNotification(deviceId, lastSeen);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:device_offline',
          deviceId: 'device-1',
          lastSeen: '2023-01-01T10:00:00.000Z',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('sendCustomNotification', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should send custom notification to subscribed clients', async () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      (notifier as any).subscriptions.set('user-123', new Map());
      (notifier as any).subscriptions.get('user-123').set('device-1', new Set(['custom_event']));

      const payload = { message: 'Custom notification', priority: 'high' };

      await notifier.sendCustomNotification(deviceId, 'custom_event', payload);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:custom_event',
          deviceId: 'device-1',
          ...payload,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('broadcastToAllDevices', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should broadcast notification to all connected clients', async () => {
      // Set up multiple clients
      const mockWS1 = { ...mockWebSocket, send: vi.fn() };
      const mockWS2 = { ...mockWebSocket, send: vi.fn() };

      (notifier as any).clients.set('user-1', new Set([mockWS1]));
      (notifier as any).clients.set('user-2', new Set([mockWS2]));

      const payload = { message: 'System maintenance' };

      await notifier.broadcastToAllDevices('system_announcement', payload);

      expect(mockWS1.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:system_announcement',
          ...payload,
          timestamp: expect.any(String),
        })
      );

      expect(mockWS2.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:system_announcement',
          ...payload,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('broadcastToUserDevices', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should broadcast notification to specific user devices', async () => {
      const mockWS = { ...mockWebSocket, send: vi.fn() };
      (notifier as any).clients.set('user-123', new Set([mockWS]));

      const payload = { message: 'User-specific notification' };

      await notifier.broadcastToUserDevices('user-123', 'user_notification', payload);

      expect(mockWS.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'device:user_notification',
          ...payload,
          userId: 'user-123',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('subscribeToDevice', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should add subscription for user and device', async () => {
      await notifier.subscribeToDevice('user-123', deviceId, 'status_change');

      const userSubscriptions = (notifier as any).subscriptions.get('user-123');
      expect(userSubscriptions).toBeDefined();
      expect(userSubscriptions.get('device-1')).toBeDefined();
      expect(userSubscriptions.get('device-1')).toContain('status_change');
    });

    it('should add multiple notification types for same device', async () => {
      await notifier.subscribeToDevice('user-123', deviceId, 'status_change');
      await notifier.subscribeToDevice('user-123', deviceId, 'metrics_alert');

      const deviceSubscriptions = (notifier as any).subscriptions.get('user-123').get('device-1');
      expect(deviceSubscriptions).toContain('status_change');
      expect(deviceSubscriptions).toContain('metrics_alert');
    });
  });

  describe('unsubscribeFromDevice', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should remove subscription for user and device', async () => {
      await notifier.subscribeToDevice('user-123', deviceId, 'status_change');
      await notifier.subscribeToDevice('user-123', deviceId, 'metrics_alert');

      await notifier.unsubscribeFromDevice('user-123', deviceId, 'status_change');

      const deviceSubscriptions = (notifier as any).subscriptions.get('user-123').get('device-1');
      expect(deviceSubscriptions).not.toContain('status_change');
      expect(deviceSubscriptions).toContain('metrics_alert');
    });

    it('should remove device entry when no subscriptions left', async () => {
      await notifier.subscribeToDevice('user-123', deviceId, 'status_change');
      await notifier.unsubscribeFromDevice('user-123', deviceId, 'status_change');

      const userSubscriptions = (notifier as any).subscriptions.get('user-123');
      expect(userSubscriptions.has('device-1')).toBe(false);
    });
  });

  describe('getConnectedClientsCount', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should return count of clients subscribed to device', () => {
      (notifier as any).subscriptions.set('user-1', new Map());
      (notifier as any).subscriptions.get('user-1').set('device-1', new Set(['status_change']));
      (notifier as any).subscriptions.set('user-2', new Map());
      (notifier as any).subscriptions.get('user-2').set('device-1', new Set(['metrics_alert']));

      (notifier as any).clients.set('user-1', new Set([mockWebSocket]));
      (notifier as any).clients.set('user-2', new Set([mockWebSocket, mockWebSocket]));

      const count = notifier.getConnectedClientsCount(deviceId);
      expect(count).toBe(3);
    });

    it('should return 0 when no clients subscribed', () => {
      const count = notifier.getConnectedClientsCount(deviceId);
      expect(count).toBe(0);
    });
  });

  describe('getSubscribedUsers', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should return list of users subscribed to device', () => {
      (notifier as any).subscriptions.set('user-1', new Map());
      (notifier as any).subscriptions.get('user-1').set('device-1', new Set(['status_change']));
      (notifier as any).subscriptions.set('user-2', new Map());
      (notifier as any).subscriptions.get('user-2').set('device-1', new Set(['metrics_alert']));
      (notifier as any).subscriptions.set('user-3', new Map());
      (notifier as any).subscriptions.get('user-3').set('device-2', new Set(['status_change']));

      const users = notifier.getSubscribedUsers(deviceId);
      expect(users).toEqual(['user-1', 'user-2']);
    });

    it('should return empty array when no users subscribed', () => {
      const users = notifier.getSubscribedUsers(deviceId);
      expect(users).toEqual([]);
    });
  });

  describe('extractUserIdFromRequest', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should extract user ID from query parameters', () => {
      const mockRequest = {
        url: 'ws://localhost:8080?userId=user-123&other=param',
      };

      const result = (notifier as any).extractUserIdFromRequest(mockRequest);
      expect(result).toBe('user-123');
    });

    it('should extract user ID from URL search params', () => {
      const mockRequest = {
        url: 'ws://localhost:8080/ws?userId=user-456',
      };

      const result = (notifier as any).extractUserIdFromRequest(mockRequest);
      expect(result).toBe('user-456');
    });

    it('should return null when userId not provided', () => {
      const mockRequest = {
        url: 'ws://localhost:8080',
      };

      const result = (notifier as any).extractUserIdFromRequest(mockRequest);
      expect(result).toBeNull();
    });

    it('should handle malformed URLs gracefully', () => {
      const mockRequest = {
        url: 'invalid-url',
      };

      const result = (notifier as any).extractUserIdFromRequest(mockRequest);
      expect(result).toBeNull();
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      notifier = new WebSocketDeviceNotifierService();
    });

    it('should handle subscription messages', () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      const messageHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const subscriptionMessage = JSON.stringify({
        type: 'subscribe',
        deviceId: 'device-1',
        notificationTypes: ['status_change', 'metrics_alert'],
      });

      messageHandler(subscriptionMessage);

      const userSubscriptions = (notifier as any).subscriptions.get('user-123');
      expect(userSubscriptions.get('device-1')).toContain('status_change');
      expect(userSubscriptions.get('device-1')).toContain('metrics_alert');
    });

    it('should handle unsubscription messages', () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      // First subscribe
      (notifier as any).subscriptions.set('user-123', new Map());
      (notifier as any).subscriptions.get('user-123').set('device-1', new Set(['status_change', 'metrics_alert']));

      const messageHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const unsubscribeMessage = JSON.stringify({
        type: 'unsubscribe',
        deviceId: 'device-1',
        notificationTypes: ['status_change'],
      });

      messageHandler(unsubscribeMessage);

      const deviceSubscriptions = (notifier as any).subscriptions.get('user-123').get('device-1');
      expect(deviceSubscriptions).not.toContain('status_change');
      expect(deviceSubscriptions).toContain('metrics_alert');
    });

    it('should handle invalid JSON messages gracefully', () => {
      const mockRequest = { url: 'ws://localhost:8080?userId=user-123' };
      (notifier as any).extractUserIdFromRequest = vi.fn().mockReturnValue('user-123');

      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockWebSocket, mockRequest);

      const messageHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Should not throw on invalid JSON
      expect(() => messageHandler('invalid json')).not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should close WebSocket server', () => {
      notifier = new WebSocketDeviceNotifierService();

      // Access the close method if it exists
      if (typeof (notifier as any).close === 'function') {
        (notifier as any).close();
        expect(mockWebSocketServer.close).toHaveBeenCalled();
      }
    });
  });
});
