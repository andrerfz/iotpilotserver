import {UserRepository} from '../../../user/domain/interfaces/user.repository';
import {UserEntity} from '../../../user/domain/entities/user.entity';
import {UserId} from '../../../user/domain/value-objects/user-id.vo';
import {Email} from '../../domain/value-objects/email.vo';
import {TenantContext} from '../../domain/tenant-context';
import {StructuredLogger} from '../logging/structured-logger';
import {DeviceRepository} from '../../../device/domain/interfaces/device.repository';
import {DeviceEntity} from '../../../device/domain/entities/device.entity';
import {DeviceId} from '../../../device/domain/value-objects/device-id.vo';

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
  relatedEntity?: {
    type: 'device' | 'user' | 'alert' | 'customer';
    id: string;
    name?: string;
  };
  actionUrl?: string;
  timestamp: Date;
}

export interface NotificationResult {
  notificationId: string;
  sentTo: Array<{
    userId: string;
    email: string;
    channel: string;
    success: boolean;
    error?: string;
  }>;
  totalSent: number;
  totalFailed: number;
  channelsUsed: string[];
}

export class NotificationService {
  private readonly SUPPORTED_CHANNELS = ['email', 'slack', 'sms', 'push', 'in-app'];

  constructor(
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly logger: StructuredLogger,
    private readonly emailService: any = null, // Email service implementation
    private readonly slackService?: any, // Slack integration
    private readonly smsService?: any // SMS service
  ) {}

