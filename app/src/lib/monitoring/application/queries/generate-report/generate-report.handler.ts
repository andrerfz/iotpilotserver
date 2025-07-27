import {QueryHandler} from '@/lib/shared/application/interfaces/query-handler.interface';
import {GenerateReportQuery, ReportFormat, ReportType} from './generate-report.query';
import {MetricsRepository} from '../../../domain/interfaces/metrics-repository.interface';
import {AlertRepository} from '../../../domain/interfaces/alert-repository.interface';
import {ThresholdRepository} from '../../../domain/interfaces/threshold-repository.interface';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator';
import {ReportGeneratedEvent} from '../../../domain/events/report-generated.event';
import {EventBus} from '@/lib/shared/application/bus/event.bus';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {UserId} from '@/lib/user/domain/value-objects/user-id.vo';
import {UserRole} from '@/lib/shared/domain/value-objects/user-role.vo';
import {ThresholdId} from '../../../domain/value-objects/threshold-id.vo';
import {AlertSeverity} from '../../../domain/value-objects/alert-severity.vo';
import {AlertStatus} from '../../../domain/value-objects/alert-status.vo';

export interface ReportData {
    type: ReportType;
    timeRange: {
        start: string;
        end: string;
    };
    format: ReportFormat;
    generatedAt: string;
    tenantId: string;
    deviceId?: string;
    metrics?: any[];
    alerts?: any[];
    thresholds?: any[];
    summary?: {
        totalMetrics?: number;
        totalAlerts?: number;
        totalThresholds?: number;
        averages?: Record<string, number>;
        min?: Record<string, number>;
        max?: Record<string, number>;
        p95?: Record<string, number>;
        p99?: Record<string, number>;
        alertsBySeverity?: Record<string, number>;
        alertsByStatus?: Record<string, number>;
    };
}

export class GenerateReportHandler implements QueryHandler<GenerateReportQuery, ReportData> {
    constructor(
        private readonly metricsRepository: MetricsRepository,
        private readonly alertRepository: AlertRepository,
        private readonly thresholdRepository: ThresholdRepository,
        private readonly tenantValidator: TenantBoundaryValidator,
        private readonly eventBus: EventBus
    ) {}

    async execute(query: GenerateReportQuery): Promise<ReportData> {
        // Validate tenant boundary
        const mockUserId = UserId.create('system-user');
        const mockUserRole = UserRole.create('USER');
        const tenantContext = new TenantContextImpl(query.tenantId, mockUserId, mockUserRole, false);
        this.tenantValidator.validateTenantAccess(tenantContext, query.tenantId, 'GenerateReport');

        // Initialize report data
        const reportData: ReportData = {
            type: query.reportType,
            timeRange: {
                start: query.timeRange.getStartTime().toISOString(),
                end: query.timeRange.getEndTime().toISOString()
            },
            format: query.format || 'json',
            generatedAt: new Date().toISOString(),
            tenantId: query.tenantId.getValue(),
            deviceId: query.deviceId?.getValue(),
            summary: {}
        };

        // Fetch data based on report type
        switch (query.reportType) {
            case 'system':
                await this.generateSystemReport(query, reportData);
                break;
            case 'device':
                if (!query.deviceId) {
                    throw new Error('Device ID is required for device reports');
                }
                await this.generateDeviceReport(query, reportData);
                break;
            case 'alerts':
                await this.generateAlertsReport(query, reportData);
                break;
            case 'performance':
                await this.generatePerformanceReport(query, reportData);
                break;
            case 'custom':
                await this.generateCustomReport(query, reportData);
                break;
            default:
                throw new Error(`Unsupported report type: ${query.reportType}`);
        }

        // Publish event
        this.eventBus.publish(new ReportGeneratedEvent(
            query.reportType,
            query.tenantId,
            query.deviceId
        ));

        return reportData;
    }

