import {Injectable} from '@nestjs/common';
import {ComparisonOperator, Threshold} from '@iotpilot/core/monitoring/domain/entities/threshold.entity';
import {ThresholdId} from '@iotpilot/core/monitoring/domain/value-objects/threshold-id.vo';
import {AlertSeverity, SeverityLevel} from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {CreateThresholdDto, ThresholdDto, UpdateThresholdDto} from '../dto/threshold.dto';

@Injectable()
export class ThresholdMapper {
  /**
   * Converts a string severity value to a valid SeverityLevel
   * @param severity The severity string to convert
   * @returns A valid SeverityLevel
   */
  private mapSeverity(severity: string): SeverityLevel {
    // Map common severity strings to valid SeverityLevel values (lowercase for AlertSeverity type)
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'emergency':
        return 'critical';
      case 'high':
      case 'warning':
        return 'warning';
      case 'medium':
      case 'error':
        return 'error';
      case 'low':
      case 'info':
        return 'info';
      default:
        // Default to 'info' for unknown values
        console.warn(`Unknown severity level: ${severity}, defaulting to 'info'`);
        return 'info';
    }
  }

  /**
   * Converts a string operator to a valid ComparisonOperator
   * @param operator The operator string to convert
   * @returns A valid ComparisonOperator
   */
  private mapOperator(operator: string): ComparisonOperator {
    // Map common operator strings to valid ComparisonOperator values
    switch (operator) {
      case '>':
      case 'gt':
        return '>';
      case '>=':
      case 'gte':
        return '>=';
      case '<':
      case 'lt':
        return '<';
      case '<=':
      case 'lte':
        return '<=';
      case '==':
      case '=':
      case 'eq':
        return '==';
      case '!=':
      case '<>':
      case 'neq':
        return '!=';
      default:
        // Default to '>' for unknown values
        console.warn(`Unknown operator: ${operator}, defaulting to '>'`);
        return '>';
    }
  }
  /**
   * Maps a domain Threshold entity to a ThresholdDto
   * @param threshold The domain Threshold entity
   * @returns The ThresholdDto
   */
  toPersistence(threshold: Threshold): ThresholdDto {
    return {
      id: threshold.id.value,
      name: threshold.name,
      description: threshold.description,
      metricName: threshold.metricName,
      operator: threshold.operator,
      value: threshold.value,
      unit: threshold.unit,
      severity: threshold.severity.value,
      deviceId: threshold.deviceId?.value,
      customerId: threshold.getTenantId().value,
      enabled: threshold.enabled,
      cooldownSeconds: threshold.cooldownMinutes,
      createdAt: threshold.createdAt,
      updatedAt: threshold.updatedAt,
      createdBy: undefined,
      updatedBy: undefined,
      tags: {} // tags is not available in Threshold entity
    };
  }

  /**
   * Maps a ThresholdDto to a domain Threshold entity
   * @param dto The ThresholdDto
   * @returns The domain Threshold entity
   */
  toDomain(dto: ThresholdDto): Threshold {
    return Threshold.create(
      ThresholdId.create(dto.id),
      dto.deviceId ? DeviceId.create(dto.deviceId) : null,
      dto.name,
      dto.description,
      dto.metricName,
      dto.operator as ComparisonOperator, // Type conversion needed
      dto.value,
      dto.unit,
      AlertSeverity.create(this.mapSeverity(dto.severity)),
      'custom', // Default type
      dto.cooldownSeconds,
      dto.tags || {}, // Use tags as metadata
      CustomerId.create(dto.customerId)
    );
  }

  /**
   * Maps a CreateThresholdDto to a domain Threshold entity
   * @param dto The CreateThresholdDto
   * @returns The domain Threshold entity
   */
  createDtoToDomain(dto: CreateThresholdDto): Threshold {
    return Threshold.create(
      ThresholdId.create(), // Generate a new ID
      dto.deviceId ? DeviceId.create(dto.deviceId) : null,
      dto.name,
      dto.description,
      dto.metricName,
      this.mapOperator(dto.operator), // Convert to valid ComparisonOperator
      dto.value,
      dto.unit,
      AlertSeverity.create(this.mapSeverity(dto.severity)),
      'custom', // Default type
      dto.cooldownSeconds !== undefined ? dto.cooldownSeconds : 300,
      dto.tags || {}, // Use tags as metadata
      CustomerId.create(dto.customerId)
    );
  }

  /**
   * Updates a domain Threshold entity with values from an UpdateThresholdDto
   * @param threshold The domain Threshold entity to update
   * @param dto The UpdateThresholdDto with new values
   * @returns The updated domain Threshold entity
   */
  updateDomainFromDto(threshold: Threshold, dto: UpdateThresholdDto): Threshold {
    // Create a new Threshold entity with updated values
    return Threshold.create(
      threshold.id,
      threshold.deviceId, // Device ID cannot be changed after creation
      dto.name !== undefined ? dto.name : threshold.name,
      dto.description !== undefined ? dto.description : threshold.description,
      dto.metricName !== undefined ? dto.metricName : threshold.metricName,
      dto.operator !== undefined ? this.mapOperator(dto.operator) : threshold.operator,
      dto.value !== undefined ? dto.value : threshold.value,
      dto.unit !== undefined ? dto.unit : threshold.unit,
      dto.severity !== undefined ? AlertSeverity.create(this.mapSeverity(dto.severity)) : threshold.severity,
      threshold.type, // Type cannot be changed after creation
      dto.cooldownSeconds !== undefined ? dto.cooldownSeconds : threshold.cooldownMinutes,
      dto.tags !== undefined ? dto.tags : threshold.metadata, // Use tags as metadata
      threshold.getTenantId() // Customer ID cannot be changed after creation
    );
  }

  /**
   * Maps a list of ThresholdDtos to domain Threshold entities
   * @param dtos The list of ThresholdDtos
   * @returns The list of domain Threshold entities
   */
  toDomainList(dtos: ThresholdDto[]): Threshold[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * Maps a list of domain Threshold entities to ThresholdDtos
   * @param thresholds The list of domain Threshold entities
   * @returns The list of ThresholdDtos
   */
  toPersistenceList(thresholds: Threshold[]): ThresholdDto[] {
    return thresholds.map(threshold => this.toPersistence(threshold));
  }

  /**
   * Evaluates if a metric value breaches a threshold
   * @param threshold The threshold to evaluate
   * @param metricValue The metric value to evaluate
   * @returns True if the threshold is breached, false otherwise
   */
  evaluateThreshold(threshold: Threshold, metricValue: number): boolean {
    if (!threshold.enabled) {
      return false;
    }

    switch (threshold.operator) {
      case '>':
        return metricValue > threshold.value;
      case '<':
        return metricValue < threshold.value;
      case '>=':
        return metricValue >= threshold.value;
      case '<=':
        return metricValue <= threshold.value;
      case '==':
        return metricValue === threshold.value;
      case '!=':
        return metricValue !== threshold.value;
      default:
        return false;
    }
  }
}