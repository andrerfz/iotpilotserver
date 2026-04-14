import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SlackNotificationService} from '../slack-notification.service';
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
      AlertId.fromString('alert-1'),
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
    delete process.env.SLACK_NOTIFICATIONS_ENABLED;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DASHBOARD_URL;
  });

  describe('constructor', () => {
    it('should initialize with default values when environment variables are not set', () => {
      const service = new SlackNotificationService(mockHttpClient);
      expect(service).toBeInstanceOf(SlackNotificationService);
    });

    it('should initialize with environment variables when set', () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      process.env.DASHBOARD_URL = 'https://test.com';

      const service = new SlackNotificationService(mockHttpClient);
      expect(service).toBeInstanceOf(SlackNotificationService);
    });
  });

  describe('sendAlertNotification', () => {
    it('should return false when Slack notifications are disabled', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'false';

      const service = new SlackNotificationService();
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });

    it('should return false when no webhook URL is configured', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      // No webhook URL configured

      const service = new SlackNotificationService();
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });

    it('should send alert notification successfully with default webhook', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';
      process.env.DASHBOARD_URL = 'https://test.com';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService(mockHttpClient);
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/default',
        expect.objectContaining({
          blocks: expect.any(Array),
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

      const service = new SlackNotificationService(mockHttpClient);
      const customWebhook = 'https://hooks.slack.com/custom';
      const result = await service.sendAlertNotification(alert, customWebhook, CustomerId.create('ctenant10000000000000000001'));

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
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('ctenant10000000000000000001'));

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
          offlineDevices: 2,
          activeAlerts: 2,
          avgCpuUsage: 45.5,
          avgMemoryUsage: 60.2
        },
        devices: [
          { name: 'Device 1', status: 'online', cpuUsage: 45, memoryUsage: 60, diskUsage: 30 }
        ],
        alerts: [
          { title: 'High CPU', severity: 'CRITICAL', deviceId: 'dev-1', createdAt: new Date(), metadata: {} }
        ]
      };

      const service = new SlackNotificationService(mockHttpClient);
      const result = await service.sendSummaryReport(reportData, null, CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/default',
        expect.objectContaining({
          blocks: expect.any(Array)
        }),
        expect.any(Object)
      );
    });

    it('should return false when Slack notifications are disabled', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'false';

      const service = new SlackNotificationService();
      const result = await service.sendSummaryReport({}, null, CustomerId.create('ctenant10000000000000000001'));

      expect(result).toBe(false);
    });
  });

  describe('sendChannelMessage', () => {
    it.skip('should send channel message successfully', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService();
      const result = await service.sendChannelMessage('Test message', '#general', null, CustomerId.create('ctenant10000000000000000001'));

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

    it.skip('should handle missing channel gracefully', async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/default';

      (mockHttpClient.post as any).mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} });

      const service = new SlackNotificationService();
      const result = await service.sendChannelMessage('Test message', null, null, CustomerId.create('ctenant10000000000000000001'));

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
        const service = new SlackNotificationService(mockHttpClient) as any;
        const payload = service.createAlertPayload(alert, CustomerId.create('ctenant10000000000000000001'));

        expect(payload).toHaveProperty('blocks');
        expect(payload).toHaveProperty('attachments');
        expect(payload.blocks).toBeInstanceOf(Array);
        expect(payload.attachments).toHaveLength(1);
        expect(payload.attachments[0]).toHaveProperty('color', '#dc3545');
      });

      it('should use appropriate colors for different severities', () => {
        const service = new SlackNotificationService(mockHttpClient) as any;
        const cid = CustomerId.create('ctenant10000000000000000001');
        const did = DeviceId.create('device-1');
        const tid = ThresholdId.create('threshold-1');
        const mv = MetricValue.create(95.0, 'percent');
        const ts = new Date('2023-01-01T10:00:00Z');

        const criticalAlert = Alert.create(
          AlertId.fromString('alert-c'), 'Critical Alert', 'desc',
          AlertSeverity.create('CRITICAL'), AlertStatus.create('ACTIVE'),
          did, cid, 'cpu_usage', mv, 90.0, tid, ts
        );
        const criticalPayload = service.createAlertPayload(criticalAlert, cid);
        expect(criticalPayload.attachments[0].color).toBe('#dc3545');

        const warningAlert = Alert.create(
          AlertId.fromString('alert-m'), 'Medium Alert', 'desc',
          AlertSeverity.create('MEDIUM'), AlertStatus.create('ACTIVE'),
          did, cid, 'cpu_usage', mv, 90.0, tid, ts
        );
        const warningPayload = service.createAlertPayload(warningAlert, cid);
        expect(warningPayload.attachments[0].color).toBe('#ffc107');

        const infoAlert = Alert.create(
          AlertId.fromString('alert-l'), 'Low Alert', 'desc',
          AlertSeverity.create('LOW'), AlertStatus.create('ACTIVE'),
          did, cid, 'cpu_usage', mv, 90.0, tid, ts
        );
        const infoPayload = service.createAlertPayload(infoAlert, cid);
        expect(infoPayload.attachments[0].color).toBe('#0d6efd');
      });
    });

    describe('createReportPayload', () => {
      it('should create proper report payload structure', () => {
        const service = new SlackNotificationService(mockHttpClient) as any;
        const reportData = {
          summary: {
            totalDevices: 10,
            onlineDevices: 8,
            offlineDevices: 2,
            activeAlerts: 2,
            avgCpuUsage: 45.5,
            avgMemoryUsage: 60.2
          },
          devices: [
            { name: 'Device 1', status: 'online', cpuUsage: 45, memoryUsage: 60, diskUsage: 30 }
          ],
          alerts: [
            { title: 'High CPU', severity: 'CRITICAL', deviceId: 'dev-1', createdAt: new Date(), metadata: {} }
          ]
        };

        const payload = service.createReportPayload(reportData, CustomerId.create('ctenant10000000000000000001'));

        expect(payload).toHaveProperty('blocks');
        expect(payload.blocks).toBeInstanceOf(Array);
        expect(payload.blocks.length).toBeGreaterThan(0);
      });
    });

    describe('getSeverityColor', () => {
      it('should return correct colors for severities', () => {
        const service = new SlackNotificationService(mockHttpClient) as any;

        expect(service.getSeverityColor(AlertSeverity.create('CRITICAL'))).toBe('#dc3545');
        expect(service.getSeverityColor(AlertSeverity.create('HIGH'))).toBe('#fd7e14');
        expect(service.getSeverityColor(AlertSeverity.create('MEDIUM'))).toBe('#ffc107');
        expect(service.getSeverityColor(AlertSeverity.create('LOW'))).toBe('#0d6efd');
      });
    });

    describe('getSeverityEmoji', () => {
      it('should return correct emojis for severities', () => {
        const service = new SlackNotificationService(mockHttpClient) as any;

        expect(service.getSeverityEmoji(AlertSeverity.create('CRITICAL'))).toBe(':red_circle:');
        expect(service.getSeverityEmoji(AlertSeverity.create('HIGH'))).toBe(':large_orange_circle:');
        expect(service.getSeverityEmoji(AlertSeverity.create('MEDIUM'))).toBe(':large_yellow_circle:');
        expect(service.getSeverityEmoji(AlertSeverity.create('LOW'))).toBe(':large_blue_circle:');
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
      const result = await service.sendAlertNotification(alert, null, CustomerId.create('ctenant10000000000000000001'));

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

      const service = new SlackNotificationService(mockHttpClient);
      await service.sendAlertNotification(alert, null, CustomerId.create('ctenant10000000000000000001'));

      expect(consoleSpy).toHaveBeenCalledWith('Slack alert notification sent');

      consoleSpy.mockRestore();
    });
  });
});
