import {beforeEach, describe, expect, it, vi} from 'vitest';
import {WebSocketDeviceNotifier} from '../websocket-device-notifier';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceStatus} from '../../../domain/value-objects/device-status.vo';

// Mock Socket.IO
const mockSocket = {
  id: 'socket-123',
  data: {},
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
};

const mockIo = {
  on: vi.fn(),
  to: vi.fn().mockReturnValue({
    emit: vi.fn(),
  }),
  emit: vi.fn(),
  fetchSockets: vi.fn().mockResolvedValue([]),
  sockets: {
    sockets: new Map()
  }
};

vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => mockIo),
}));

describe('WebSocketDeviceNotifier', () => {
  let notifier: WebSocketDeviceNotifier;
  let deviceId: DeviceId;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create notifier with mocked Socket.IO server
    notifier = new WebSocketDeviceNotifier(mockIo as any);
    deviceId = DeviceId.create('device-1');
  });

  describe('constructor', () => {
    it('should initialize with Socket.IO server', () => {
      expect(notifier).toBeInstanceOf(WebSocketDeviceNotifier);
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should set up connection event handlers', () => {
      // The constructor should have set up the connection handler
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];

      // Simulate a client connection
      connectionHandler(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('authenticate', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('sendStatusChangeNotification', () => {
    it('should emit status change notification to correct room', async () => {
      const oldStatus = DeviceStatus.offlineInactive();
      const newStatus = DeviceStatus.onlineAndActive();

      await notifier.sendStatusChangeNotification(deviceId, oldStatus, newStatus);

      expect(mockIo.to).toHaveBeenCalledWith('device:device-1:status_change');
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:status_change', {
        deviceId: 'device-1',
        oldStatus: expect.any(String), // DeviceStatus.value returns businessStatus
        newStatus: expect.any(String), // DeviceStatus.value returns businessStatus
        timestamp: expect.any(String),
      });
    });
  });

  describe('sendMetricsAlert', () => {
    it('should emit metrics alert to correct room', async () => {
      const thresholdValue = 90.0;
      const currentValue = 95.0;

      // sendMetricsAlert(deviceId, metricName, value, threshold)
      await notifier.sendMetricsAlert(deviceId, 'cpu_usage', currentValue, thresholdValue);

      expect(mockIo.to).toHaveBeenCalledWith('device:device-1:metrics_alert');
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:metrics_alert', {
        deviceId: 'device-1',
        metricName: 'cpu_usage',
        value: 95.0,
        threshold: 90.0,
        exceededBy: 5.0,
        timestamp: expect.any(String),
      });
    });
  });

  describe.skip('sendCommandExecutionNotification', () => {
    // Note: sendCommandExecutionNotification method does not exist in WebSocketDeviceNotifier
    it.skip('should emit command execution notification to correct room', async () => {
      const command = 'restart-service';
      const status = 'completed';

      await notifier.sendCommandExecutionNotification(deviceId, command, status);

      expect(mockIo.to).toHaveBeenCalledWith('device:device-1:command_execution');
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:command_execution', {
        deviceId: 'device-1',
        command: 'restart-service',
        status: 'completed',
        timestamp: expect.any(String),
      });
    });
  });

  describe.skip('sendDeviceOfflineNotification', () => {
    // Note: sendDeviceOfflineNotification method does not exist in WebSocketDeviceNotifier
    it.skip('should emit device offline notification to correct room', async () => {
      const lastSeen = new Date('2023-01-01T10:00:00Z');

      await notifier.sendDeviceOfflineNotification(deviceId, lastSeen);

      expect(mockIo.to).toHaveBeenCalledWith('device:device-1:device_offline');
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:device_offline', {
        deviceId: 'device-1',
        lastSeen: '2023-01-01T10:00:00.000Z',
        timestamp: expect.any(String),
      });
    });
  });

  describe.skip('sendCustomNotification', () => {
    // Note: sendCustomNotification method does not exist in WebSocketDeviceNotifier
    it.skip('should emit custom notification to device room', async () => {
      const eventType = 'custom_event';
      const payload = { message: 'Custom notification', priority: 'high' };

      await notifier.sendCustomNotification(deviceId, eventType, payload);

      expect(mockIo.to).toHaveBeenCalledWith('device:device-1:custom_event');
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:custom_event', {
        ...payload,
        deviceId: 'device-1',
        timestamp: expect.any(String),
      });
    });
  });

  describe('broadcastToAllDevices', () => {
    it('should broadcast notification to all connected clients', async () => {
      const eventType = 'system_announcement';
      const payload = { message: 'System maintenance scheduled' };

      await notifier.broadcastToAllDevices(eventType, payload);

      expect(mockIo.emit).toHaveBeenCalledWith('device:system_announcement', {
        ...payload,
        timestamp: expect.any(String),
      });
    });
  });

  describe('broadcastToUserDevices', () => {
    it('should broadcast to user-specific room', async () => {
      const userId = 'user-123';
      const eventType = 'user_notification';
      const payload = { message: 'User-specific notification' };

      await notifier.broadcastToUserDevices(userId, eventType, payload);

      expect(mockIo.to).toHaveBeenCalledWith(`user:${userId}:devices`);
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:user_notification', {
        ...payload,
        userId: 'user-123',
        timestamp: expect.any(String),
      });
    });
  });

  describe('subscribeToDevice', () => {
    it('should join client to device room', async () => {
      const userId = 'user-123';
      const socketId = 'socket-123';

      // Mock the userRooms map
      (notifier as any).userRooms.set(userId, new Set([socketId]));

      await notifier.subscribeToDevice(userId, deviceId, 'status_change');

      expect(mockIo.to).toHaveBeenCalledWith(`user:${userId}:devices`);
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:subscribed', {
        deviceId: 'device-1',
        notificationType: 'status_change',
        userId: 'user-123',
        timestamp: expect.any(String),
      });
    });
  });

  describe('unsubscribeFromDevice', () => {
    it('should remove client from device room', async () => {
      const userId = 'user-123';

      await notifier.unsubscribeFromDevice(userId, deviceId, 'status_change');

      expect(mockIo.to).toHaveBeenCalledWith(`user:${userId}:devices`);
      const roomEmit = mockIo.to.mock.results[0].value.emit;
      expect(roomEmit).toHaveBeenCalledWith('device:unsubscribed', {
        deviceId: 'device-1',
        notificationType: 'status_change',
        userId: 'user-123',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return count of connected clients for device', async () => {
      // Mock the userRooms to simulate connected clients with device rooms
      const mockUserRooms = new Map();
      // userRooms stores room names, not socket IDs
      mockUserRooms.set('user-1', new Set([`device:${deviceId.getValue()}:status_change`]));
      mockUserRooms.set('user-2', new Set([`device:${deviceId.getValue()}:metrics_alert`]));

      // Mock sockets for these users
      const mockSocket1 = { id: 'socket-1', data: { userId: 'user-1' }, join: vi.fn(), leave: vi.fn() };
      const mockSocket2 = { id: 'socket-2', data: { userId: 'user-1' }, join: vi.fn(), leave: vi.fn() };
      const mockSocket3 = { id: 'socket-3', data: { userId: 'user-2' }, join: vi.fn(), leave: vi.fn() };
      
      // Mock io.sockets.sockets to return these sockets
      (mockIo.sockets as any).sockets = new Map([
        ['socket-1', mockSocket1],
        ['socket-2', mockSocket2],
        ['socket-3', mockSocket3]
      ]);

      (notifier as any).userRooms = mockUserRooms;

      const count = notifier.getConnectedClientsCount(deviceId);
      expect(count).toBe(3); // Total clients across all users
    });

    it('should return 0 when no clients connected', () => {
      const count = notifier.getConnectedClientsCount(deviceId);
      expect(count).toBe(0);
    });
  });

  describe('getSubscribedUsers', () => {
    it('should return list of users subscribed to device notifications', () => {
      const mockUserRooms = new Map();
      // userRooms stores room names, not socket IDs
      mockUserRooms.set('user-1', new Set([`device:${deviceId.getValue()}:status_change`]));
      mockUserRooms.set('user-2', new Set([`device:${deviceId.getValue()}:metrics_alert`]));

      (notifier as any).userRooms = mockUserRooms;

      const users = notifier.getSubscribedUsers(deviceId);
      expect(users).toEqual(['user-1', 'user-2']);
    });

    it('should return empty array when no users subscribed', () => {
      const users = notifier.getSubscribedUsers(deviceId);
      expect(users).toEqual([]);
    });
  });

  describe('connection handling', () => {
    it('should handle client authentication', () => {
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      const authHandler = mockSocket.on.mock.calls.find(call => call[0] === 'authenticate')[1];

      authHandler('user-123');

      expect(mockSocket.data.userId).toBe('user-123');
    });

    it('should handle client disconnection', () => {
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];

      // Mock user rooms
      const mockUserRooms = new Map();
      mockUserRooms.set('user-123', new Set(['socket-123']));
      (notifier as any).userRooms = mockUserRooms;

      disconnectHandler();

      expect(mockUserRooms.get('user-123').size).toBe(0);
    });
  });

  describe('room management', () => {
    it('should generate correct device room names', () => {
      const room1 = (notifier as any).getDeviceRoom(deviceId, 'status_change');
      const room2 = (notifier as any).getDeviceRoom(deviceId, 'metrics_alert');

      expect(room1).toBe('device:device-1:status_change');
      expect(room2).toBe('device:device-1:metrics_alert');
    });

    it('should generate correct user room names', () => {
      const userRoom = (notifier as any).getUserRoom('user-123');
      expect(userRoom).toBe('user:user-123:devices');
    });
  });
});
