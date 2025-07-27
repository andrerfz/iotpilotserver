import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {MQTTDeviceNotifierService} from '../mqtt-device-notifier.service';
import {DeviceId} from '../../../domain/value-objects/device-id.vo';
import {DeviceStatus} from '../../../domain/value-objects/device-status.vo';

// Mock MQTT
const mockMqttClient = {
  on: vi.fn(),
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  end: vi.fn(),
};

const mockMqtt = {
  connect: vi.fn().mockReturnValue(mockMqttClient),
};

vi.mock('mqtt', () => mockMqtt);

describe('MQTTDeviceNotifierService', () => {
  let notifier: MQTTDeviceNotifierService;
  let deviceId: DeviceId;

  beforeEach(() => {
    deviceId = DeviceId.create('device-1');
    notifier = new MQTTDeviceNotifierService('mqtt://localhost:1883', 'iot-pilot/devices');

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any timers or connections
  });

  describe('constructor', () => {
    it('should initialize with provided broker URL and base topic', () => {
      const customBroker = 'mqtt://custom-broker:1883';
      const customTopic = 'custom/devices';

      const customNotifier = new MQTTDeviceNotifierService(customBroker, customTopic);

      expect(mockMqtt.connect).toHaveBeenCalledWith(customBroker, expect.objectContaining({
        clientId: expect.stringContaining('iot-pilot-notifier-'),
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
      }));
    });

    it('should use default base topic when not provided', () => {
      const defaultNotifier = new MQTTDeviceNotifierService('mqtt://localhost:1883');

      expect(defaultNotifier).toBeInstanceOf(MQTTDeviceNotifierService);
    });

    it('should set up connection event handlers', () => {
      expect(mockMqttClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('sendStatusChangeNotification', () => {
    it('should publish status change notification to correct topic', async () => {
      const oldStatus = DeviceStatus.create('offline');
      const newStatus = DeviceStatus.create('online');

      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null); // Success callback
      });

      await notifier.sendStatusChangeNotification(deviceId, oldStatus, newStatus);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'iot-pilot/devices/device-1/status',
        expect.stringContaining('"deviceId":"device-1"'),
        { qos: 1, retain: false },
        expect.any(Function)
      );

      const publishedPayload = JSON.parse(mockMqttClient.publish.mock.calls[0][1]);
      expect(publishedPayload).toEqual({
        deviceId: 'device-1',
        oldStatus: 'offline',
        newStatus: 'online',
        timestamp: expect.any(String),
      });
    });

    it('should throw error when MQTT publish fails', async () => {
      const oldStatus = DeviceStatus.create('offline');
      const newStatus = DeviceStatus.create('online');

      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(new Error('MQTT publish failed')); // Error callback
      });

      await expect(notifier.sendStatusChangeNotification(deviceId, oldStatus, newStatus)).rejects.toThrow(
        'Failed to send MQTT notification: MQTT publish failed'
      );
    });
  });

  describe('sendMetricsAlert', () => {
    it('should publish metrics alert to correct topic', async () => {
      const thresholdValue = 90.0;
      const currentValue = 95.0;

      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      await notifier.sendMetricsAlert(deviceId, 'cpu_usage', thresholdValue, currentValue);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'iot-pilot/devices/device-1/metrics',
        expect.stringContaining('"deviceId":"device-1"'),
        { qos: 1, retain: false },
        expect.any(Function)
      );

      const publishedPayload = JSON.parse(mockMqttClient.publish.mock.calls[0][1]);
      expect(publishedPayload).toEqual({
        deviceId: 'device-1',
        metricName: 'cpu_usage',
        thresholdValue: 90.0,
        currentValue: 95.0,
        timestamp: expect.any(String),
      });
    });
  });

  describe('sendCommandExecutionNotification', () => {
    it('should publish command execution notification', async () => {
      const command = 'restart-service';
      const status = 'completed';

      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      await notifier.sendCommandExecutionNotification(deviceId, command, status);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'iot-pilot/devices/device-1/commands',
        expect.stringContaining('"deviceId":"device-1"'),
        { qos: 1, retain: false },
        expect.any(Function)
      );

      const publishedPayload = JSON.parse(mockMqttClient.publish.mock.calls[0][1]);
      expect(publishedPayload).toEqual({
        deviceId: 'device-1',
        command,
        status,
        timestamp: expect.any(String),
      });
    });
  });

  describe('sendDeviceOfflineNotification', () => {
    it('should publish device offline notification', async () => {
      const lastSeen = new Date('2023-01-01T10:00:00Z');

      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      await notifier.sendDeviceOfflineNotification(deviceId, lastSeen);

      const publishedPayload = JSON.parse(mockMqttClient.publish.mock.calls[0][1]);
      expect(publishedPayload).toEqual({
        deviceId: 'device-1',
        lastSeen: '2023-01-01T10:00:00.000Z',
        timestamp: expect.any(String),
      });
    });
  });

  describe('subscribeToDeviceNotifications', () => {
    it('should subscribe to device notifications', async () => {
      mockMqttClient.subscribe.mockImplementation((topic, options, callback) => {
        callback(null, { topic, qos: 1 });
      });

      await notifier.subscribeToDeviceNotifications(deviceId, 'status_change');

      expect(mockMqttClient.subscribe).toHaveBeenCalledWith(
        'iot-pilot/devices/device-1/status_change',
        { qos: 1 },
        expect.any(Function)
      );
    });

    it('should handle subscription errors', async () => {
      mockMqttClient.subscribe.mockImplementation((topic, options, callback) => {
        callback(new Error('Subscription failed'), null);
      });

      await expect(notifier.subscribeToDeviceNotifications(deviceId, 'status_change')).rejects.toThrow(
        'Failed to subscribe to MQTT topic: Subscription failed'
      );
    });
  });

  describe('unsubscribeFromDeviceNotifications', () => {
    it('should unsubscribe from device notifications', async () => {
      mockMqttClient.unsubscribe.mockImplementation((topic, callback) => {
        callback(null);
      });

      await notifier.unsubscribeFromDeviceNotifications(deviceId, 'status_change');

      expect(mockMqttClient.unsubscribe).toHaveBeenCalledWith(
        'iot-pilot/devices/device-1/status_change',
        expect.any(Function)
      );
    });

    it('should handle unsubscription errors', async () => {
      mockMqttClient.unsubscribe.mockImplementation((topic, callback) => {
        callback(new Error('Unsubscription failed'));
      });

      await expect(notifier.unsubscribeFromDeviceNotifications(deviceId, 'status_change')).rejects.toThrow(
        'Failed to unsubscribe from MQTT topic: Unsubscription failed'
      );
    });
  });

  describe('broadcastSystemNotification', () => {
    it('should publish system-wide notification', async () => {
      const message = 'System maintenance scheduled';

      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      await notifier.broadcastSystemNotification(message);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'iot-pilot/system/announcements',
        expect.stringContaining(message),
        { qos: 1, retain: true },
        expect.any(Function)
      );

      const publishedPayload = JSON.parse(mockMqttClient.publish.mock.calls[0][1]);
      expect(publishedPayload).toEqual({
        message,
        timestamp: expect.any(String),
      });
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status based on client state', () => {
      // This would require mocking the internal client state
      // For now, we'll test that the method exists and returns a boolean
      const status = notifier.getConnectionStatus();

      expect(typeof status).toBe('boolean');
    });
  });

  describe('topic generation', () => {
    it('should generate correct device topics', () => {
      const notifier = new MQTTDeviceNotifierService('mqtt://localhost:1883', 'test/devices');

      // Test internal topic generation by triggering methods that use it
      const deviceId = DeviceId.create('test-device');
      const status = DeviceStatus.create('online');

      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        expect(topic).toBe('test/devices/test-device/status');
        callback(null);
      });

      notifier.sendStatusChangeNotification(deviceId, status, status);
    });
  });

  describe('error handling', () => {
    it('should log connection errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorHandler = mockMqttClient.on.mock.calls.find(call => call[0] === 'error')[1];

      const testError = new Error('Connection failed');
      errorHandler(testError);

      expect(consoleSpy).toHaveBeenCalledWith('MQTT connection error:', testError);

      consoleSpy.mockRestore();
    });

    it('should log successful connections', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const connectHandler = mockMqttClient.on.mock.calls.find(call => call[0] === 'connect')[1];

      connectHandler();

      expect(consoleSpy).toHaveBeenCalledWith('Connected to MQTT broker');

      consoleSpy.mockRestore();
    });
  });
});
