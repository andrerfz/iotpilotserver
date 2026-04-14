import {Injectable} from '@nestjs/common';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {AlertId} from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import {AlertSeverity} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import {AlertStatus, StatusType} from '@iotpilot/core/monitoring/domain/value-objects/alert-status.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {UserId} from '@iotpilot/core/user/domain/value-objects/user-id.vo';
import {MetricValue} from '@iotpilot/core/monitoring/domain/value-objects/metric-value.vo';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {AlertDto, AlertStatisticsDto, CreateAlertDto} from '../dto/alert.dto';

@Injectable()
export class AlertMapper {
  /**
   * Converts a string severity value to a valid SeverityLevel
   * @param severity The severity string to convert
   * @returns A valid SeverityLevel
   */
  private mapSeverity(severity: string): string {
    // Map common severity strings to valid severity values (matching AlertSeverity constants)
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'emergency':
        return 'CRITICAL';
      case 'high':
      case 'warning':
        return 'HIGH';
      case 'medium':
      case 'error':
        return 'MEDIUM';
      case 'low':
      case 'info':
        return 'LOW';
      default:
        // Default to 'LOW' for unknown values
        console.warn(`Unknown severity level: ${severity}, defaulting to 'LOW'`);
        return 'LOW';
    }
  }

  /**
   * Converts a string status value to a valid StatusType
   * @param status The status string to convert
   * @returns A valid StatusType
   */
  private mapStatus(status: string): StatusType {
    // Map status strings to valid StatusType values
    switch (status.toLowerCase()) {
      case 'active':
      case 'open':
      case 'new':
        return 'ACTIVE';
      case 'acknowledged':
      case 'ack':
      case 'in_progress':
        return 'ACKNOWLEDGED';
      case 'resolved':
      case 'closed':
      case 'fixed':
        return 'RESOLVED';
      default:
        // Default to 'ACTIVE' for unknown values
        console.warn(`Unknown status: ${status}, defaulting to 'ACTIVE'`);
        return 'ACTIVE';
    }
  }
  /**
   * Maps a domain Alert entity to an AlertDto
   * @param alert The domain Alert entity
   * @returns The AlertDto
   */
  toPersistence(alert: Alert): AlertDto {
    const customerId = alert.getCustomerId();
    if (!customerId) {
      throw new Error('Alert must have a customerId');
    }
    
    return {
      id: alert.getId().getValue(),
      title: alert.title,
      description: alert.message,
      severity: alert.severity.value,
      status: alert.status.value,
      deviceId: alert.deviceId?.getValue() ?? '', // System alerts may not have deviceId
      customerId: customerId.getValue(),
      metricName: alert.metricName ?? '',
      metricValue: alert.metricValue?.getValue() || 0,
      metricUnit: alert.metricValue?.unit || '',
      thresholdValue: alert.thresholdValue || 0,
      thresholdId: alert.thresholdId?.getValue() ?? '',
      timestamp: alert.timestamp,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedBy?.getValue(),
      resolvedAt: alert.resolvedAt || undefined,
      resolvedBy: alert.resolvedBy?.getValue(),
      notes: alert.notes
    };
  }

  /**
   * Maps an AlertDto to a domain Alert entity
   * @param dto The AlertDto
   * @returns The domain Alert entity
   */
  toDomain(dto: AlertDto): Alert {
    return Alert.create(
      AlertId.fromString(dto.id),
      dto.title,
      dto.description,
      AlertSeverity.fromString(this.mapSeverity(dto.severity)),
      AlertStatus.fromString(this.mapStatus(dto.status)),
      DeviceId.fromString(dto.deviceId),
      CustomerId.fromString(dto.customerId),
      dto.metricName,
      dto.metricValue ? MetricValue.create(dto.metricValue, dto.metricUnit) : undefined,
      dto.thresholdValue,
      dto.thresholdId ? ThresholdId.fromString(dto.thresholdId) : undefined,
      dto.timestamp,
      dto.acknowledgedAt,
      dto.acknowledgedBy ? UserId.fromString(dto.acknowledgedBy) : undefined,
      dto.resolvedAt,
      dto.resolvedBy ? UserId.create(dto.resolvedBy) : undefined,
      dto.notes
    );
  }

  /**
   * Maps a CreateAlertDto to a domain Alert entity
   * @param dto The CreateAlertDto
   * @returns The domain Alert entity
   */
  createDtoToDomain(dto: CreateAlertDto): Alert {
    return Alert.create(
      AlertId.create(), // Generate a new ID
      dto.title,
      dto.description,
      AlertSeverity.create(this.mapSeverity(dto.severity)),
      AlertStatus.create(this.mapStatus('active')), // New alerts are always active
      DeviceId.create(dto.deviceId),
      CustomerId.create(dto.customerId),
      dto.metricName,
      MetricValue.create(dto.metricValue, dto.metricUnit),
      dto.thresholdValue,
      ThresholdId.create(dto.thresholdId),
      new Date(), // Current timestamp
      undefined, // Not acknowledged
      undefined, // No acknowledgedBy
      undefined, // Not resolved
      undefined, // No resolvedBy
      dto.notes
    );
  }

  /**
   * Maps a list of AlertDtos to domain Alert entities
   * @param dtos The list of AlertDtos
   * @returns The list of domain Alert entities
   */
  toDomainList(dtos: AlertDto[]): Alert[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * Maps a list of domain Alert entities to AlertDtos
   * @param alerts The list of domain Alert entities
   * @returns The list of AlertDtos
   */
  toPersistenceList(alerts: Alert[]): AlertDto[] {
    return alerts.map(alert => this.toPersistence(alert));
  }

  /**
   * Creates an AlertStatisticsDto from alert data
   * @param customerId The customer ID
   * @param startTime The start time
   * @param endTime The end time
   * @param alerts The list of alerts
   * @param deviceMap Optional map of device IDs to names
   * @returns The AlertStatisticsDto
   */
  toStatisticsDto(
    customerId: CustomerId,
    startTime: Date,
    endTime: Date,
    alerts: Alert[],
    deviceMap?: Map<string, string>
  ): AlertStatisticsDto {
    // Count alerts by status and severity
    const totalAlerts = alerts.length;
    const activeAlerts = alerts.filter(a => a.status.isActive()).length;
    const acknowledgedAlerts = alerts.filter(a => a.status.isAcknowledged()).length;
    const resolvedAlerts = alerts.filter(a => a.status.isResolved()).length;
    
    // Count alerts by severity using the valid SeverityLevel values
    const criticalAlerts = alerts.filter(a => a.severity.value === 'CRITICAL').length;
    const highAlerts = alerts.filter(a => a.severity.value === 'HIGH').length;
    const mediumAlerts = alerts.filter(a => a.severity.value === 'MEDIUM').length;
    const lowAlerts = alerts.filter(a => a.severity.value === 'LOW').length;
    
    // Group alerts by device
    const deviceAlerts = new Map<string, { totalAlerts: number; activeAlerts: number }>();
    
    alerts.forEach(alert => {
      const deviceId = alert.deviceId?.value ?? 'system';
      const current = deviceAlerts.get(deviceId) || { totalAlerts: 0, activeAlerts: 0 };
      
      current.totalAlerts++;
      if (alert.status.isActive()) {
        current.activeAlerts++;
      }
      
      deviceAlerts.set(deviceId, current);
    });

    // Convert to array for the DTO
    const byDevice = Array.from(deviceAlerts.entries()).map(([deviceId, stats]) => ({
      deviceId,
      deviceName: deviceMap?.get(deviceId) || deviceId,
      totalAlerts: stats.totalAlerts,
      activeAlerts: stats.activeAlerts
    }));

    return {
      customerId: customerId.value,
      totalAlerts,
      activeAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      criticalAlerts,
      highAlerts,
      mediumAlerts,
      lowAlerts,
      startTime,
      endTime,
      byDevice
    };
  }
}