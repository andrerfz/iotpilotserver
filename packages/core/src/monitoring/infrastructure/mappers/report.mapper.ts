import {Injectable} from '@nestjs/common';
import {
    MonitoringReport,
    MonitoringReportId,
    ReportFormat,
    ReportType
} from '@iotpilot/core/monitoring/domain/entities/monitoring-report.entity';
import {TimeRange} from '@iotpilot/core/monitoring/domain/value-objects/time-range.vo';
import {ReportStatusType} from '@iotpilot/core/monitoring/domain/value-objects/report-status.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CreateReportDto, DevicePerformanceReportDto, ReportDto, SystemOverviewReportDto} from '../dto/report.dto';
import {Alert} from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import {Metric} from '@iotpilot/core/monitoring/domain/entities/metric.entity';
import {DeviceStatus} from '../../../device/domain/value-objects/device-status.vo';
import {DeviceEntity} from '../../../device/domain/entities/device.entity';

@Injectable()
export class ReportMapper {
  /**
   * Converts a string status value to a valid ReportStatusType
   * @param status The status string to convert
   * @returns A valid ReportStatusType
   */
  private mapStatus(status: string): ReportStatusType {
    // Map common status strings to valid ReportStatusType values
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'in_progress':
      case 'generating':
      case 'processing':
        return 'in_progress';
      case 'completed':
      case 'done':
      case 'finished':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        // Default to 'pending' for unknown values
        console.warn(`Unknown report status: ${status}, defaulting to 'pending'`);
        return 'pending';
    }
  }
  /**
   * Maps a domain MonitoringReport entity to a ReportDto
   * @param report The domain MonitoringReport entity
   * @returns The ReportDto
   */
  toPersistence(report: MonitoringReport): ReportDto {
    return {
      id: report.id.value,
      name: report.name,
      type: report.type,
      format: report.format,
      customerId: report.getTenantId().value,
      generatedAt: report.createdAt,
      startTime: report.timeRange.startTime,
      endTime: report.timeRange.endTime,
      generatedBy: report.createdBy,
      reportUrl: report.url || undefined,
      recipients: [], // Default to empty array as it's not found in the entity
      status: report.status,
      errorMessage: report.error || undefined,
      metadata: report.parameters
    };
  }

  /**
   * Maps a ReportDto to a domain MonitoringReport entity
   * @param dto The ReportDto
   * @returns The domain MonitoringReport entity
   */
  toDomain(dto: ReportDto): MonitoringReport {
    return MonitoringReport.create(
      MonitoringReportId.create(dto.id),
      dto.name,
      dto.name, // Using name as description since there's no description field in DTO
      dto.type as ReportType,
      TimeRange.create(dto.startTime, dto.endTime),
      [], // Empty array for deviceIds since there's no direct mapping
      dto.format as ReportFormat,
      dto.generatedBy || '',
      dto.metadata || {},
      CustomerId.create(dto.customerId)
    );
  }

  /**
   * Maps a CreateReportDto to a domain MonitoringReport entity
   * @param dto The CreateReportDto
   * @returns The domain MonitoringReport entity
   */
  createDtoToDomain(dto: CreateReportDto): MonitoringReport {
    return MonitoringReport.create(
      MonitoringReportId.create(), // Generate a new ID
      dto.name,
      dto.name, // Using name as description since there's no description field in DTO
      dto.type as ReportType,
      TimeRange.create(dto.startTime, dto.endTime),
      [], // Empty array for deviceIds since there's no direct mapping
      dto.format as ReportFormat,
      dto.generatedBy || '',
      dto.metadata || {},
      CustomerId.create(dto.customerId)
    );
  }

  /**
   * Maps a list of ReportDtos to domain MonitoringReport entities
   * @param dtos The list of ReportDtos
   * @returns The list of domain MonitoringReport entities
   */
  toDomainList(dtos: ReportDto[]): MonitoringReport[] {
    return dtos.map(dto => this.toDomain(dto));
  }

  /**
   * Maps a list of domain MonitoringReport entities to ReportDtos
   * @param reports The list of domain MonitoringReport entities
   * @returns The list of ReportDtos
   */
  toPersistenceList(reports: MonitoringReport[]): ReportDto[] {
    return reports.map(report => this.toPersistence(report));
  }

  /**
   * Creates a SystemOverviewReportDto from monitoring data
   * @param customerId The customer ID
   * @param devices The list of devices with their metrics
   * @param alerts The list of alerts
   * @param metrics The metrics data
   * @param startTime The start time of the report period
   * @param endTime The end time of the report period
   * @returns The SystemOverviewReportDto
   */
  toSystemOverviewReportDto(
    customerId: CustomerId,
    devices: Array<{
      id: DeviceId;
      name: string;
      status: string;
      metrics: {
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        uptime: number;
      };
      activeAlerts: number;
    }>,
    alerts: Alert[],
    metrics: Array<{
      name: string;
      dataPoints: Array<{ timestamp: Date; value: number }>;
    }>,
    startTime: Date,
    endTime: Date
  ): SystemOverviewReportDto {
    // Calculate system summary
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online' || (typeof d.status === 'string' && d.status.includes('online'))).length;
    const offlineDevices = totalDevices - onlineDevices;
    const activeAlerts = alerts.filter(a => a.status.isActive()).length;
    
    // Calculate averages
    const avgCpuUsage = devices.length > 0
      ? devices.reduce((sum, device) => sum + device.metrics.cpuUsage, 0) / devices.length
      : 0;
    
    const avgMemoryUsage = devices.length > 0
      ? devices.reduce((sum, device) => sum + device.metrics.memoryUsage, 0) / devices.length
      : 0;
    
    const avgDiskUsage = devices.length > 0
      ? devices.reduce((sum, device) => sum + device.metrics.diskUsage, 0) / devices.length
      : 0;

    // Map devices to DTO format
    const deviceDtos = devices.map(device => ({
      id: device.id.value,
      name: device.name,
      status: device.status,
      cpuUsage: device.metrics.cpuUsage,
      memoryUsage: device.metrics.memoryUsage,
      diskUsage: device.metrics.diskUsage,
      uptime: device.metrics.uptime,
      activeAlerts: device.activeAlerts
    }));

    // Map alerts to DTO format
    const alertDtos = alerts.map(alert => ({
      id: alert.id.value,
      title: alert.title,
      severity: alert.severity.value,
      status: alert.status.value,
      deviceId: alert.deviceId?.value ?? 'system',
      deviceName: alert.deviceId ? (devices.find(d => d.id.value === alert.deviceId?.value)?.name || 'Unknown Device') : 'System',
      timestamp: alert.timestamp
    }));

    return {
      customerId: customerId.value,
      generatedAt: new Date(),
      startTime,
      endTime,
      summary: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        activeAlerts,
        avgCpuUsage,
        avgMemoryUsage,
        avgDiskUsage
      },
      devices: deviceDtos,
      alerts: alertDtos,
      metrics
    };
  }

  /**
   * Creates a DevicePerformanceReportDto from device monitoring data
   * @param customerId The customer ID
   * @param deviceId The device ID
   * @param deviceName The device name
   * @param status The device status
   * @param metrics The device metrics
   * @param alerts The device alerts
   * @param startTime The start time of the report period
   * @param endTime The end time of the report period
   * @returns The DevicePerformanceReportDto
   */
  toDevicePerformanceReportDto(
    customerId: CustomerId,
    deviceId: DeviceId,
    deviceName: string,
    status: string,
    metrics: {
      cpu: Metric[];
      memory: Metric[];
      disk: Metric[];
      temperature?: Metric[];
      network?: Metric[];
    },
    alerts: Alert[],
    startTime: Date,
    endTime: Date
  ): DevicePerformanceReportDto {
    // Calculate uptime percentage
    const totalTimeMs = endTime.getTime() - startTime.getTime();
    const uptimeMs = totalTimeMs; // In a real implementation, this would be calculated from actual uptime data
    const uptimePercentage = (uptimeMs / totalTimeMs) * 100;

    // Calculate CPU statistics
    const cpuValues = metrics.cpu.map(m => m.value.value);
    const avgCpuUsage = cpuValues.length > 0
      ? cpuValues.reduce((sum, value) => sum + value, 0) / cpuValues.length
      : 0;
    const maxCpuUsage = cpuValues.length > 0
      ? Math.max(...cpuValues)
      : 0;

    // Calculate memory statistics
    const memoryValues = metrics.memory.map(m => m.value.value);
    const avgMemoryUsage = memoryValues.length > 0
      ? memoryValues.reduce((sum, value) => sum + value, 0) / memoryValues.length
      : 0;
    const maxMemoryUsage = memoryValues.length > 0
      ? Math.max(...memoryValues)
      : 0;

    // Calculate disk statistics
    const diskValues = metrics.disk.map(m => m.value.value);
    const avgDiskUsage = diskValues.length > 0
      ? diskValues.reduce((sum, value) => sum + value, 0) / diskValues.length
      : 0;
    const maxDiskUsage = diskValues.length > 0
      ? Math.max(...diskValues)
      : 0;

    // Count alerts
    const activeAlerts = alerts.filter(a => a.status.isActive()).length;
    const totalAlerts = alerts.length;

    // Format metrics for the report
    const formattedMetrics = [
      {
        name: 'cpu_usage',
        dataPoints: metrics.cpu.map(m => ({
          timestamp: m.timestamp,
          value: m.value.value
        }))
      },
      {
        name: 'memory_usage',
        dataPoints: metrics.memory.map(m => ({
          timestamp: m.timestamp,
          value: m.value.value
        }))
      },
      {
        name: 'disk_usage',
        dataPoints: metrics.disk.map(m => ({
          timestamp: m.timestamp,
          value: m.value.value
        }))
      }
    ];

    // Add temperature metrics if available
    if (metrics.temperature && metrics.temperature.length > 0) {
      formattedMetrics.push({
        name: 'temperature',
        dataPoints: metrics.temperature.map(m => ({
          timestamp: m.timestamp,
          value: m.value.value
        }))
      });
    }

    // Format alerts for the report
    const formattedAlerts = alerts.map(alert => ({
      id: alert.id.value,
      title: alert.title,
      severity: alert.severity.value,
      status: alert.status.value,
      timestamp: alert.timestamp,
      metricName: alert.metricName || 'unknown',
      metricValue: alert.metricValue?.getValue() || 0,
      thresholdValue: alert.thresholdValue || 0
    }));

    return {
      customerId: customerId.value,
      deviceId: deviceId.value,
      deviceName,
      generatedAt: new Date(),
      startTime,
      endTime,
      summary: {
        status,
        uptimePercentage,
        avgCpuUsage,
        maxCpuUsage,
        avgMemoryUsage,
        maxMemoryUsage,
        avgDiskUsage,
        maxDiskUsage,
        activeAlerts,
        totalAlerts
      },
      metrics: formattedMetrics,
      alerts: formattedAlerts
    };
  }

  static toMonitoringReport(deviceData: any): ReportDto {
    const { id, name, status, metrics, activeAlerts } = deviceData;
    
    // Fix isOnline calculation - don't access non-existent property
    const deviceStatus = DeviceStatus.create(status || 'offline');
    const isOnline = deviceStatus.isOnline();
    
    // Alternative calculation based on heartbeat if available
    const heartbeatAge = deviceData.lastHeartbeat ? 
      Math.floor((Date.now() - deviceData.lastHeartbeat) / 1000) : 
      Infinity;
    
    const calculatedOnlineStatus = isOnline && heartbeatAge < 30; // 30s timeout

    return {
      id: id.value || id,
      name: name.value || name,
      status: status || 'offline',
        cpuUsage: metrics?.cpuUsage || 0,
        memoryUsage: metrics?.memoryUsage || 0,
        diskUsage: metrics?.diskUsage || 0,
        uptime: metrics?.uptime || 0,
      activeAlerts: activeAlerts || 0,
      heartbeatAge: Math.min(heartbeatAge, 300), // Cap at 5 minutes for display
      connectionQuality: this.calculateConnectionQuality(heartbeatAge, status)
    } as unknown as ReportDto;
  }

  // Helper method for connection quality
  private static calculateConnectionQuality(heartbeatAge: number, status: string): string {
    if (status !== 'online') return 'disconnected';
    
    if (heartbeatAge <= 10) return 'excellent';
    if (heartbeatAge <= 30) return 'good';
    if (heartbeatAge <= 60) return 'fair';
    return 'poor';
  }

  // Bulk mapping for device lists
  static toMonitoringReports(devices: any[]): ReportDto[] {
    return devices.map(device => this.toMonitoringReport(device));
  }

  // Add method to enrich with device entity if needed
  static enrichWithDeviceEntity(report: ReportDto, deviceEntity?: DeviceEntity): ReportDto {
    if (!deviceEntity) return report;
    
    // Return only the report without extra fields not in ReportDto type
    return report;
  }
}