    private async generateSystemReport(query: GenerateReportQuery, reportData: ReportData): Promise<void> {
        // Get system-wide metrics
        const metrics = await this.metricsRepository.findAll(
            query.tenantId,
            query.timeRange,
            1000 // Limit to prevent excessive data
        );

        // Filter by metric names if provided
        const filteredMetrics = query.metricNames && query.metricNames.length > 0
            ? metrics.filter(metric => query.metricNames!.includes(metric.name))
            : metrics;

        reportData.metrics = filteredMetrics.map(metric => ({
            id: metric.id.getValue(),
            name: metric.name,
            value: metric.value.getValue(),
            timestamp: metric.timestamp.toISOString(),
            tags: Object.fromEntries(metric.tags)
        }));

        // Include alerts if requested
        if (query.includeAlerts) {
            const alerts = await this.alertRepository.findAll(
                query.tenantId,
                query.timeRange,
                100 // Limit to prevent excessive data
            );

            reportData.alerts = alerts.map(alert => ({
                id: alert.id.getValue(),
                title: alert.title,
                message: alert.message,
                severity: alert.severity.getValue(),
                status: alert.status.getValue(),
                createdAt: alert.createdAt.toISOString(),
                deviceId: alert.deviceId?.getValue() ?? 'system'
            }));
        }

        // Include thresholds if requested
        if (query.includeThresholds) {
            const thresholds = await this.thresholdRepository.findAll(
                query.tenantId,
                true // Include disabled thresholds
            );

            reportData.thresholds = thresholds.map(threshold => ({
                id: threshold.id.getValue(),
                name: threshold.name,
                metricName: threshold.metricName,
                operator: threshold.operator,
                value: threshold.value,
                unit: threshold.unit,
                severity: threshold.severity.getValue(),
                enabled: threshold.enabled,
                type: threshold.type,
                deviceId: threshold.deviceId?.getValue()
            }));
        }

        // Generate summary
        reportData.summary = {
            totalMetrics: reportData.metrics.length,
            totalAlerts: reportData.alerts?.length || 0,
            totalThresholds: reportData.thresholds?.length || 0
        };

        // Calculate averages, min, max for numeric metrics
        const metricsByName = new Map<string, number[]>();
        
        for (const metric of filteredMetrics) {
            if (typeof metric.value.value === 'number') {
                if (!metricsByName.has(metric.name)) {
                    metricsByName.set(metric.name, []);
                }
                metricsByName.get(metric.name)!.push(metric.value.value);
            }
        }

        const averages: Record<string, number> = {};
        const min: Record<string, number> = {};
        const max: Record<string, number> = {};

        for (const [name, values] of metricsByName.entries()) {
            if (values.length > 0) {
                averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
                min[name] = Math.min(...values);
                max[name] = Math.max(...values);
            }
        }

        reportData.summary.averages = averages;
        reportData.summary.min = min;
        reportData.summary.max = max;
    }

    private async generateDeviceReport(query: GenerateReportQuery, reportData: ReportData): Promise<void> {
        if (!query.deviceId) {
            throw new Error('Device ID is required for device reports');
        }

        // Get device-specific metrics
        const metrics = await this.metricsRepository.findByDeviceId(
            query.deviceId,
            query.tenantId,
            query.timeRange
        );

        // Filter by metric names if provided
        const filteredMetrics = query.metricNames && query.metricNames.length > 0
            ? metrics.filter(metric => query.metricNames!.includes(metric.name))
            : metrics;

        reportData.metrics = filteredMetrics.map(metric => ({
            id: metric.id.getValue(),
            name: metric.name,
            value: metric.value.getValue(),
            timestamp: metric.timestamp.toISOString(),
            tags: Object.fromEntries(metric.tags)
        }));

        // Include alerts if requested
        if (query.includeAlerts) {
            const alerts = await this.alertRepository.findByDeviceId(
                query.deviceId,
                query.tenantId,
                query.timeRange
            );

            reportData.alerts = alerts.map(alert => ({
                id: alert.id.getValue(),
                title: alert.title,
                message: alert.message,
                severity: alert.severity.getValue(),
                status: alert.status.getValue(),
                createdAt: alert.createdAt.toISOString()
            }));
        }

        // Include thresholds if requested
        if (query.includeThresholds) {
            const thresholds = await this.thresholdRepository.findApplicableThresholds(
                query.deviceId,
                query.tenantId,
                true // Include disabled thresholds
            );

            reportData.thresholds = thresholds.map(threshold => ({
                id: threshold.id.getValue(),
                name: threshold.name,
                metricName: threshold.metricName,
                operator: threshold.operator,
                value: threshold.value,
                unit: threshold.unit,
                severity: threshold.severity.getValue(),
                enabled: threshold.enabled,
                type: threshold.type,
                isGlobal: threshold.isGlobal()
            }));
        }

        // Generate summary
        reportData.summary = {
            totalMetrics: reportData.metrics.length,
            totalAlerts: reportData.alerts?.length || 0,
            totalThresholds: reportData.thresholds?.length || 0
        };

        // Calculate averages, min, max for numeric metrics
        const metricsByName = new Map<string, number[]>();
        
        for (const metric of filteredMetrics) {
            if (typeof metric.value.value === 'number') {
                if (!metricsByName.has(metric.name)) {
                    metricsByName.set(metric.name, []);
                }
                metricsByName.get(metric.name)!.push(metric.value.value);
            }
        }

        const averages: Record<string, number> = {};
        const min: Record<string, number> = {};
        const max: Record<string, number> = {};

        for (const [name, values] of metricsByName.entries()) {
            if (values.length > 0) {
                averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
                min[name] = Math.min(...values);
                max[name] = Math.max(...values);
            }
        }

        reportData.summary.averages = averages;
        reportData.summary.min = min;
        reportData.summary.max = max;
    }

