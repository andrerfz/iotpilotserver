import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SlackNotificationService} from '../slack-notification.service';
import {AlertId} from '../../../domain/value-objects/alert-id.vo';
import {AlertSeverity} from '../../../domain/value-objects/alert-severity.vo';
import {AlertStatus} from '../../../domain/value-objects/alert-status.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ThresholdId} from '../../../domain/value-objects/threshold-id.vo';
import {MetricValue} from '../../../domain/value-objects/metric-value.vo';
import {HttpClient} from '@/lib/shared/domain/interfaces/http-client.interface';

/// <reference types="node" />

describe('SlackNotificationService', () => {
  let slackService: SlackNotificationService;
  let alert: Alert;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.SLACK_NOTIFICATIONS_ENABLED;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DASHBOARD_URL;

    // Create mock HttpClient
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.clearAllMocks();

    slackService = new SlackNotificationService(mockHttpClient);

    alert = Alert.create(
      AlertId.create('alert-1'),
      'High CPU Usage Alert',
      'CPU usage has exceeded 90%',
      AlertSeverity.create('CRITICAL'),
      AlertStatus.create('ACTIVE'),
      DeviceId.create('device-1'),
      CustomerId.create('tenant-1'),
      'cpu_usage',
      MetricValue.create(95.0, 'percent'),
      90.0,
      ThresholdId.create('threshold-1'),
      new Date('2023-01-01T10:00:00Z')
    );
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SLACK_NOTIFICATIONS_ENABLED;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DASHBOARD_URL;
  });

  describe('constructor', () => {
    it('should initialize with default values when environment variables are not set', () => {
      const service = new SlackNotificationService();
      expect(service).toBeInstanceOf(SlackNotificationService);
    });

    it('should initialize with environment variables when set', () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      process.env.DASHBOARD_URL = 'https://test.com';

      const service = new SlackNotificationService();
      expect(service).toBeInstanceOf(SlackNotificationService);
    });
  });

  describe('sendAlertNotification', () => {
    it('should return false when Slack notifications are disabled', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'false';

      const service = new SlackNotificationService();
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('tenant-1'));

      expect(result).toBe(false);
    });

    it('should return false when no webhook URL is configured', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      // No webhook URL configured

      const service = new SlackNotificationService();
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('tenant-1'));

      expect(result).toBe(false);
    });

    it('should send alert notification successfully with default webhook', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';
      process.env.DASHBOARD_URL = 'https://test.com';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService();
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('tenant-1'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/default',
        expect.objectContaining({
          text: expect.stringContaining('🚨 CRITICAL ALERT'),
          attachments: expect.any(Array)
        }),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should send alert notification successfully with custom webhook', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService();
      const customWebhook = 'https://hooks.slack.com/custom';
      const result = await service.sendAlertNotification(alert, customWebhook, CustomerId.create('tenant-1'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        customWebhook,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      (mockHttpClient.post as any).mockRejectedValue(new Error('Slack API error'));

      const service = new SlackNotificationService();
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('tenant-1'));

      expect(result).toBe(false);
    });
  });

  describe('sendSummaryReport', () => {
    it('should send summary report successfully', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';
      process.env.DASHBOARD_URL = 'https://test.com';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const reportData = {
        summary: {
          totalDevices: 10,
          onlineDevices: 8,
          activeAlerts: 2,
          avgCpuUsage: 45.5,
          avgMemoryUsage: 60.2
        },
        period: {
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-01T23:59:59Z')
        }
      };

      const service = new SlackNotificationService();
      const result = await service.sendSummaryReport(reportData, null, CustomerId.create('tenant-1'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/default',
        expect.objectContaining({
          text: expect.stringContaining('📊 IoT Pilot Summary Report'),
          attachments: expect.any(Array)
        }),
        expect.any(Object)
      );
    });

    it('should return false when Slack notifications are disabled', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'false';

      const service = new SlackNotificationService();
      const result = await service.sendSummaryReport({}, null, CustomerId.create('tenant-1'));

      expect(result).toBe(false);
    });
  });

  describe('sendChannelMessage', () => {
    it('should send channel message successfully', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService();
      const result = await service.sendChannelMessage('Test message', '#general', null, CustomerId.create('tenant-1'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/default',
        expect.objectContaining({
          channel: '#general',
          text: 'Test message'
        }),
        expect.any(Object)
      );
    });

    it('should handle missing channel gracefully', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService();
      const result = await service.sendChannelMessage('Test message', null, null, CustomerId.create('tenant-1'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/default',
        expect.objectContaining({
          text: 'Test message'
        }),
        expect.any(Object)
      );
    });
  });

  describe('payload creation methods', () => {
    describe('createAlertPayload', () => {
      it('should create proper alert payload structure', () => {
        const service = new SlackNotificationService() as any;
        const payload = service.createAlertPayload(alert, CustomerId.create('tenant-1'));

        expect(payload).toHaveProperty('text');
        expect(payload).toHaveProperty('attachments');
        expect(payload.attachments).toHaveLength(1);

        const attachment = payload.attachments[0];
        expect(attachment).toHaveProperty('color', 'danger');
        expect(attachment).toHaveProperty('title', '🚨 CRITICAL ALERT: High CPU Usage Alert');
        expect(attachment).toHaveProperty('fields');
        expect(attachment.fields).toContainEqual(
          expect.objectContaining({
            title: 'Device',
            value: 'device-1',
            short: true
          })
        );
      });

      it('should use appropriate colors for different severities', () => {
        const service = new SlackNotificationService() as any;

        const criticalAlert = { ...alert, severity: AlertSeverity.create('CRITICAL') };
        const criticalPayload = service.createAlertPayload(criticalAlert, CustomerId.create('tenant-1'));
        expect(criticalPayload.attachments[0].color).toBe('danger');

        const warningAlert = { ...alert, severity: AlertSeverity.create('MEDIUM') };
        const warningPayload = service.createAlertPayload(warningAlert, CustomerId.create('tenant-1'));
        expect(warningPayload.attachments[0].color).toBe('warning');

        const infoAlert = { ...alert, severity: AlertSeverity.create('LOW') };
        const infoPayload = service.createAlertPayload(infoAlert, CustomerId.create('tenant-1'));
        expect(infoPayload.attachments[0].color).toBe('good');
      });
    });

    describe('createReportPayload', () => {
      it('should create proper report payload structure', () => {
        const service = new SlackNotificationService() as any;
        const reportData = {
          summary: {
            totalDevices: 10,
            onlineDevices: 8,
            activeAlerts: 2,
            avgCpuUsage: 45.5,
            avgMemoryUsage: 60.2
          },
          period: {
            start: new Date('2023-01-01T00:00:00Z'),
            end: new Date('2023-01-01T23:59:59Z')
          }
        };

        const payload = service.createReportPayload(reportData, CustomerId.create('tenant-1'));

        expect(payload).toHaveProperty('text');
        expect(payload).toHaveProperty('attachments');
        expect(payload.attachments).toHaveLength(1);

        const attachment = payload.attachments[0];
        expect(attachment).toHaveProperty('color', '#36a64f');
        expect(attachment).toHaveProperty('title', '📊 IoT Pilot Summary Report');
        expect(attachment).toHaveProperty('fields');
      });
    });

    describe('getSeverityColor', () => {
      it('should return correct colors for severities', () => {
        const service = new SlackNotificationService() as any;

        expect(service.getSeverityColor(AlertSeverity.create('CRITICAL'))).toBe('danger');
        expect(service.getSeverityColor(AlertSeverity.create('HIGH'))).toBe('danger');
        expect(service.getSeverityColor(AlertSeverity.create('MEDIUM'))).toBe('warning');
        expect(service.getSeverityColor(AlertSeverity.create('LOW'))).toBe('good');
      });
    });

    describe('getSeverityEmoji', () => {
      it('should return correct emojis for severities', () => {
        const service = new SlackNotificationService() as any;

        expect(service.getSeverityEmoji(AlertSeverity.create('CRITICAL'))).toBe('🚨');
        expect(service.getSeverityEmoji(AlertSeverity.create('HIGH'))).toBe('⚠️');
        expect(service.getSeverityEmoji(AlertSeverity.create('MEDIUM'))).toBe('⚡');
        expect(service.getSeverityEmoji(AlertSeverity.create('LOW'))).toBe('ℹ️');
      });
    });
  });

  describe('error handling', () => {
    it('should log errors when webhook requests fail', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (mockHttpClient.post as any).mockRejectedValue(new Error('Webhook error'));

      const service = new SlackNotificationService();
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('tenant-1'));

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send Slack notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should log success messages', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService();
      await service.sendAlertNotification(alert, null, CustomerId.create('tenant-1'));

      expect(consoleSpy).toHaveBeenCalledWith('Slack alert notification sent');

      consoleSpy.mockRestore();
    });
  });
});
