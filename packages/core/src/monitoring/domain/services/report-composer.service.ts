import {MonitoringReport, MonitoringReportId, ReportFormat, ReportType} from '../entities/monitoring-report.entity';
import {TimeRange} from '../value-objects/time-range.vo';
import {DeviceId} from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import {CustomerId} from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import {Metric} from '../entities/metric.entity';
import {Alert, AlertEntity} from '../entities/alert.entity';
import {MetricsProcessor} from './metrics-processor.service';

/**
 * Domain service responsible for composing monitoring reports
 */
export class ReportComposer {
    constructor(private readonly metricsProcessor: MetricsProcessor) {}

    /**
     * Creates a new monitoring report
     * 
     * @param name The name of the report
     * @param description The description of the report
     * @param type The type of the report
     * @param timeRange The time range for the report
     * @param deviceIds The device IDs to include in the report
     * @param format The format of the report
     * @param createdBy The ID of the user who created the report
     * @param parameters Additional parameters for the report
     * @param tenantId The tenant ID
     * @returns The created report
     */
    createReport(
        name: string,
        description: string,
        type: ReportType,
        timeRange: TimeRange,
        deviceIds: DeviceId[],
        format: ReportFormat,
        createdBy: string,
        parameters: Record<string, any>,
        tenantId: CustomerId
    ): MonitoringReport {
        const reportId = MonitoringReportId.create();
        
        return MonitoringReport.create(
            reportId,
            name,
            description,
            type,
            timeRange,
            deviceIds,
            format,
            createdBy,
            parameters,
            tenantId
        );
    }

    /**
     * Prepares data for a system health report
     * 
     * @param metrics The metrics to include in the report
     * @param alerts The alerts to include in the report
     * @param timeRange The time range for the report
     * @returns The prepared report data
     */
    prepareSystemHealthReportData(
        metrics: Metric[],
        alerts: AlertEntity[],
        timeRange: TimeRange
    ): Record<string, any> {
        // Filter metrics and alerts by time range
        const filteredMetrics = this.metricsProcessor.filterByTimeRange(metrics, timeRange);
        const filteredAlerts = alerts.filter(alert => timeRange.includes(alert.createdAt));
        
        // Group metrics by device and type
        const metricsByDevice = new Map<string, Metric[]>();
        for (const metric of filteredMetrics) {
            const deviceId = metric.deviceId.value;
            if (!metricsByDevice.has(deviceId)) {
                metricsByDevice.set(deviceId, []);
            }
            metricsByDevice.get(deviceId)?.push(metric);
        }
        
        // Calculate aggregated metrics for each device
        const deviceMetricsResult: Record<string, any>[] = [];
        for (const [deviceId, deviceMetrics] of metricsByDevice.entries()) {
            // Group by metric name
            const metricsByName = new Map<string, Metric[]>();
            for (const metric of deviceMetrics) {
                if (!metricsByName.has(metric.name)) {
                    metricsByName.set(metric.name, []);
                }
                metricsByName.get(metric.name)?.push(metric);
            }
            
            // Calculate aggregates for each metric name
            const aggregates: Record<string, any> = {};
            for (const [name, metrics] of metricsByName.entries()) {
                const avg = this.metricsProcessor.calculateAverage(metrics);
                const max = this.metricsProcessor.calculateMaximum(metrics);
                const min = this.metricsProcessor.calculateMinimum(metrics);
                
                aggregates[name] = {
                    average: avg ? avg.value : null,
                    maximum: max ? max.value : null,
                    minimum: min ? min.value : null,
                    unit: metrics[0].value.unit,
                    count: metrics.length
                };
            }
            
            deviceMetricsResult.push({
                deviceId: DeviceId.fromString(deviceId),
                metrics: aggregates
            });
        }
        
        // Group alerts by device and severity
        const alertsByDevice = new Map<string, Alert[]>();
        for (const alert of filteredAlerts) {
            const deviceId = alert.deviceId?.value ?? 'system';
            if (!alertsByDevice.has(deviceId)) {
                alertsByDevice.set(deviceId, []);
            }
            alertsByDevice.get(deviceId)?.push(alert);
        }
        
        const deviceAlerts: Record<string, any>[] = [];
        for (const [deviceId, alerts] of alertsByDevice.entries()) {
            // Count alerts by severity
            const severityCounts: Record<string, number> = {
                info: 0,
                warning: 0,
                critical: 0,
                emergency: 0
            };
            
            for (const alert of alerts) {
                severityCounts[alert.severity.value]++;
            }
            
            deviceAlerts.push({
                deviceId: DeviceId.fromString(deviceId),
                alertCounts: severityCounts,
                totalAlerts: alerts.length
            });
        }
        
        return {
            timeRange: {
                startTime: timeRange.startTime.toISOString(),
                endTime: timeRange.endTime.toISOString(),
                durationInMinutes: timeRange.getDurationInMinutes()
            },
            metrics: deviceMetricsResult,
            alerts: deviceAlerts,
            summary: {
                totalDevices: metricsByDevice.size,
                totalMetrics: filteredMetrics.length,
                totalAlerts: filteredAlerts.length
            }
        };
    }