    private async generateAlertsReport(query: GenerateReportQuery, reportData: ReportData): Promise<void> {
        // Get alerts
        let alerts;
        if (query.deviceId) {
            alerts = await this.alertRepository.findByDeviceId(
                query.deviceId,
                query.tenantId,
                query.timeRange
            );
        } else {
            alerts = await this.alertRepository.findAll(
                query.tenantId,
                query.timeRange,
                1000 // Limit to prevent excessive data
            );
        }

        reportData.alerts = alerts.map(alert => {
            // Create metadata object from specific properties
            const metadata = {
                metricName: alert.metricName,
                metricValue: alert.metricValue?.getValue(),
                metricUnit: alert.metricValue?.unit,
                thresholdValue: alert.thresholdValue,
                notes: alert.notes
            };
            
            return {
                id: alert.id.getValue(),
                title: alert.title,
                message: alert.message,
                severity: alert.severity.getValue(),
                status: alert.status.getValue(),
                createdAt: alert.createdAt.toISOString(),
                deviceId: alert.deviceId?.getValue() ?? 'system',
                thresholdId: alert.thresholdId?.getValue(),
                acknowledgedAt: alert.acknowledgedAt?.toISOString(),
                acknowledgedBy: alert.acknowledgedBy?.getValue(),
                resolvedAt: alert.resolvedAt?.toISOString(),
                resolvedBy: alert.resolvedBy?.getValue(),
                metadata: metadata
            };
        });

        // Include thresholds if requested
        if (query.includeThresholds) {
            // Get unique threshold IDs from alerts
            const thresholdIds = new Set(alerts.filter(alert => alert.thresholdId).map(alert => alert.thresholdId!.value));
            
            // Fetch thresholds
            const thresholds = [];
            for (const thresholdId of thresholdIds) {
                const threshold = await this.thresholdRepository.findById(
                    ThresholdId.fromString(thresholdId),
                    query.tenantId
                );
                
                if (threshold) {
                    thresholds.push(threshold);
                }
            }

            reportData.thresholds = thresholds.map(threshold => ({
                id: threshold.id.getValue(),
                name: threshold.name,
                metricName: threshold.metricName,
                operator: threshold.operator,
                value: threshold.value,
                unit: threshold.unit,
                severity: threshold.severity.getValue(),
                enabled: threshold.enabled,
                type: threshold.type,
                deviceId: threshold.deviceId?.getValue(),
                isGlobal: threshold.isGlobal()
            }));
        }

        // Generate summary
        reportData.summary = {
            totalAlerts: reportData.alerts.length,
            totalThresholds: reportData.thresholds?.length || 0
        };

        // Count alerts by severity and status
        const alertsBySeverity: Record<string, number> = {};
        const alertsByStatus: Record<string, number> = {};

        for (const alert of alerts) {
            const severity = alert.severity.value;
            const status = alert.status.value;

            alertsBySeverity[severity] = (alertsBySeverity[severity] || 0) + 1;
            alertsByStatus[status] = (alertsByStatus[status] || 0) + 1;
        }

        reportData.summary = {
            ...reportData.summary,
            alertsBySeverity,
            alertsByStatus
        };
    }

