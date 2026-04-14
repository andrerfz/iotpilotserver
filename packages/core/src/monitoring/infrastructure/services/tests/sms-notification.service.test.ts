import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SMSNotificationService} from '../sms-notification.service';
import {Alert} from '../../../domain/entities/alert.entity';
import {AlertId} from '../../../domain/value-objects/alert-id.vo';
import {AlertSeverity} from '../../../domain/value-objects/alert-severity.vo';
import {AlertStatus} from '../../../domain/value-objects/alert-status.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '../../../domain/value-objects/threshold-id.vo';
import {MetricValue} from '../../../domain/value-objects/metric-value.vo';
import {HttpClient} from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

/// <reference types="node" />

describe('SMSNotificationService', () => {
  let smsService: SMSNotificationService;
  let alert: Alert;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.SMS_NOTIFICATIONS_ENABLED;
    delete process.env.SMS_PROVIDER;
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_FROM_NUMBER;
    delete process.env.DASHBOARD_URL;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.NEXMO_API_KEY;
    delete process.env.NEXMO_API_SECRET;

    // Create mock HttpClient
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.clearAllMocks();

    smsService = new SMSNotificationService(mockHttpClient);

    alert = Alert.create(
      AlertId.create('alert-1'),
      'High CPU Usage Alert',
      'CPU usage has exceeded 90%',
      AlertSeverity.create('CRITICAL'),
      AlertStatus.create('ACTIVE'),
      DeviceId.create('device-1'),
      CustomerId.create('ctenant10000000000000000001'),
      'cpu_usage',
      MetricValue.create(95.0, 'percent'),
      90.0,
      ThresholdId.create('threshold-1'),
      new Date('2023-01-01T10:00:00Z')
    );
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SMS_NOTIFICATIONS_ENABLED;
    delete process.env.SMS_PROVIDER;
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_FROM_NUMBER;
    delete process.env.DASHBOARD_URL;
  });

  describe('constructor', () => {
    it('should initialize with default values when environment variables are not set', () => {
      const service = new SMSNotificationService(mockHttpClient);

      // We can't directly test private properties, but we can test behavior
      expect(service).toBeInstanceOf(SMSNotificationService);
    });

    it('should initialize with environment variables when set', () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';
      process.env.SMS_PROVIDER = 'twilio';
      process.env.SMS_API_KEY = 'test-key';
      process.env.SMS_FROM_NUMBER = '+1234567890';
      process.env.DASHBOARD_URL = 'https://test.com';

      const service = new SMSNotificationService(mockHttpClient);

      // Test behavior instead of private properties
      expect(service).toBeInstanceOf(SMSNotificationService);
    });
  });

  describe('sendAlertNotification', () => {
    it('should return false when SMS notifications are disabled', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'false';

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(alert, ['+1234567890'], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });

    it('should return false when no phone numbers provided', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(alert, [], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });

    it('should send SMS notifications successfully with Twilio', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';
      process.env.SMS_PROVIDER = 'twilio';
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';
      process.env.SMS_FROM_NUMBER = '+1234567890';
      process.env.DASHBOARD_URL = 'https://test.com';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 201, statusText: 'Created', headers: {} });

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(alert, ['+0987654321'], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/test-sid/Messages.json',
        expect.any(String), // URL-encoded form body (To, From, Body)
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic dGVzdC1zaWQ6dGVzdC10b2tlbg==' // base64('test-sid:test-token')
          })
        })
      );
    });

    it('should send SMS notifications successfully with Nexmo', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';
      process.env.SMS_PROVIDER = 'nexmo';
      process.env.NEXMO_API_KEY = 'test-key';
      process.env.NEXMO_API_SECRET = 'test-secret';
      process.env.DASHBOARD_URL = 'https://test.com';

      (mockHttpClient.post as any).mockResolvedValue({
        data: { messages: [{ status: '0' }] },
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(alert, ['+0987654321'], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://rest.nexmo.com/sms/json',
        {
          api_key: 'test-key',
          api_secret: 'test-secret',
          to: '+0987654321',
          from: 'IoTPilot',
          text: expect.any(String)
        }
      );
    });

    it('should handle SMS sending failures gracefully', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';
      process.env.SMS_PROVIDER = 'twilio';
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';
      process.env.SMS_FROM_NUMBER = '+1234567890';

      (mockHttpClient.post as any).mockRejectedValue(new Error('Network error'));

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(alert, ['+0987654321'], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });

    it('should send to multiple phone numbers', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';
      process.env.SMS_PROVIDER = 'twilio';
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';
      process.env.SMS_FROM_NUMBER = '+1234567890';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 201, statusText: 'Created', headers: {} });

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(
        alert,
        ['+0987654321', '+1123456789'],
        CustomerId.create('ctenant10000000000000000001')
      );

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('should handle unsupported SMS provider', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';
      process.env.SMS_PROVIDER = 'unsupported-provider';

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(alert, ['+0987654321'], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });
  });

  describe('sendSummaryReport', () => {
    it('should send summary report successfully', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'true';
      process.env.SMS_PROVIDER = 'twilio';
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';
      process.env.SMS_FROM_NUMBER = '+1234567890';
      process.env.DASHBOARD_URL = 'https://test.com';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 201, statusText: 'Created', headers: {} });

      const reportData = {
        summary: {
          totalDevices: 10,
          onlineDevices: 8,
          activeAlerts: 2,
          avgCpuUsage: 45.5,
          avgMemoryUsage: 60.2
        }
      };

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendSummaryReport(reportData, ['+0987654321'], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/test-sid/Messages.json',
        expect.any(String), // URL-encoded form body (To, From, Body)
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic dGVzdC1zaWQ6dGVzdC10b2tlbg==' // base64('test-sid:test-token')
          })
        })
      );
    });

    it('should return false when SMS notifications are disabled', async () => {
      process.env.SMS_NOTIFICATIONS_ENABLED = 'false';

      const service = new SMSNotificationService(mockHttpClient);
      const result = await service.sendSummaryReport({}, ['+1234567890'], CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });
  });

  describe('createAlertMessage', () => {
    it('should create properly formatted alert message', () => {
      const service = new SMSNotificationService(mockHttpClient) as any;
      const message = service.createAlertMessage(alert);

      expect(message).toContain('CRITICAL ALERT: High CPU Usage Alert');
      expect(message).toContain('Device: device-1');
      expect(message).toContain('Metric: cpu_usage');
      expect(message).toContain('Value: 95 percent');
      expect(message).toContain('Threshold: 90 percent');
      expect(message).toContain('View in IoT Pilot: http://localhost:3000/devices/device-1');
    });

    it('should use custom dashboard URL when configured', () => {
      process.env.DASHBOARD_URL = 'https://custom-dashboard.com';
      const service = new SMSNotificationService(mockHttpClient) as any;
      const message = service.createAlertMessage(alert);

      expect(message).toContain('View in IoT Pilot: https://custom-dashboard.com/devices/device-1');
    });
  });

  describe('createReportMessage', () => {
    it('should create properly formatted report message', () => {
      const service = new SMSNotificationService(mockHttpClient) as any;
      const reportData = {
        summary: {
          totalDevices: 10,
          onlineDevices: 8,
          activeAlerts: 2,
          avgCpuUsage: 45.5,
          avgMemoryUsage: 60.2
        }
      };

      const message = service.createReportMessage(reportData);

      expect(message).toContain('IoT Pilot Summary');
      expect(message).toContain('Devices: 10 (8 online)');
      expect(message).toContain('Alerts: 2');
      expect(message).toContain('Avg CPU: 45.5%');
      expect(message).toContain('Avg Mem: 60.2%');
      expect(message).toContain('View dashboard: http://localhost:3000/monitoring');
    });
  });

  describe('getSeverityPrefix', () => {
    it('should return correct severity prefixes', () => {
      const service = new SMSNotificationService(mockHttpClient) as any;

      expect(service.getSeverityPrefix(AlertSeverity.create('CRITICAL'))).toBe('CRITICAL');
      expect(service.getSeverityPrefix(AlertSeverity.create('HIGH'))).toBe('HIGH');
      expect(service.getSeverityPrefix(AlertSeverity.create('MEDIUM'))).toBe('MEDIUM');
      expect(service.getSeverityPrefix(AlertSeverity.create('LOW'))).toBe('LOW');
    });
  });

  describe('sendSMS with different providers', () => {
    it('should handle missing Twilio configuration', async () => {
      process.env.SMS_PROVIDER = 'twilio';
      // Missing required Twilio config

      const service = new SMSNotificationService(mockHttpClient) as any;
      const result = await service.sendSMS('+1234567890', 'Test message');

      expect(result).toBe(false);
    });

    it('should handle missing Nexmo configuration', async () => {
      process.env.SMS_PROVIDER = 'nexmo';
      // Missing required Nexmo config

      const service = new SMSNotificationService(mockHttpClient) as any;
      const result = await service.sendSMS('+1234567890', 'Test message');

      expect(result).toBe(false);
    });

    it('should handle Twilio API errors', async () => {
      process.env.SMS_PROVIDER = 'twilio';
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';
      process.env.SMS_FROM_NUMBER = '+1234567890';

      (mockHttpClient.post as any).mockRejectedValue(new Error('Twilio API error'));

      const service = new SMSNotificationService(mockHttpClient) as any;
      const result = await service.sendSMS('+0987654321', 'Test message');

      expect(result).toBe(false);
    });

    it('should handle Nexmo API response with error status', async () => {
      process.env.SMS_PROVIDER = 'nexmo';
      process.env.NEXMO_API_KEY = 'test-key';
      process.env.NEXMO_API_SECRET = 'test-secret';

      (mockHttpClient.post as any).mockResolvedValue({
        data: { messages: [{ status: '1' }] }, // Error status
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const service = new SMSNotificationService(mockHttpClient) as any;
      const result = await service.sendSMS('+0987654321', 'Test message');

      expect(result).toBe(false);
    });
  });
});
