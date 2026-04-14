import {Injectable} from '@nestjs/common';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import type {HttpClient} from '@iotpilot/core/shared/domain/interfaces/http-client.interface';

@Injectable()
export class SMSNotificationService {
  private readonly enabled: boolean;
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly fromNumber: string;
  private readonly dashboardUrl: string;

  constructor(private readonly httpClient: HttpClient) {
    this.enabled = (process.env.SMS_NOTIFICATIONS_ENABLED || 'false') === 'true';
    this.provider = process.env.SMS_PROVIDER || 'twilio';
    this.apiKey = process.env.SMS_API_KEY || '';
    this.fromNumber = process.env.SMS_FROM_NUMBER || '';
    this.dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
  }

  /**
   * Sends an alert notification via SMS
   * @param alert The alert to send
   * @param phoneNumbers The phone numbers to send to
   * @param customerId The customer ID
   * @returns True if the notification was sent successfully
   */
  async sendAlertNotification(
    alert: Alert, 
    phoneNumbers: string[], 
    customerId: CustomerId
  ): Promise<boolean> {
    if (!this.enabled || phoneNumbers.length === 0) {
      return false;
    }

    try {
      const message = this.createAlertMessage(alert);
      
      const results = await Promise.all(
        phoneNumbers.map(phoneNumber => 
          this.sendSMS(phoneNumber, message)
        )
      );
      
      const success = results.some(result => result);
      if (success) {
        console.log('SMS alert notification sent');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      return false;
    }
  }

  /**
   * Sends a summary report via SMS
   * @param reportData The report data
   * @param phoneNumbers The phone numbers to send to
   * @param customerId The customer ID
   * @returns True if the notification was sent successfully
   */
  async sendSummaryReport(
    reportData: any, 
    phoneNumbers: string[], 
    customerId: CustomerId
  ): Promise<boolean> {
    if (!this.enabled || phoneNumbers.length === 0) {
      return false;
    }

    try {
      const message = this.createReportMessage(reportData);
      
      const results = await Promise.all(
        phoneNumbers.map(phoneNumber => 
          this.sendSMS(phoneNumber, message)
        )
      );
      
      const success = results.some(result => result);
      if (success) {
        console.log('SMS report notification sent');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to send SMS report:', error);
      return false;
    }
  }

  /**
   * Sends an SMS message using the configured provider
   * @param to The phone number to send to
   * @param message The message to send
   * @returns True if the message was sent successfully
   */
  private async sendSMS(to: string, message: string): Promise<boolean> {
    switch (this.provider.toLowerCase()) {
      case 'twilio':
        return this.sendTwilioSMS(to, message);
      case 'aws-sns':
        return this.sendAWSSNS(to, message);
      case 'nexmo':
        return this.sendNexmoSMS(to, message);
      default:
        console.error(`Unsupported SMS provider: ${this.provider}`);
        return false;
    }
  }

  /**
   * Sends an SMS message using Twilio
   * @param to The phone number to send to
   * @param message The message to send
   * @returns True if the message was sent successfully
   */
  private async sendTwilioSMS(to: string, message: string): Promise<boolean> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
      const authToken = process.env.TWILIO_AUTH_TOKEN || '';
      
      if (!accountSid || !authToken || !this.fromNumber) {
        console.error('Missing Twilio configuration');
        return false;
      }
      
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const params = new URLSearchParams({
        To: to,
        From: this.fromNumber,
        Body: message
      });
      
      // Note: HttpClient doesn't support basic auth directly, so we'll need to add it to headers
      // For now, we'll use a workaround with base64 encoding
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const response = await this.httpClient.post(
        url,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
          }
        }
      );
      