    private async generatePerformanceReport(query: GenerateReportQuery, reportData: ReportData): Promise<void> {
        // Performance reports focus on system performance metrics
        const performanceMetricNames = [
            'cpu_usage',
            'memory_usage',
            'disk_usage',
            'network_in',
            'network_out',
            'load_average',
            'response_time',
            'throughput',
            'error_rate',
            'latency'
        ];

        // Filter by provided metric names or use default performance metrics
        const metricNames = query.metricNames && query.metricNames.length > 0
            ? query.metricNames
            : performanceMetricNames;

        // Get metrics
        let metrics = [];
        if (query.deviceId) {
            // Get device-specific metrics
            for (const metricName of metricNames) {
                const deviceMetrics = await this.metricsRepository.findByDeviceIdAndName(
                    query.deviceId,
                    metricName,
                    query.tenantId,
                    query.timeRange
                );
                metrics.push(...deviceMetrics);
            }
        } else {
            // Get system-wide metrics
            for (const metricName of metricNames) {
                const systemMetrics = await this.metricsRepository.findByName(
                    metricName,
                    query.tenantId,
                    query.timeRange
                );
                metrics.push(...systemMetrics);
            }
        }

        reportData.metrics = metrics.map(metric => ({
            id: metric.id.getValue(),
            name: metric.name,
            value: metric.value.getValue(),
            timestamp: metric.timestamp.toISOString(),
            deviceId: metric.deviceId.getValue(),
            tags: Object.fromEntries(metric.tags)
        }));

        // Include alerts if requested
        if (query.includeAlerts) {
            // Get performance-related alerts
            let alerts;
            if (query.deviceId) {
                alerts = await this.alertRepository.findByDeviceId(
                    query.deviceId,
                    query.tenantId,
                    query.timeRange
                );
            } else {
                alerts = await this.alertRepository.findAll(
                    query.tenantId,
                    query.timeRange
                );
            }

            // Filter alerts related to performance metrics
            const performanceAlerts = alerts.filter(alert => {
                // Check if the alert is related to a performance metric
                // This is a simplistic approach; in a real system, you might have more sophisticated logic
                return metricNames.some(metricName => 
                    alert.title.toLowerCase().includes(metricName.toLowerCase()) ||
                    alert.message.toLowerCase().includes(metricName.toLowerCase())
                );
            });

            reportData.alerts = performanceAlerts.map(alert => ({
                id: alert.id.getValue(),
                title: alert.title,
                message: alert.message,
                severity: alert.severity.getValue(),
                status: alert.status.getValue(),
                createdAt: alert.createdAt.toISOString(),
                deviceId: alert.deviceId?.getValue() ?? 'system'
            }));
        }

        // Generate summary with performance metrics
        const metricsByName = new Map<string, number[]>();
        
        for (const metric of metrics) {
            if (typeof metric.value.getValue() === 'number') {
                if (!metricsByName.has(metric.name)) {
                    metricsByName.set(metric.name, []);
                }
                metricsByName.get(metric.name)!.push(metric.value.getValue());
            }
        }

        const averages: Record<string, number> = {};
        const min: Record<string, number> = {};
        const max: Record<string, number> = {};
        const p95: Record<string, number> = {}; // 95th percentile
        const p99: Record<string, number> = {}; // 99th percentile

        for (const [name, values] of metricsByName.entries()) {
            if (values.length > 0) {
                // Sort values for percentile calculations
                const sortedValues = [...values].sort((a, b) => a - b);
                
                averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
                min[name] = sortedValues[0];
                max[name] = sortedValues[sortedValues.length - 1];
                
                // Calculate percentiles
                const p95Index = Math.floor(sortedValues.length * 0.95);
                const p99Index = Math.floor(sortedValues.length * 0.99);
                
                p95[name] = sortedValues[p95Index];
                p99[name] = sortedValues[p99Index];
            }
        }

        reportData.summary = {
            totalMetrics: reportData.metrics.length,
            totalAlerts: reportData.alerts?.length || 0,
            averages,
            min,
            max,
            p95,
            p99
        };
    }

