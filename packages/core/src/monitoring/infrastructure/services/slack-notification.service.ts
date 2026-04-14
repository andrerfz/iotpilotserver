import {Injectable} from '@nestjs/common';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import type {HttpClient} from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

@Injectable()
export class SlackNotificationService {
  private readonly enabled: boolean;
  private readonly defaultWebhookUrl: string;
  private readonly dashboardUrl: string;

  constructor(private readonly httpClient: HttpClient) {
    this.enabled = (process.env.SLACK_NOTIFICATIONS_ENABLED || 'false') === 'true';
    this.defaultWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
  }

  /**
   * Sends an alert notification to Slack
   * @param alert The alert to send
   * @param webhookUrl Optional custom webhook URL (falls back to default if not provided)
   * @param customerId The customer ID
   * @returns True if the notification was sent successfully
   */
  async sendAlertNotification(
    alert: Alert, 
    webhookUrl: string | null = null, 
    customerId: CustomerId
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const url = webhookUrl || this.defaultWebhookUrl;
    if (!url) {
      console.error('No Slack webhook URL configured');
      return false;
    }

    try {
      const payload = this.createAlertPayload(alert, customerId);
      
      await this.httpClient.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Slack alert notification sent');
      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  /**
   * Sends a summary report to Slack
   * @param reportData The report data
   * @param webhookUrl Optional custom webhook URL (falls back to default if not provided)
   * @param customerId The customer ID
   * @returns True if the notification was sent successfully
   */
  async sendSummaryReport(
    reportData: any, 
    webhookUrl: string | null = null, 
    customerId: CustomerId
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const url = webhookUrl || this.defaultWebhookUrl;
    if (!url) {
      console.error('No Slack webhook URL configured');
      return false;
    }

    try {
      const payload = this.createReportPayload(reportData, customerId);
      
      await this.httpClient.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Slack report notification sent');
      return true;
    } catch (error) {
      console.error('Failed to send Slack report:', error);
      return false;
    }
  }

  /**
   * Creates a Slack message payload for an alert
   * @param alert The alert
   * @param customerId The customer ID
   * @returns The Slack message payload
   */
  private createAlertPayload(alert: Alert, customerId: CustomerId): any {
    const color = this.getSeverityColor(alert.severity);
    const emoji = this.getSeverityEmoji(alert.severity);
    const timestamp = Math.floor(alert.createdAt.getTime() / 1000);
    
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${this.getSeverityText(alert.severity)} Alert: ${alert.title}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Device ID:*\n${alert.deviceId}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n<!date^${timestamp}^{date_short_pretty} at {time}|${alert.createdAt.toLocaleString()}>`
            },
            {
              type: 'mrkdwn',
              text: `*Metric:*\n${alert.metadata?.metricName || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*Value:*\n${alert.metadata?.metricValue?.value || 'N/A'} ${alert.metadata?.metricValue?.unit || ''}`
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:*\n${alert.metadata?.thresholdValue || 'N/A'} ${alert.metadata?.metricValue?.unit || ''}`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Device',
                emoji: true
              },
              url: `${this.dashboardUrl}/devices/${alert.deviceId}?customerId=${customerId.getValue()}`,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Acknowledge',
                emoji: true
              },
              url: `${this.dashboardUrl}/devices/${alert.deviceId}/alerts/${alert.getId().getValue()}?action=acknowledge&customerId=${customerId.getValue()}`,
              style: 'default'
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*IoT Pilot* | Alert ID: ${alert.id.value}`
            }
          ]
        }
      ],
      attachments: [
        {
          color: color
        }
      ]
    };
  }

  /**
   * Creates a Slack message payload for a report
   * @param reportData The report data
   * @param customerId The customer ID
   * @returns The Slack message payload
   */
  private createReportPayload(reportData: any, customerId: CustomerId): any {
    const reportDate = new Date().toLocaleDateString();
    
    // Create device status text
    const deviceStatusText = reportData.devices
      .slice(0, 5) // Limit to 5 devices to avoid message size limits
      .map((device: any) => {
        const statusEmoji = device.status === 'online' ? ':large_green_circle:' : ':red_circle:';
        return `${statusEmoji} *${device.name}* - CPU: ${device.cpuUsage}%, Mem: ${device.memoryUsage}%, Disk: ${device.diskUsage}%`;
      })
      .join('\n');
    
    // Create alert status text
    const alertStatusText = reportData.alerts
      .slice(0, 5) // Limit to 5 alerts
      .map((alert: any) => {
        const severityEmoji = this.getSeverityEmojiByName(alert.severity);
        return `${severityEmoji} *${alert.title}* - ${alert.metadata?.deviceName || alert.deviceId} - ${alert.createdAt.toLocaleString()}`;
      })
      .join('\n');
    
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `:chart_with_upwards_trend: IoT Pilot - System Summary Report - ${reportDate}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Here is your system summary report.'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*System Overview*'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Total Devices:*\n${reportData.summary.totalDevices}`
            },
            {
              type: 'mrkdwn',
              text: `*Online Devices:*\n${reportData.summary.onlineDevices}`
            },
            {
              type: 'mrkdwn',
              text: `*Offline Devices:*\n${reportData.summary.offlineDevices}`
            },
            {
              type: 'mrkdwn',
              text: `*Active Alerts:*\n${reportData.summary.activeAlerts}`
            },
            {
              type: 'mrkdwn',
              text: `*Avg CPU Usage:*\n${reportData.summary.avgCpuUsage}%`
            },
            {
              type: 'mrkdwn',
              text: `*Avg Memory Usage:*\n${reportData.summary.avgMemoryUsage}%`
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Device Status (Top 5)*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: deviceStatusText || 'No devices to display'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Recent Alerts (Top 5)*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alertStatusText || 'No alerts to display'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Full Dashboard',
                emoji: true
              },
              url: `${this.dashboardUrl}/monitoring?customerId=${customerId.value}`,
              style: 'primary'
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '*IoT Pilot* | Generated on ' + new Date().toLocaleString()
            }
          ]
        }
      ]
    };
  }

  /**
   * Gets a color based on alert severity
   * @param severity The alert severity
   * @returns The severity color
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity.value) {
      case 'CRITICAL':
        return '#dc3545'; // Red
      case 'HIGH':
        return '#fd7e14'; // Orange
      case 'MEDIUM':
        return '#ffc107'; // Yellow
      case 'LOW':
        return '#0d6efd'; // Blue
      default:
        return '#6c757d'; // Gray
    }
  }

  /**
   * Gets an emoji based on alert severity
   * @param severity The alert severity
   * @returns The severity emoji
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity.value) {
      case 'CRITICAL':
        return ':red_circle:';
      case 'HIGH':
        return ':large_orange_circle:';
      case 'MEDIUM':
        return ':large_yellow_circle:';
      case 'LOW':
        return ':large_blue_circle:';
      default:
        return ':white_circle:';
    }
  }

  /**
   * Gets an emoji based on severity name
   * @param severityName The severity name
   * @returns The severity emoji
   */
  private getSeverityEmojiByName(severityName: string): string {
    switch (severityName.toUpperCase()) {
      case 'CRITICAL':
        return ':red_circle:';
      case 'HIGH':
        return ':large_orange_circle:';
      case 'MEDIUM':
        return ':large_yellow_circle:';
      case 'LOW':
        return ':large_blue_circle:';
      default:
        return ':white_circle:';
    }
  }

  /**
   * Gets text based on alert severity
   * @param severity The alert severity
   * @returns The severity text
   */
  private getSeverityText(severity: AlertSeverity): string {
    switch (severity.value) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'UNKNOWN';
    }
  }
}