    /**
     * Prepares data for a performance report
     * 
     * @param metrics The metrics to include in the report
     * @param timeRange The time range for the report
     * @returns The prepared report data
     */
    preparePerformanceReportData(
        metrics: Metric[],
        timeRange: TimeRange
    ): Record<string, any> {
        // Filter metrics by time range
        const filteredMetrics = this.metricsProcessor.filterByTimeRange(metrics, timeRange);
        
        // Group metrics by device
        const metricsByDevice = new Map<string, Metric[]>();
        for (const metric of filteredMetrics) {
            const deviceId = metric.deviceId.value;
            if (!metricsByDevice.has(deviceId)) {
                metricsByDevice.set(deviceId, []);
            }
            metricsByDevice.get(deviceId)?.push(metric);
        }
        
        // Calculate performance metrics for each device
        const devicePerformance: Record<string, any>[] = [];
        for (const [deviceId, deviceMetrics] of metricsByDevice.entries()) {
            // Group by metric name
            const metricsByName = new Map<string, Metric[]>();
            for (const metric of deviceMetrics) {
                if (!metricsByName.has(metric.name)) {
                    metricsByName.set(metric.name, []);
                }
                metricsByName.get(metric.name)?.push(metric);
            }
            
            // Extract performance metrics
            const cpuMetrics = metricsByName.get('cpu_usage') || [];
            const memoryMetrics = metricsByName.get('memory_usage') || [];
            const diskMetrics = metricsByName.get('disk_usage') || [];
            
            const performance: Record<string, any> = {};
            
            if (cpuMetrics.length > 0) {
                const avgCpu = this.metricsProcessor.calculateAverage(cpuMetrics);
                const maxCpu = this.metricsProcessor.calculateMaximum(cpuMetrics);
                performance.cpu = {
                    average: avgCpu ? avgCpu.value : null,
                    maximum: maxCpu ? maxCpu.value : null,
                    unit: cpuMetrics[0].value.unit
                };
            }
            
            if (memoryMetrics.length > 0) {
                const avgMemory = this.metricsProcessor.calculateAverage(memoryMetrics);
                const maxMemory = this.metricsProcessor.calculateMaximum(memoryMetrics);
                performance.memory = {
                    average: avgMemory ? avgMemory.value : null,
                    maximum: maxMemory ? maxMemory.value : null,
                    unit: memoryMetrics[0].value.unit
                };
            }
            
            if (diskMetrics.length > 0) {
                const avgDisk = this.metricsProcessor.calculateAverage(diskMetrics);
                const maxDisk = this.metricsProcessor.calculateMaximum(diskMetrics);
                performance.disk = {
                    average: avgDisk ? avgDisk.value : null,
                    maximum: maxDisk ? maxDisk.value : null,
                    unit: diskMetrics[0].value.unit
                };
            }
            
            devicePerformance.push({
                deviceId: DeviceId.fromString(deviceId),
                performance
            });
        }
        
        return {
            timeRange: {
                startTime: timeRange.startTime.toISOString(),
                endTime: timeRange.endTime.toISOString(),
                durationInMinutes: timeRange.getDurationInMinutes()
            },
            devices: devicePerformance,
            summary: {
                totalDevices: metricsByDevice.size,
                totalMetrics: filteredMetrics.length
            }
        };
    }

    /**
     * Prepares data for an alerts report
     * 
     * @param alerts The alerts to include in the report
     * @param timeRange The time range for the report
     * @returns The prepared report data
     */
    prepareAlertsReportData(
        alerts: AlertEntity[],
        timeRange: TimeRange
    ): Record<string, any> {
        // Filter alerts by time range
        const filteredAlerts = alerts.filter(alert => timeRange.includes(alert.createdAt));
        
        // Group alerts by severity
        const alertsBySeverity = new Map<string, Alert[]>();
        for (const alert of filteredAlerts) {
            const severity = alert.severity.value;
            if (!alertsBySeverity.has(severity)) {
                alertsBySeverity.set(severity, []);
            }
            alertsBySeverity.get(severity)?.push(alert);
        }
        
        // Group alerts by status
        const alertsByStatus = new Map<string, Alert[]>();
        for (const alert of filteredAlerts) {
            const status = alert.status.value;
            if (!alertsByStatus.has(status)) {
                alertsByStatus.set(status, []);
            }
            alertsByStatus.get(status)?.push(alert);
        }
        
        // Group alerts by device
        const alertsByDevice = new Map<string, Alert[]>();
        for (const alert of filteredAlerts) {
            const deviceId = alert.deviceId?.value ?? 'system';
            if (!alertsByDevice.has(deviceId)) {
                alertsByDevice.set(deviceId, []);
            }
            alertsByDevice.get(deviceId)?.push(alert);
        }
        
        // Prepare alert details
        const alertDetails = filteredAlerts.map(alert => ({
            id: alert.id.value,
            title: alert.title,
            message: alert.message,
            severity: alert.severity.value,
            status: alert.status.value,
                    deviceId: alert.deviceId?.value ?? 'system',
            createdAt: alert.createdAt.toISOString(),
            acknowledgedAt: alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
            acknowledgedBy: alert.acknowledgedBy,
            resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
            resolvedBy: alert.resolvedBy
        }));
        
        return {
            timeRange: {
                startTime: timeRange.startTime.toISOString(),
                endTime: timeRange.endTime.toISOString(),
                durationInMinutes: timeRange.getDurationInMinutes()
            },
            summary: {
                totalAlerts: filteredAlerts.length,
                bySeverity: {
                    info: alertsBySeverity.get('info')?.length || 0,
                    warning: alertsBySeverity.get('warning')?.length || 0,
                    critical: alertsBySeverity.get('critical')?.length || 0,
                    emergency: alertsBySeverity.get('emergency')?.length || 0
                },
                byStatus: {
                    active: alertsByStatus.get('active')?.length || 0,
                    acknowledged: alertsByStatus.get('acknowledged')?.length || 0,
                    resolved: alertsByStatus.get('resolved')?.length || 0
                },
                byDevice: Array.from(alertsByDevice.entries()).map(([deviceId, alerts]) => ({
                    deviceId: DeviceId.fromString(deviceId),
                    count: alerts.length
                }))
            },
            alerts: alertDetails
        };
    }
}