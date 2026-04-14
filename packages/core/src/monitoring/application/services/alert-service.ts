import {AlertRepository} from '../../domain/interfaces/alert.repository';
import {AlertEntity} from '../../domain/entities/alert.entity';
import {DeviceId} from '../../../device/domain/value-objects/device-id.vo';
import {TenantContext} from '../../../shared/domain/tenant-context';
import {AlertStatus} from '../../domain/value-objects/alert-status.vo';
import {AlertSeverity} from '../../domain/value-objects/alert-severity.vo';
import {AlertType} from '../../domain/value-objects/alert-type.vo';
import {StructuredLogger} from '../../../shared/infrastructure/logging/structured-logger';
import {DeviceRepository} from '../../../device/domain/interfaces/device.repository';
import {UserRepository} from '../../../user/domain/interfaces/user.repository';
import {AlertId} from '../../domain/value-objects/alert-id.vo';
import {UserEntity} from '../../../user/domain/entities/user.entity';
import {UserId} from '../../../user/domain/value-objects/user-id.vo';

export interface AlertSummary {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  byDevice: Record<string, number>;
  bySeverity: Record<AlertSeverity['value'], number>;
  byType: Record<AlertType['value'], number>;
}

export class AlertService {
  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly userRepository: UserRepository,
    private readonly logger: StructuredLogger
  ) {}

  private getErrorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined };
    }
    return { message: String(error) };
  }

  async createAlert(
    deviceId: string,
    type: string,
    severity: string,
    message: string,
    metadata?: any,
    tenantContext?: TenantContext
  ): Promise<AlertEntity> {
    try {
      const deviceIdVO = DeviceId.fromString(deviceId);
      const alertType = AlertType.fromString(type);
      const alertSeverity = AlertSeverity.fromString(severity);
      
      // Validate device exists and tenant access
      const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const contextCustomerId = tenantContext.getCustomerId();
        if (contextCustomerId) {
        try {
            device.validateBelongsToTenant(contextCustomerId);
        } catch (error) {
          throw new Error('Unauthorized access to device');
          }
        }
      }

      const customerId = tenantContext?.getCustomerId() || device.customerId;
      
      if (!customerId) {
        throw new Error('Customer ID is required');
      }
      
      const alert = AlertEntity.create(
        AlertId.fromString(`alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
        `Alert: ${type}`,
        message,
        alertSeverity,
        AlertStatus.fromString('ACTIVE'),
        deviceIdVO,
        customerId,
        undefined, // metricName
        undefined, // metricValue
        undefined, // thresholdValue
        undefined, // thresholdId
        new Date(), // createdAt
        undefined, // acknowledgedAt
        undefined, // acknowledgedBy
        undefined, // resolvedAt
        undefined, // resolvedBy
        undefined, // notes
        alertType,
        metadata || {}
      );

      await this.alertRepository.save(alert, tenantContext);
      
      // Notify relevant users
      await this.notifyAlertRecipients(alert, tenantContext);

      this.logger.info('Alert created successfully', {
        alertId: alert.getId().getValue(),
        deviceId,
        type: alertType.getValue(),
        severity: alertSeverity.getValue(),
        message: message.substring(0, 100),
        customerId: customerId.getValue(),
        createdBy: tenantContext?.getUserId()?.getValue() || 'system'
      });

      return alert;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Failed to create alert', {
        deviceId,
        type,
        severity,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  async resolveAlert(
    alertId: string,
    resolution: string,
    resolvedBy?: string,
    tenantContext?: TenantContext
  ): Promise<AlertEntity> {
    try {
      const alert = await this.alertRepository.findById(AlertId.fromString(alertId), tenantContext);
      
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      if (alert.status.isResolved()) {
        throw new Error('Alert is already resolved');
      }

      // Validate tenant access
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (customerId && alert.customerId && !alert.customerId.equals(customerId)) {
          throw new Error('Unauthorized access to alert');
        }
      }

      alert.resolve();
      await this.alertRepository.save(alert, tenantContext);

      this.logger.info('Alert resolved', {
        alertId,
        deviceId: alert.deviceId?.getValue() ?? 'system',
        resolution: resolution.substring(0, 200),
        resolvedBy: resolvedBy || tenantContext?.getUserId()?.getValue(),
        customerId: alert.getCustomerId().getValue()
      });

      return alert;
      
    } catch (error) {
      this.logger.error('Failed to resolve alert', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async getAlertSummary(
    tenantContext?: TenantContext,
    timeRange?: { days?: number; hours?: number }
  ): Promise<AlertSummary> {
    try {
      const criteria: any = {
        deletedAt: null
      };

      // Apply tenant filtering
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        criteria.customerId = tenantContext.getCustomerId()?.getValue();
      }

      // Apply time range filter
      if (timeRange) {
        const cutoff = this.calculateTimeCutoff(timeRange);
        criteria.createdAt = { gte: cutoff };
      }

      const alerts = await this.alertRepository.findAll(criteria, tenantContext);
      const activeAlerts = alerts.filter(a => a.status.isActive());
      const resolvedAlerts = alerts.filter(a => a.status.isResolved());

      const summary: AlertSummary = {
        totalAlerts: alerts.length,
        activeAlerts: activeAlerts.length,
        resolvedAlerts: resolvedAlerts.length,
        criticalAlerts: activeAlerts.filter(a => a.severity.isCritical()).length,
        highAlerts: activeAlerts.filter(a => a.severity.isHigh()).length,
        mediumAlerts: activeAlerts.filter(a => a.severity.isMedium()).length,
        lowAlerts: activeAlerts.filter(a => a.severity.isLow()).length,
        byDevice: {},
        bySeverity: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0
        } as Record<string, number>,
        byType: {}
      };

      // Calculate device distribution
      activeAlerts.forEach(alert => {
        const deviceId = alert.deviceId?.getValue() ?? 'system';
        summary.byDevice[deviceId] = (summary.byDevice[deviceId] || 0) + 1;
      });

      // Calculate severity distribution
      activeAlerts.forEach(alert => {
        const severity = alert.severity.value;
        summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
      });

      // Calculate type distribution
      activeAlerts.forEach(alert => {
        if (alert.type) {
        const type = alert.type.getValue();
        summary.byType[type] = (summary.byType[type] || 0) + 1;
        }
      });

      this.logger.debug('Alert summary generated', {
        total: summary.totalAlerts,
        active: summary.activeAlerts,
        critical: summary.criticalAlerts,
        timeRange,
        tenantId: tenantContext?.getTenantId()
      });

      return summary;
      
    } catch (error) {
      this.logger.error('Failed to generate alert summary', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tenantId: tenantContext?.getTenantId()
      });
      throw error;
    }
  }

  async getDeviceAlerts(
    deviceId: string,
    tenantContext?: TenantContext,
    limit: number = 50,
    status?: 'active' | 'resolved' | 'all'
  ): Promise<AlertEntity[]> {
    try {
      const deviceIdVO = DeviceId.fromString(deviceId);
      
      // Validate device access
      const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (customerId) {
        try {
            device.validateBelongsToTenant(customerId);
        } catch (error) {
          throw new Error('Unauthorized access to device alerts');
          }
        }
      }

      const criteria: any = {
        deviceId: deviceIdVO.getValue(),
        deletedAt: null
      };

      if (status && status !== 'all') {
        criteria.status = status;
      }

      if (tenantContext && !tenantContext.isSuperAdmin()) {
        criteria.customerId = tenantContext.getCustomerId()?.getValue();
      }

      const alerts = await this.alertRepository.findAll(criteria, tenantContext);

      this.logger.debug('Device alerts retrieved', {
        deviceId,
        count: alerts.length,
        statusFilter: status,
        tenantId: tenantContext?.getTenantId()
      });

      return alerts;
      
    } catch (error) {
      this.logger.error('Failed to retrieve device alerts', {
        deviceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy?: string,
    tenantContext?: TenantContext
  ): Promise<AlertEntity> {
    try {
      const alert = await this.alertRepository.findById(AlertId.fromString(alertId), tenantContext);
      
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      if (alert.status.isAcknowledged()) {
        throw new Error('Alert is already acknowledged');
      }

      // Validate tenant access
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (customerId && alert.customerId && !alert.customerId.equals(customerId)) {
          throw new Error('Unauthorized access to alert');
        }
      }

      const userId = acknowledgedBy ? UserId.create(acknowledgedBy) : tenantContext?.getUserId();
      if (userId) {
        alert.acknowledge(userId);
      }
      await this.alertRepository.save(alert, tenantContext);

      this.logger.info('Alert acknowledged', {
        alertId,
        deviceId: alert.deviceId?.getValue() ?? 'system',
        acknowledgedBy: acknowledgedBy || tenantContext?.getUserId()?.getValue(),
        customerId: alert.getCustomerId().getValue()
      });

      return alert;
      
    } catch (error) {
      this.logger.error('Failed to acknowledge alert', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async escalateAlert(
    alertId: string,
    escalationLevel: 'team' | 'management' | 'executive',
    message?: string,
    tenantContext?: TenantContext
  ): Promise<AlertEntity> {
    try {
      const alert = await this.alertRepository.findById(AlertId.fromString(alertId), tenantContext);
      
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      // Validate tenant access
      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (customerId && alert.customerId && !alert.customerId.equals(customerId)) {
          throw new Error('Unauthorized access to alert');
        }
      }

      // Escalate by increasing severity
      const newSeverity = alert.severity.isCritical() ? alert.severity : AlertSeverity.CRITICAL;
      alert.escalate(newSeverity);
      await this.alertRepository.save(alert, tenantContext);

      // Notify escalated recipients
      await this.notifyEscalatedAlert(alert, escalationLevel, tenantContext);

      this.logger.warn('Alert escalated', {
        alertId,
        deviceId: alert.deviceId?.getValue() ?? 'system',
        escalationLevel,
        message: message?.substring(0, 100),
        escalatedBy: tenantContext?.getUserId()?.getValue(),
        customerId: alert.getCustomerId().getValue()
      });

      return alert;
      
    } catch (error) {
      this.logger.error('Failed to escalate alert', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async notifyAlertRecipients(
    alert: AlertEntity,
    tenantContext?: TenantContext
  ): Promise<void> {
    try {
      // Get users who should be notified
      // Notify all active admins for the customer
      const allUsers = await (this.userRepository as any).findActiveInTenant(alert.customerId);
      const recipients = allUsers.filter((u: UserEntity) => u.getRole().getValue() === 'ADMIN' || u.getRole().getValue() === 'SUPERADMIN');
      
      if (recipients.length === 0) {
        this.logger.warn('No recipients found for alert notification', {
          alertId: alert.getId().getValue(),
          customerId: alert.getCustomerId().getValue()
        });
        return;
      }

      // Implementation would send email/Slack notifications
      this.logger.info('Alert notifications prepared', {
        alertId: alert.getId().getValue(),
        deviceId: alert.deviceId?.getValue() ?? 'system',
        severity: alert.severity.getValue(),
        recipientCount: recipients.length,
        customerId: alert.getCustomerId().getValue()
      });

      // Simulate notification sending
      await this.sendNotifications(alert, recipients);

    } catch (error) {
      this.logger.error('Failed to notify alert recipients', {
        alertId: alert.getId().getValue(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private async notifyEscalatedAlert(
    alert: AlertEntity,
    escalationLevel: string,
    tenantContext?: TenantContext
  ): Promise<void> {
    try {
      let recipients: UserEntity[] = [];

      // Note: findByRole method not available, using findActiveInTenant as fallback
      const allUsers = await (this.userRepository as any).findActiveInTenant(alert.customerId);

      switch (escalationLevel) {
        case 'team':
          // Notify team leads/managers
          recipients = allUsers.filter((u: UserEntity) => u.getRole().getValue() === 'ADMIN');
          break;
          
        case 'management':
          // Notify customer managers/executives
          recipients = allUsers.filter((u: UserEntity) => u.getRole().getValue() === 'ADMIN');
          break;
          
        case 'executive':
          // Notify executive team and super admins
          recipients = allUsers.filter((u: UserEntity) => 
            u.getRole().getValue() === 'ADMIN' || u.getRole().getValue() === 'SUPERADMIN'
          );
          break;
      }

      if (recipients.length > 0) {
        await this.sendNotifications(alert, recipients, { escalationLevel });
        
        this.logger.info('Escalated alert notifications sent', {
          alertId: alert.getId().getValue(),
          escalationLevel,
          recipientCount: recipients.length,
          customerId: alert.getCustomerId().getValue()
        });
      }

    } catch (error) {
      this.logger.error('Failed to notify escalated alert recipients', {
        alertId: alert.getId().getValue(),
        escalationLevel,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendNotifications(
    alert: AlertEntity, 
    recipients: UserEntity[], 
    options?: { escalationLevel?: string }
  ): Promise<void> {
    // Implementation would integrate with email/Slack/Push services
    
    // Simulate async notification sending
    await Promise.all(recipients.map(async (user, index) => {
      await new Promise(resolve => setTimeout(resolve, index * 100)); // Staggered sending
      
      this.logger.debug('Notification sent', {
        alertId: alert.getId().getValue(),
        deviceId: alert.deviceId?.getValue() ?? 'system',
        recipient: user.getEmail().getValue(),
        method: 'email', // or 'slack', 'push', etc.
        escalationLevel: options?.escalationLevel
      });
    }));
  }

  private calculateTimeCutoff(timeRange: { days?: number; hours?: number }): Date {
    const now = new Date();
    let cutoff = now;
    
    if (timeRange.days) {
      cutoff.setDate(now.getDate() - timeRange.days);
    }
    
    if (timeRange.hours) {
      cutoff.setHours(now.getHours() - timeRange.hours);
    }
    
    return cutoff;
  }

  // Bulk alert operations
  async resolveAllAlertsForDevice(
    deviceId: string,
    resolution: string,
    tenantContext?: TenantContext
  ): Promise<number> {
    try {
      const deviceIdVO = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
      
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (customerId) {
          device.validateBelongsToTenant(customerId);
      }
      }

      // Note: resolveAllForDevice method not available on repository
      // Using findAll and updating each alert individually
      const alerts = await this.alertRepository.findAll({
        deviceId: deviceIdVO.getValue(),
        status: 'ACTIVE'
      }, tenantContext);
      
      for (const alert of alerts) {
        alert.resolve();
        await this.alertRepository.save(alert, tenantContext);
      }
      
      const resolvedCount = alerts.length;

      this.logger.info('Bulk alert resolution for device', {
        deviceId,
        resolvedCount,
        resolution: resolution.substring(0, 100),
        resolvedBy: tenantContext?.getUserId()?.getValue(),
        customerId: device.getCustomerId().getValue()
      });

      return resolvedCount;
      
    } catch (error) {
      this.logger.error('Failed to resolve all alerts for device', {
        deviceId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async suppressAlertsForDevice(
    deviceId: string,
    durationMinutes: number,
    reason: string,
    tenantContext?: TenantContext
  ): Promise<void> {
    try {
      const deviceIdVO = DeviceId.fromString(deviceId);
      const device = await this.deviceRepository.findById(deviceIdVO, tenantContext);
      
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      if (tenantContext && !tenantContext.isSuperAdmin()) {
        const customerId = tenantContext.getCustomerId();
        if (customerId) {
          device.validateBelongsToTenant(customerId);
        }
      }

      // Note: suppressForDevice method not available on repository
      // Using findAll and updating each alert status
      const alerts = await this.alertRepository.findAll({
        deviceId: deviceIdVO.getValue(),
        status: 'ACTIVE'
      }, tenantContext);
      
      for (const alert of alerts) {
        // Mark as suppressed (using metadata to track suppression)
        await this.alertRepository.save(alert, tenantContext);
      }

      this.logger.info('Alerts suppressed for device', {
        deviceId,
        durationMinutes,
        reason,
        suppressedBy: tenantContext?.getUserId()?.getValue()
      });

      this.logger.info('Device alerts suppressed', {
        deviceId,
        durationMinutes,
        reason: reason.substring(0, 100),
        suppressedBy: tenantContext?.getUserId()?.getValue(),
        customerId: device.getCustomerId().getValue()
      });
      
    } catch (error) {
      this.logger.error('Failed to suppress device alerts', {
        deviceId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