      return response.status === 201;
    } catch (error) {
      console.error('Failed to send Twilio SMS:', error);
      return false;
    }
  }

  /**
   * Sends an SMS message using AWS SNS
   * @param to The phone number to send to
   * @param message The message to send
   * @returns True if the message was sent successfully
   */
  private async sendAWSSNS(to: string, message: string): Promise<boolean> {
    try {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
      const region = process.env.AWS_REGION || 'us-east-1';
      
      if (!accessKeyId || !secretAccessKey) {
        console.error('Missing AWS configuration');
        return false;
      }
      
      // In a real implementation, we would use the AWS SDK
      // This is a simplified example using axios
      const url = `https://sns.${region}.amazonaws.com/`;
      
      const params = {
        Action: 'Publish',
        Message: message,
        PhoneNumber: to,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'IoTPilot'
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };
      
      // Note: In a real implementation, we would need to sign the request
      // using AWS Signature V4, which is complex and beyond the scope of this example
      const response = await this.httpClient.post(url, params);
      
      return response.status === 200;
    } catch (error) {
      console.error('Failed to send AWS SNS SMS:', error);
      return false;
    }
  }

  /**
   * Sends an SMS message using Nexmo/Vonage
   * @param to The phone number to send to
   * @param message The message to send
   * @returns True if the message was sent successfully
   */
  private async sendNexmoSMS(to: string, message: string): Promise<boolean> {
    try {
      const apiKey = process.env.NEXMO_API_KEY || '';
      const apiSecret = process.env.NEXMO_API_SECRET || '';
      
      if (!apiKey || !apiSecret) {
        console.error('Missing Nexmo configuration');
        return false;
      }
      
      const url = 'https://rest.nexmo.com/sms/json';
      
      const response = await this.httpClient.post(
        url,
        {
          api_key: apiKey,
          api_secret: apiSecret,
          to,
          from: 'IoTPilot',
          text: message
        }
      );
      
      const data: any = response.data as any;
      return response.status === 200 && 
             data.messages && 
             data.messages[0].status === '0';
    } catch (error) {
      console.error('Failed to send Nexmo SMS:', error);
      return false;
    }
  }

  /**
   * Creates an SMS message for an alert
   * @param alert The alert
   * @returns The SMS message
   */
  private createAlertMessage(alert: Alert): string {
    const severityPrefix = this.getSeverityPrefix(alert.severity);
    const timestamp = alert.createdAt.toLocaleString();
    const metricName = alert.metricName || 'N/A';
    const metricValue = alert.metricValue;
    const metricValueStr = metricValue ? `${metricValue.value} ${metricValue.unit}` : 'N/A';
    const thresholdValue = alert.thresholdValue ?? 'N/A';
    const unit = metricValue?.unit ?? '';
    const deviceIdStr = alert.deviceId?.getValue?.() ?? 'N/A';

    return `${severityPrefix} ALERT: ${alert.title}\n` +
           `Device: ${deviceIdStr}\n` +
           `Time: ${timestamp}\n` +
           `Metric: ${metricName}\n` +
           `Value: ${metricValueStr}\n` +
           `Threshold: ${thresholdValue} ${unit}\n\n` +
           `View in IoT Pilot: ${this.dashboardUrl}/devices/${deviceIdStr}`;
  }

  /**
   * Creates an SMS message for a report
   * @param reportData The report data
   * @returns The SMS message
   */
  private createReportMessage(reportData: any): string {
    const reportDate = new Date().toLocaleDateString();
    
    return `IoT Pilot Summary (${reportDate}):\n` +
           `Devices: ${reportData.summary.totalDevices} (${reportData.summary.onlineDevices} online)\n` +
           `Alerts: ${reportData.summary.activeAlerts}\n` +
           `Avg CPU: ${reportData.summary.avgCpuUsage}%\n` +
           `Avg Mem: ${reportData.summary.avgMemoryUsage}%\n\n` +
           `View dashboard: ${this.dashboardUrl}/monitoring`;
  }

  /**
   * Gets a prefix based on alert severity
   * @param severity The alert severity
   * @returns The severity prefix
   */
  private getSeverityPrefix(severity: AlertSeverity): string {
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
        return '';
    }
  }
}