  async sendNotification(
    payload: NotificationPayload,
    recipients: Array<string | UserId | UserEntity | Email>,
    channels: string[] = ['email'],
    tenantContext?: TenantContext
  ): Promise<NotificationResult> {
    try {
      // Validate channels
      const validChannels = channels.filter(channel => 
        this.SUPPORTED_CHANNELS.includes(channel)
      );
      
      if (validChannels.length === 0) {
        throw new Error('No valid notification channels specified');
      }

      // Resolve recipients to UserEntity objects
      const resolvedRecipients = await this.resolveRecipients(recipients, tenantContext);
      
      if (resolvedRecipients.length === 0) {
        throw new Error('No valid recipients found');
      }

      // Validate tenant access for all recipients
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        for (const user of resolvedRecipients) {
          if (user.customerId && customerId && !user.customerId.equals(customerId)) {
            throw new Error(`Unauthorized access to user ${user.id.getValue()}`);
          }
        }
      }

      const results: Array<{
        userId: string;
        email: string;
        channel: string;
        success: boolean;
        error?: string;
      }> = [];

      const channelPromises = validChannels.map(async (channel) => {
        const channelResults = await this.sendViaChannel(
          payload,
          resolvedRecipients,
          channel,
          tenantContext
        );
        
        results.push(...channelResults);
      });

      await Promise.allSettled(channelPromises);

      const totalSent = results.filter(r => r.success).length;
      const totalFailed = results.length - totalSent;
      const channelsUsed = [...new Set(results.map(r => r.channel))];

      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const notificationResult: NotificationResult = {
        notificationId,
        sentTo: results,
        totalSent,
        totalFailed,
        channelsUsed
      };

      this.logger.info('Notification sent successfully', {
        notificationId,
        type: payload.type,
        title: payload.title,
        severity: payload.severity,
        recipientCount: resolvedRecipients.length,
        channelsUsed: channelsUsed.join(', '),
        totalSent,
        totalFailed,
        tenantId: tenantContext?.getTenantId()?.getValue(),
        relatedEntity: payload.relatedEntity
      });

      if (totalFailed > 0) {
        this.logger.warn('Some notifications failed', {
          notificationId,
          failedCount: totalFailed,
          failedRecipients: results.filter(r => !r.success).map(r => ({ userId: r.userId, error: r.error }))
        });
      }

      return notificationResult;
      
    } catch (error) {
      this.logger.error('Failed to send notification', {
        type: payload.type,
        title: payload.title,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tenantId: tenantContext?.getTenantId()
      });
      throw error;
    }
  }

  async sendAlertNotification(
    alert: any, // AlertEntity
    tenantContext?: TenantContext,
    channels: string[] = ['email', 'slack']
  ): Promise<NotificationResult> {
    const deviceId = alert.deviceId.value;
    
    // Get device details for context
    const device = await this.deviceRepository.findById(
      DeviceId.fromString(deviceId), 
      tenantContext
    );
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found for alert notification`);
    }

    const payload: NotificationPayload = {
      type: 'alert',
      title: `Alert: ${alert.severity.value.toUpperCase()} - ${alert.type.value}`,
      message: alert.message,
      severity: alert.severity.value as any,
      metadata: {
        alertId: alert.id.value,
        deviceId,
        deviceName: device.name.value,
        customerId: device.customerId?.value || null,
        timestamp: alert.createdAt
      },
      relatedEntity: {
        type: 'alert',
        id: alert.id.value,
        name: `${alert.type.value} - ${device.name.value}`
      },
      actionUrl: `/alerts/${alert.id.value}?device=${deviceId}`,
      timestamp: new Date()
    };

    // Determine recipients based on severity
    const recipients = await this.getAlertRecipients(
      alert.severity.value,
      device.customerId?.value || '',
      tenantContext
    );

    return this.sendNotification(payload, recipients, channels, tenantContext);
  }

  async sendDeviceStatusNotification(
    device: DeviceEntity,
    statusChange: { from: string; to: string },
    tenantContext?: TenantContext,
    channels: string[] = ['email']
  ): Promise<NotificationResult> {
    const payload: NotificationPayload = {
      type: 'device_status',
      title: `Device Status Change: ${device.name.value}`,
      message: `Device ${device.name.value} status changed from ${statusChange.from} to ${statusChange.to}`,
      severity: this.getStatusSeverity(statusChange.to),
      metadata: {
        deviceId: device.id.value,
        previousStatus: statusChange.from,
        newStatus: statusChange.to,
        ipAddress: device.getIpAddress()?.value,
        lastSeen: device.getLastSeen(),
        customerId: device.customerId?.value || null
      },
      relatedEntity: {
        type: 'device',
        id: device.id.value,
        name: device.name.value
      },
      actionUrl: `/devices/${device.id.value}`,
      timestamp: new Date()
    };

    // Notify device owners and customer admins
    const customerId = device.customerId?.value || '';
    const recipients = await this.getDeviceStatusRecipients(
      device,
      customerId,
      tenantContext
    );

    return this.sendNotification(payload, recipients, channels, tenantContext);
  }

  private async resolveRecipients(
    recipients: Array<string | UserId | UserEntity | Email>,
    tenantContext?: TenantContext
  ): Promise<UserEntity[]> {
    const resolvedUsers: UserEntity[] = [];

    for (const recipient of recipients) {
      try {
        let user: UserEntity | null = null;

        if (typeof recipient === 'string') {
          // Email address
          const email = Email.fromString(recipient);
          user = await this.userRepository.findByEmail(email, tenantContext);
        } else if (recipient instanceof UserId) {
          // User ID
          user = await this.userRepository.findById(recipient, tenantContext);
        } else if (recipient instanceof UserEntity) {
          // Already resolved user
          user = recipient;
        } else if (recipient instanceof Email) {
          // Email object
          user = await this.userRepository.findByEmail(recipient, tenantContext);
        }

        if (user && user.isActive && !user.isDeleted) {
          resolvedUsers.push(user);
        } else {
          this.logger.warn('Invalid or inactive recipient', {
            recipient: typeof recipient === 'string' ? recipient : 'complex-object',
            type: typeof recipient,
            found: !!user,
            isActive: user?.isActive,
            isDeleted: user?.isDeleted
          });
        }

      } catch (error) {
        this.logger.warn('Failed to resolve recipient', {
          recipient: typeof recipient === 'string' ? recipient : '[object]',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return resolvedUsers;
  }

  private async sendViaChannel(
    payload: NotificationPayload,
    users: UserEntity[],
    channel: string,
    tenantContext?: TenantContext
  ): Promise<Array<{
    userId: string;
    email: string;
    channel: string;
    success: boolean;
    error?: string;
  }>> {
    const results: Array<{
      userId: string;
      email: string;
      channel: string;
      success: boolean;
      error?: string;
    }> = [];

    const channelPromises = users.map(async (user) => {
      let success = false;
      let error: string | undefined;

      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(payload, user, tenantContext);
            success = true;
            break;
            
          case 'slack':
            if (this.slackService) {
              await this.sendSlackNotification(payload, user);
              success = true;
            } else {
              error = 'Slack service not configured';
            }
            break;
            
          case 'sms':
            if (this.smsService && user.phoneNumber) {
              await this.sendSmsNotification(payload, user);
              success = true;
            } else {
              error = 'SMS service not configured or no phone number';
            }
            break;
            
          case 'push':
            // Implementation for push notifications
            success = true; // Placeholder
            break;
            
          case 'in-app':
            // Implementation for in-app notifications
            await this.saveInAppNotification(payload, user.id);
            success = true;
            break;
            
          default:
            error = `Unsupported channel: ${channel}`;
        }

      } catch (channelError) {
        error = channelError instanceof Error ? channelError.message : 'Unknown error';
        this.logger.error('Notification channel error', {
          userId: user.id.getValue(),
          email: user.email.getValue(),
          channel,
          payloadType: payload.type,
          error: error,
          stack: (channelError as Error).stack
        });
      }

      results.push({
        userId: user.id.getValue(),
        email: user.email.getValue(),
        channel,
        success,
        error
      });
    });

    await Promise.allSettled(channelPromises);
    return results;
  }

  private async sendEmailNotification(
    payload: NotificationPayload,
    user: UserEntity,
    tenantContext?: TenantContext
  ): Promise<void> {
    const emailSubject = this.generateEmailSubject(payload);
    const emailBody = this.generateEmailBody(payload, user);
    
    // Implementation would use actual email service
    await this.emailService.send({
      to: user.email.getValue(),
      subject: emailSubject,
      html: emailBody,
      from: 'noreply@iotpilot.app',
      metadata: {
        userId: user.id.getValue(),
        tenantId: tenantContext?.getTenantId()?.getValue(),
        notificationType: payload.type,
        severity: payload.severity
      }
    });
  }

  private async sendSlackNotification(
    payload: NotificationPayload,
    user: UserEntity
  ): Promise<void> {
    if (!this.slackService) {
      throw new Error('Slack service not configured');
    }

    // Get user's Slack ID or channel from preferences
    const slackChannel = await this.getUserSlackChannel(user.id.getValue());
    
    if (!slackChannel) {
      throw new Error('User not configured for Slack notifications');
    }

    const slackMessage = this.generateSlackMessage(payload);
    
    await this.slackService.postMessage({
      channel: slackChannel,
      text: slackMessage.summary,
      blocks: slackMessage.blocks
    });
  }

  private async sendSmsNotification(
    payload: NotificationPayload,
    user: UserEntity
  ): Promise<void> {
    if (!this.smsService || !user.phoneNumber) {
      throw new Error('SMS service not configured or no phone number');
    }

    const smsMessage = this.generateSmsMessage(payload);
    
    await this.smsService.send({
      to: user.phoneNumber,
      message: smsMessage,
      metadata: {
        userId: user.id.getValue(),
        type: payload.type,
        severity: payload.severity
      }
    });
  }

  private async saveInAppNotification(
    payload: NotificationPayload,
    userId: UserId
  ): Promise<void> {
    // Implementation would save to in-app notification table
    // For now, just log
    this.logger.debug('In-app notification saved', {
      userId: userId.getValue(),
      type: payload.type,
      title: payload.title,
      severity: payload.severity
    });
  }

  private async getAlertRecipients(
    severity: string,
    customerId: string,
    tenantContext?: TenantContext
  ): Promise<UserEntity[]> {
    const criteria = {
      customerId,
      isActive: true,
      deletedAt: null
    };

    let recipients: UserEntity[] = [];

    switch (severity) {
      case 'critical':
      case 'high':
        // Notify all admins and super admins
        // TODO: Implement findByRole in UserRepository or use findAll and filter
        recipients = await this.userRepository.findAll(tenantContext);
        recipients = recipients.filter(user => {
          const role = user.getRole().getValue();
          return role === 'ADMIN' || role === 'SUPERADMIN';
        });
        break;
        
      case 'medium':
        // Notify customer admins only
        recipients = await this.userRepository.findAll(tenantContext);
        recipients = recipients.filter(user => user.getRole().getValue() === 'ADMIN');
        break;
        
      case 'low':
        // Notify device owners or specific users
        recipients = await this.userRepository.findAll(tenantContext);
        recipients = recipients.filter(user => user.getRole().getValue() === 'USER');
        break;
        
      default:
        // Default to customer admins
        recipients = await this.userRepository.findAll(tenantContext);
        recipients = recipients.filter(user => user.getRole().getValue() === 'ADMIN');
    }

    return recipients.filter(user => user.isActive && !user.isLocked);
  }

  private async getDeviceStatusRecipients(
    device: DeviceEntity,
    customerId: string,
    tenantContext?: TenantContext
  ): Promise<UserEntity[]> {
    const criteria = {
      customerId: customerId,
      isActive: true,
      deletedAt: null
    };

    // For critical status changes, notify admins
    // For minor changes, notify device owners
    const statusChangeSeverity = device.isOnline() ? 'medium' : 'high';
    
    if (statusChangeSeverity === 'high') {
      // Device went offline - notify all admins
      const all = await this.userRepository.findAll(tenantContext);
      return all.filter(user => user.getRole().getValue() === 'ADMIN');
    } else {
      // Device came online - notify relevant users
      // Implementation would find device owners/assigned users
      const all = await this.userRepository.findAll(tenantContext);
      const admins = all.filter(user => user.getRole().getValue() === 'ADMIN');
      return admins.slice(0, 3); // Limit notifications for non-critical changes
    }
  }

  private async getUserSlackChannel(userId: string): Promise<string | null> {
    // Implementation would get from user preferences or integration settings
    // For now, return a default channel
    return `#device-alerts`; // or null if not configured
  }

  private generateEmailSubject(payload: NotificationPayload): string {
    const prefixes = {
      alert: '🚨 Alert',
      'device_status': '📱 Device Status',
      maintenance: '🔧 Maintenance',
      'user_action': '👤 User Action'
    };

    const prefix = prefixes[payload.type as keyof typeof prefixes] || '📢 Notification';
    return `${prefix}: ${payload.title}`;
  }

  private generateEmailBody(payload: NotificationPayload, user: UserEntity): string {
    const severityColors = {
      low: '#90EE90',
      medium: '#FFD700',
      high: '#FFA500',
      critical: '#FF4500'
    };

    const color = severityColors[payload.severity || 'medium'] || '#90EE90';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${color}; padding: 20px; color: white;">
          <h1 style="margin: 0; font-size: 24px;">${payload.title}</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${payload.timestamp.toLocaleString()}</p>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Message</h2>
          <p style="color: #555; line-height: 1.6;">${payload.message}</p>
          
          ${payload.metadata ? `
            <div style="margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid ${color};">
              <h3 style="margin-top: 0; color: #333;">Details</h3>
              <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(payload.metadata, null, 2)}
              </pre>
            </div>
          ` : ''}
          
          ${payload.actionUrl ? `
            <div style="margin-top: 20px; text-align: center;">
              <a href="${payload.actionUrl}" 
                 style="background-color: ${color}; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 4px; font-weight: bold;
                        display: inline-block;">
                View Details
              </a>
            </div>
          ` : ''}
        </div>
        
        <div style="padding: 20px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated notification from IoT Pilot.</p>
          <p>You received this because you are subscribed to ${payload.type} notifications.</p>
          <p><a href="https://iotpilot.app/preferences" style="color: #007bff;">Manage Preferences</a></p>
        </div>
      </div>
    `;
  }

  private generateSlackMessage(payload: NotificationPayload): {
    summary: string;
    blocks: any[];
  } {
    const emojiBySeverity = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    const emoji = emojiBySeverity[payload.severity || 'medium'] || '🔔';
    
    return {
      summary: `${emoji} *${payload.title}*\n${payload.message}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${payload.title}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Message:*\n${payload.message}`
          }
        },
        ...(payload.metadata ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n\`\`\`${JSON.stringify(payload.metadata, null, 2)}\`\`\``
          }
        }] : []),
        ...(payload.actionUrl ? [{
          type: 'actions',
          elements: [{
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details'
            },
            url: payload.actionUrl,
            style: payload.severity === 'critical' ? 'danger' : 
                   payload.severity === 'high' ? 'primary' : 'default'
          }]
        }] : [])
      ]
    };
  }

  private generateSmsMessage(payload: NotificationPayload): string {
    const maxLength = 160;
    let message = `[IoT Pilot] ${payload.title}: ${payload.message}`;
    
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }
    
    return message;
  }

  private getStatusSeverity(status: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalStatuses = ['offline', 'critical_failure', 'disconnected'];
    const highStatuses = ['maintenance', 'warning', 'degraded'];
    const mediumStatuses = ['inactive', 'low_battery'];
    const lowStatuses = ['online', 'active', 'healthy'];
    
    if (criticalStatuses.includes(status)) return 'critical';
    if (highStatuses.includes(status)) return 'high';
    if (mediumStatuses.includes(status)) return 'medium';
    if (lowStatuses.includes(status)) return 'low';
    
    return 'medium';
  }
}