    private async generateCustomReport(query: GenerateReportQuery, reportData: ReportData): Promise<void> {
        // Custom reports are flexible and depend on the provided options
        if (!query.customOptions) {
            throw new Error('Custom options are required for custom reports');
        }

        // Include metrics if requested
        if (query.customOptions.includeMetrics) {
            let metrics = [];
            
            if (query.deviceId && query.metricNames) {
                // Get specific device metrics
                for (const metricName of query.metricNames) {
                    const deviceMetrics = await this.metricsRepository.findByDeviceIdAndName(
                        query.deviceId,
                        metricName,
                        query.tenantId,
                        query.timeRange
                    );
                    metrics.push(...deviceMetrics);
                }
            } else if (query.deviceId) {
                // Get all device metrics
                metrics = await this.metricsRepository.findByDeviceId(
                    query.deviceId,
                    query.tenantId,
                    query.timeRange
                );
            } else if (query.metricNames) {
                // Get specific metrics across all devices
                for (const metricName of query.metricNames) {
                    const namedMetrics = await this.metricsRepository.findByName(
                        metricName,
                        query.tenantId,
                        query.timeRange
                    );
                    metrics.push(...namedMetrics);
                }
            } else {
                // Get all metrics
                metrics = await this.metricsRepository.findAll(
                    query.tenantId,
                    query.timeRange,
                    query.customOptions.limit || 1000
                );
            }

            reportData.metrics = metrics.map(metric => ({
                id: metric.id.getValue(),
                name: metric.name,
                value: metric.value.getValue(),
                timestamp: metric.timestamp.toISOString(),
                deviceId: metric.deviceId.getValue(),
                tags: Object.fromEntries(metric.tags)
            }));
        }

        // Include alerts if requested
        if (query.includeAlerts) {
            let alerts;
            
            if (query.deviceId) {
                // Get device-specific alerts
                alerts = await this.alertRepository.findByDeviceId(
                    query.deviceId,
                    query.tenantId,
                    query.timeRange
                );
            } else if (query.customOptions.alertSeverity) {
                // Get alerts by severity
                alerts = await this.alertRepository.findBySeverity(
                    AlertSeverity.create(query.customOptions.alertSeverity as any),
                    query.tenantId,
                    query.timeRange
                );
            } else if (query.customOptions.alertStatus) {
                // Get alerts by status
                alerts = await this.alertRepository.findByStatus(
                    AlertStatus.create(query.customOptions.alertStatus as any),
                    query.tenantId,
                    query.timeRange
                );
            } else {
                // Get all alerts
                alerts = await this.alertRepository.findAll(
                    query.tenantId,
                    query.timeRange,
                    query.customOptions.limit || 1000
                );
            }

            reportData.alerts = alerts.map(alert => {
                // Create metadata object from specific properties
                const metadata = {
                    metricName: alert.metricName,
                    metricValue: alert.metricValue?.getValue(),
                    metricUnit: alert.metricValue?.unit,
                    thresholdValue: alert.thresholdValue,
                    notes: alert.notes
                };
                
                return {
                    id: alert.id.getValue(),
                    title: alert.title,
                    message: alert.message,
                    severity: alert.severity.getValue(),
                    status: alert.status.getValue(),
                    createdAt: alert.createdAt.toISOString(),
                    deviceId: alert.deviceId?.getValue() ?? 'system',
                    thresholdId: alert.thresholdId?.getValue(),
                    acknowledgedAt: alert.acknowledgedAt?.toISOString(),
                    acknowledgedBy: alert.acknowledgedBy?.getValue(),
                    resolvedAt: alert.resolvedAt?.toISOString(),
                    resolvedBy: alert.resolvedBy?.getValue(),
                    metadata: metadata
                };
            });
        }

        // Include thresholds if requested
        if (query.includeThresholds) {
            let thresholds;
            
            if (query.deviceId) {
                // Get applicable thresholds for a device
                thresholds = await this.thresholdRepository.findApplicableThresholds(
                    query.deviceId,
                    query.tenantId,
                    true // Include disabled thresholds
                );
            } else if (query.customOptions.thresholdType) {
                // Get thresholds by type
                thresholds = await this.thresholdRepository.findByType(
                    query.customOptions.thresholdType,
                    query.tenantId
                );
            } else if (query.customOptions.metricName) {
                // Get thresholds by metric name
                thresholds = await this.thresholdRepository.findByMetricName(
                    query.customOptions.metricName,
                    query.tenantId
                );
            } else {
                // Get all thresholds
                thresholds = await this.thresholdRepository.findAll(
                    query.tenantId,
                    true // Include disabled thresholds
                );
            }

            reportData.thresholds = thresholds.map(threshold => ({
                id: threshold.id.getValue(),
                name: threshold.name,
                metricName: threshold.metricName,
                operator: threshold.operator,
                value: threshold.value,
                unit: threshold.unit,
                severity: threshold.severity.getValue(),
                enabled: threshold.enabled,
                type: threshold.type,
                deviceId: threshold.deviceId?.getValue(),
                isGlobal: threshold.isGlobal()
            }));
        }

        // Generate custom summary based on options
        reportData.summary = {
            totalMetrics: reportData.metrics?.length || 0,
            totalAlerts: reportData.alerts?.length || 0,
            totalThresholds: reportData.thresholds?.length || 0
        };

        // Add custom summary data if provided
        if (query.customOptions.customSummary) {
            reportData.summary = {
                ...reportData.summary,
                ...query.customOptions.customSummary
            };
        }
    }
}