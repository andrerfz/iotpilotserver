import {Injectable} from '@nestjs/common';
import {Metric} from '@iotpilot/core/monitoring/domain/entities/metric.entity';
import {MetricValue} from '@iotpilot/core/monitoring/domain/value-objects/metric-value.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {CreateMetricDto, MetricDto, MetricStatisticsDto, MetricTimeSeriesDto} from '../dto/metric.dto';
import {MetricId} from '@iotpilot/core/monitoring/domain/value-objects/metric-id.vo';

@Injectable()
export class MetricMapper {
  /**
   * Maps a domain Metric entity to a MetricDto
   * @param metric The domain Metric entity
   * @returns The MetricDto
   */
  toPersistence(metric: Metric): MetricDto {
    // Convert Map<string, string> to Record<string, string>
    const tagsObject: Record<string, string> = {};
    metric.tags.forEach((value, key) => {
      tagsObject[key] = value;
    });

    return {
      id: metric.id.value,
      name: metric.name,
      value: metric.value.value,
      unit: metric.value.unit,
      timestamp: metric.timestamp,
      deviceId: metric.deviceId.value,
      customerId: metric.getTenantId().value,
      tags: tagsObject
    };
  }

  /**
   * Maps a MetricDto to a domain Metric entity
   * @param dto The MetricDto
   * @returns The domain Metric entity
   */
  toDomain(dto: MetricDto): Metric {
    return Metric.create(
      MetricId.create(dto.id),
      DeviceId.create(dto.deviceId),
      dto.name,
      MetricValue.create(dto.value, dto.unit),
      dto.timestamp,
      new Map(Object.entries(dto.tags || {})),
      CustomerId.create(dto.customerId)
    );
  }

  /**
   * Maps a CreateMetricDto to a domain Metric entity
   * @param dto The CreateMetricDto
   * @returns The domain Metric entity
   */
  createDtoToDomain(dto: CreateMetricDto): Metric {
    return Metric.create(
      MetricId.create(), // Generate a new ID
      DeviceId.create(dto.deviceId),
      dto.name,
      MetricValue.create(dto.value, dto.unit),
      dto.timestamp || new Date(),
      new Map(Object.entries(dto.tags || {})),
      CustomerId.create(dto.customerId)
    );
  }

  /**
   * Maps a list of domain Metric entities to a MetricTimeSeriesDto
   * @param metrics The list of domain Metric entities
   * @param name The metric name
   * @param unit The metric unit
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @returns The MetricTimeSeriesDto
   */
  toTimeSeriesDto(
    metrics: Metric[],
    name: string,
    unit: string,
    deviceId: DeviceId,
    customerId: CustomerId
  ): MetricTimeSeriesDto {
    return {
      name,
      unit,
      deviceId: deviceId.value,
      customerId: customerId.value,
      dataPoints: metrics.map(metric => ({
        timestamp: metric.timestamp,
        value: metric.value.value
      }))
    };
  }

  /**
   * Creates a MetricStatisticsDto from metric data
   * @param name The metric name
   * @param unit The metric unit
   * @param deviceId The device ID
   * @param customerId The customer ID
   * @param startTime The start time
   * @param endTime The end time
   * @param values The metric values
   * @returns The MetricStatisticsDto
   */
  toStatisticsDto(
    name: string,
    unit: string,
    deviceId: DeviceId,
    customerId: CustomerId,
    startTime: Date,
    endTime: Date,
    values: number[]
  ): MetricStatisticsDto {
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = count > 0 ? sum / count : 0;
    const minimum = count > 0 ? Math.min(...values) : 0;
    const maximum = count > 0 ? Math.max(...values) : 0;

    return {
      name,
      unit,
      deviceId: deviceId.value,
      customerId: customerId.value,
      startTime,
      endTime,
      average,
      minimum,
      maximum,
      sum,
      count
    };
  }

  /**
   * Maps a list of MetricDtos to domain Metric entities
   * @param dtos The list of MetricDtos
   * @returns The list of domain Metric entities
   */
  toDomainList(dtos: MetricDto[]): Metric[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * Maps a list of domain Metric entities to MetricDtos
   * @param metrics The list of domain Metric entities
   * @returns The list of MetricDtos
   */
  toPersistenceList(metrics: Metric[]): MetricDto[] {
    return metrics.map(metric => this.toPersistence(metric));
  }
}