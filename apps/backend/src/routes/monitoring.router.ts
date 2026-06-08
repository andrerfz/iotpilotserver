// apps/backend/src/routes/monitoring.router.ts
import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { send } from '../http/response.util';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { ListAlertsQuery } from '@iotpilot/core/monitoring/application/queries/list-alerts/list-alerts.query';
import { CreateAlertCommand } from '@iotpilot/core/monitoring/application/commands/create-alert/create-alert.command';
import { GetAlertDetailsQuery } from '@iotpilot/core/monitoring/application/queries/get-alert-details/get-alert-details.query';
import { AcknowledgeAlertCommand } from '@iotpilot/core/monitoring/application/commands/acknowledge-alert/acknowledge-alert.command';
import { ResolveAlertCommand } from '@iotpilot/core/monitoring/application/commands/resolve-alert/resolve-alert.command';
import { DeleteAlertCommand } from '@iotpilot/core/monitoring/application/commands/delete-alert/delete-alert.command';
import { GetSystemMetricsQuery } from '@iotpilot/core/monitoring/application/queries/get-system-metrics/get-system-metrics.query';
import {
    GenerateReportQuery,
    ReportFormat,
    ReportType
} from '@iotpilot/core/monitoring/application/queries/generate-report/generate-report.query';
import { GetThresholdsQuery } from '@iotpilot/core/monitoring/application/queries/get-thresholds/get-thresholds.query';
import { CreateThresholdCommand } from '@iotpilot/core/monitoring/application/commands/create-threshold/create-threshold.command';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { validator } from '@iotpilot/core/shared/infrastructure/validation/validation-helper';
import { Pagination } from '@iotpilot/core/shared/infrastructure/http/pagination.util';
import { prisma } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { AlertEntity } from '@iotpilot/core/monitoring/domain/entities/alert.entity';

export const monitoringRouter = Router();

function isoTimestamp(): string {
    return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Shared helpers / constants for alerts
// ---------------------------------------------------------------------------

const DOMAIN_TO_FRONTEND_SEVERITY: Record<string, string> = {
    LOW: 'INFO', MEDIUM: 'WARNING', HIGH: 'ERROR', CRITICAL: 'CRITICAL'
};
const FRONTEND_TO_DOMAIN_SEVERITY: Record<string, string> = {
    INFO: 'LOW', WARNING: 'MEDIUM', ERROR: 'HIGH', CRITICAL: 'CRITICAL'
};

function alertToDTO(alert: AlertEntity) {
    return {
        id: alert.publicId || alert.getId().getValue(),
        deviceId: alert.deviceId?.getValue() || null,
        type: alert.type?.getValue() || alert.metadata?.rawType || 'CUSTOM',
        severity: DOMAIN_TO_FRONTEND_SEVERITY[alert.severity.value] || 'INFO',
        title: alert.title,
        message: alert.message,
        source: alert.notes || null,
        resolved: alert.isResolved(),
        resolvedAt: alert.resolvedAt?.toISOString() || null,
        acknowledgedAt: alert.acknowledgedAt?.toISOString() || null,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        metadata: alert.metadata || {}
    };
}

async function resolveAlertId(publicId: string): Promise<string | null> {
    const record = await prisma.getClient().alert.findFirst({
        where: { publicId },
        select: { id: true },
    });
    return record?.id ?? null;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const v = validator();

const createAlertSchema = v.object({
    deviceId: v.string({ min: 1, message: 'Device ID is required' }),
    thresholdId: v.string({ min: 1, message: 'Threshold ID is required' }),
    title: v.string({ min: 1, message: 'Alert title is required' }),
    message: v.string({ min: 1, message: 'Alert message is required' }),
    severity: v.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
    metadata: v.default(v.optional(v.record(v.string(), v.any())), {})
});

const alertActionSchema = v.object({
    action: v.enum(['acknowledge', 'resolve'] as const)
});

const createThresholdSchema = v.object({
    deviceId: v.optional(v.nullable(v.string())),
    name: v.string({ min: 1, message: 'Threshold name is required' }),
    description: v.string({ min: 1, message: 'Threshold description is required' }),
    metricName: v.string({ min: 1, message: 'Metric name is required' }),
    operator: v.enum(['GREATER_THAN', 'LESS_THAN', 'EQUAL_TO', 'NOT_EQUAL_TO', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL'] as const),
    value: v.number(),
    unit: v.string({ min: 1, message: 'Unit is required' }),
    severity: v.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
    type: v.enum(['STATIC', 'DYNAMIC', 'BASELINE'] as const),
    cooldownMinutes: v.default(v.number({ min: 0, int: true, message: 'Cooldown must be a non-negative integer' }), 5),
    metadata: v.default(v.optional(v.record(v.string(), v.any())), {})
});

// ===========================================================================
// ALERTS — /alerts
// ===========================================================================

// GET /monitoring/alerts - List alerts using DDD architecture
monitoringRouter.get('/alerts', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING ALERTS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Parse query parameters
        const deviceId = req.query.deviceId as string | undefined;
        const severity = req.query.severity as any;
        const status = req.query.status as any;
        const startTimeParam = req.query.startTime as string | undefined;
        const endTimeParam = req.query.endTime as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        console.log('📋 MONITORING ALERTS GET: Query params:', {
            deviceId,
            severity,
            status,
            startTime: startTimeParam,
            endTime: endTimeParam,
            limit,
            offset,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Parse time range if provided
        let startTime: Date | undefined;
        let endTime: Date | undefined;

        if (startTimeParam) {
            startTime = new Date(startTimeParam);
            if (isNaN(startTime.getTime())) {
                send.badRequest(res, 'Invalid startTime format');
                return;
            }
        }

        if (endTimeParam) {
            endTime = new Date(endTimeParam);
            if (isNaN(endTime.getTime())) {
                send.badRequest(res, 'Invalid endTime format');
                return;
            }
        }

        // Validate date range
        if (startTime && endTime && startTime >= endTime) {
            send.badRequest(res, 'Start time must be before end time');
            return;
        }

        // Get tenant ID - use customer ID from user context
        const tenantId = req.user?.customerId;
        if (!tenantId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for alerts access');
            return;
        }

        // Resolve device publicId → internal id if provided
        let internalDeviceId: string | undefined;
        if (deviceId) {
            const deviceRecord = await prisma.getClient().device.findFirst({
                where: { publicId: deviceId },
                select: { id: true }
            });
            internalDeviceId = deviceRecord?.id;
        }

        // Map frontend severity/status to domain values
        const domainSeverity = severity ? (FRONTEND_TO_DOMAIN_SEVERITY[severity.toUpperCase()] || severity) : undefined;
        const domainStatus = status ? status.toUpperCase() : undefined;

        // Create and execute ListAlerts query
        const listAlertsQuery = ListAlertsQuery.create(
            tenantId || 'system',
            internalDeviceId,
            domainSeverity as any,
            domainStatus as any,
            startTime,
            endTime,
            limit,
            offset
        );

        const alertsResult = await queryBus.execute(listAlertsQuery);

        console.log('✅ MONITORING ALERTS GET: Alerts retrieved successfully:', {
            alertsCount: alertsResult.alerts?.length || 0,
            limit,
            offset,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Convert domain entities to frontend DTOs
        const alerts = (alertsResult.alerts || []).map((a: AlertEntity) => alertToDTO(a));

        const pagination = Pagination.fromOffset(offset, limit, alertsResult.total || 0);

        send.ok(res, alerts, {
            pagination,
            filters: {
                deviceId: deviceId || null,
                severity: severity || null,
                status: status || null,
                timeRange: {
                    startTime: startTime?.toISOString() || null,
                    endTime: endTime?.toISOString() || null
                }
            },
            summary: {
                totalAlerts: alertsResult.total || 0,
                severityBreakdown: alertsResult.severityBreakdown || {},
                statusBreakdown: alertsResult.statusBreakdown || {}
            }
        });
        return;

    } catch (err) {
        console.error('❌ MONITORING ALERTS GET: Failed to fetch alerts with DDD:', err);
        send.fromError(res, err);
    }
});

// POST /monitoring/alerts - Create new alert using DDD architecture
monitoringRouter.post('/alerts', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING ALERTS POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = req.body;

        console.log('📋 MONITORING ALERTS POST: Create alert request:', {
            deviceId: body.deviceId,
            severity: body.severity,
            title: body.title,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Validate request body
        const validationResult = createAlertSchema.safeParse(body);
        if (!validationResult.success) {
            send.badRequest(res, 'Invalid alert data', validationResult.errors);
            return;
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            send.badRequest(res, 'Invalid alert data');
            return;
        }

        const alertData = validationResult.data;

        // Get tenant ID - use customer ID from user context
        const customerId = req.user?.customerId;
        if (!customerId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for alert creation');
            return;
        }

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute CreateAlert command
        const createAlertCommand = CreateAlertCommand.create(
            alertData.deviceId,
            alertData.thresholdId,
            alertData.title,
            alertData.message,
            alertData.severity,
            alertData.metadata || {},
            customerId || 'system',
            tenantContext
        );

        const createdAlert = await commandBus.execute<typeof createAlertCommand, any>(createAlertCommand);

        console.log('✅ MONITORING ALERTS POST: Alert created successfully:', {
            alertId: createdAlert.id,
            deviceId: alertData.deviceId,
            severity: alertData.severity,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        send.created(res, {
            alert: {
                id: createdAlert.id,
                deviceId: createdAlert.deviceId,
                thresholdId: createdAlert.thresholdId,
                title: createdAlert.title,
                message: createdAlert.message,
                severity: createdAlert.severity,
                status: createdAlert.status,
                metadata: createdAlert.metadata,
                createdAt: createdAlert.createdAt,
                customerId: createdAlert.customerId
            }
        });
        return;

    } catch (err) {
        console.error('❌ MONITORING ALERTS POST: Failed to create alert with DDD:', err);
        send.fromError(res, err);
    }
});

// ===========================================================================
// ALERTS — /alerts/:id
// ===========================================================================

// GET /monitoring/alerts/:id - Get alert details using DDD architecture
monitoringRouter.get('/alerts/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING ALERT GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const publicId = req.params.id;
        const alertId = await resolveAlertId(publicId);
        if (!alertId) {
            send.notFound(res, 'Alert not found');
            return;
        }

        console.log('📋 MONITORING ALERT GET: Query params:', {
            alertId,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Get tenant ID - use customer ID from user context
        const tenantId = req.user?.customerId;
        if (!tenantId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for alert access');
            return;
        }

        // Create and execute GetAlertDetails query
        const getAlertDetailsQuery = GetAlertDetailsQuery.create(
            alertId,
            tenantId || 'system'
        );

        const alertDetails = await queryBus.execute(getAlertDetailsQuery);

        if (!alertDetails) {
            send.notFound(res, 'Alert not found');
            return;
        }

        const alert = alertDetails.alert;
        const threshold = alertDetails.threshold;

        console.log('✅ MONITORING ALERT GET: Alert details retrieved successfully:', {
            alertId,
            severity: alert.severity?.value,
            status: alert.status?.getValue?.() ?? alert.status,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            id: alert.publicId || alert.getId().getValue(),
            deviceId: alert.deviceId?.getValue() ?? null,
            thresholdId: alert.thresholdId?.getValue?.() ?? null,
            title: alert.title,
            message: alert.message,
            severity: alert.severity?.getValue?.() ?? alert.severity?.value ?? null,
            status: alert.status?.getValue?.() ?? null,
            metadata: alert.metadata || {},
            createdAt: alert.createdAt,
            acknowledgedAt: alert.acknowledgedAt ?? null,
            acknowledgedBy: alert.acknowledgedBy?.getValue?.() ?? null,
            resolvedAt: alert.resolvedAt ?? null,
            resolvedBy: alert.resolvedBy?.getValue?.() ?? null,
            customerId: alert.customerId?.getValue?.() ?? null,
            threshold: threshold ? {
                id: threshold.id?.getValue?.() ?? threshold.id,
                name: threshold.name,
                metricName: threshold.metricName,
                value: threshold.value,
                operator: threshold.operator
            } : null,
            relatedMetrics: alertDetails.relatedMetrics || [],
            timestamp: isoTimestamp()
        };

        send.ok(res, response);
        return;

    } catch (err) {
        console.error('❌ MONITORING ALERT GET: Failed to fetch alert details with DDD:', err);
        send.fromError(res, err);
    }
});

// PUT /monitoring/alerts/:id - Update alert status (acknowledge/resolve) using DDD architecture
monitoringRouter.put('/alerts/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING ALERT PUT: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const publicId = req.params.id;
        const alertId = await resolveAlertId(publicId);
        if (!alertId) {
            send.notFound(res, 'Alert not found');
            return;
        }

        const body = req.body;

        console.log('📋 MONITORING ALERT PUT: Update alert request:', {
            alertId,
            action: body.action,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Validate request body
        const validationResult = alertActionSchema.safeParse(body);
        if (!validationResult.success) {
            send.badRequest(res, 'Invalid alert action', validationResult.errors);
            return;
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            send.badRequest(res, 'Invalid alert action');
            return;
        }

        const { action } = validationResult.data;

        // Get tenant ID - use customer ID from user context
        const customerId = req.user?.customerId;
        if (!customerId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for alert actions');
            return;
        }

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        let result: any;

        // Execute the appropriate command based on action
        if (action === 'acknowledge') {
            const acknowledgeAlertCommand = AcknowledgeAlertCommand.create(
                alertId,
                req.user!.id,
                customerId || 'system',
                tenantContext
            );

            result = await commandBus.execute(acknowledgeAlertCommand);

            console.log('✅ MONITORING ALERT PUT: Alert acknowledged successfully:', {
                alertId,
                userId: req.user!.id,
                customerId: req.user?.customerId
            });
        } else if (action === 'resolve') {
            const resolveAlertCommand = ResolveAlertCommand.create(
                alertId,
                req.user!.id,
                customerId || 'system',
                tenantContext
            );

            result = await commandBus.execute(resolveAlertCommand);

            console.log('✅ MONITORING ALERT PUT: Alert resolved successfully:', {
                alertId,
                userId: req.user!.id,
                customerId: req.user?.customerId
            });
        }

        // Convert domain result to API response format
        const response = {
            success: true,
            message: `Alert ${action}d successfully`,
            alert: {
                id: result.publicId || result.getId().getValue(),
                status: result.status?.getValue?.() ?? result.status,
                acknowledgedAt: result.acknowledgedAt ?? null,
                acknowledgedBy: result.acknowledgedBy?.getValue?.() ?? null,
                resolvedAt: result.resolvedAt ?? null,
                resolvedBy: result.resolvedBy?.getValue?.() ?? null,
                updatedAt: result.updatedAt
            },
            action,
            actionBy: {
                id: req.user!.id,
                email: req.user!.email,
                username: req.user!.username
            },
            timestamp: isoTimestamp()
        };

        send.ok(res, response);
        return;

    } catch (err) {
        console.error('❌ MONITORING ALERT PUT: Failed to update alert with DDD:', err);
        send.fromError(res, err);
    }
});

// DELETE /monitoring/alerts/:id - Delete alert using DDD architecture
monitoringRouter.delete('/alerts/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🗑️ MONITORING ALERT DELETE: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const publicId = req.params.id;
        const alertId = await resolveAlertId(publicId);
        if (!alertId) {
            send.notFound(res, 'Alert not found');
            return;
        }

        console.log('📋 MONITORING ALERT DELETE: Delete alert request:', {
            alertId,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Get tenant ID - use customer ID from user context
        const customerId = req.user?.customerId;
        if (!customerId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for alert deletion');
            return;
        }

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute DeleteAlert command
        const deleteAlertCommand = DeleteAlertCommand.create(
            alertId,
            req.user!.id,
            customerId || 'system',
            tenantContext
        );

        await commandBus.execute(deleteAlertCommand);

        console.log('✅ MONITORING ALERT DELETE: Alert deleted successfully:', {
            alertId,
            userId: req.user!.id,
            customerId: req.user?.customerId
        });

        // Return success response
        const response = {
            success: true,
            message: 'Alert deleted successfully',
            alertId,
            deletedBy: {
                id: req.user!.id,
                email: req.user!.email,
                username: req.user!.username
            },
            timestamp: isoTimestamp()
        };

        send.ok(res, response);
        return;

    } catch (err) {
        console.error('❌ MONITORING ALERT DELETE: Failed to delete alert with DDD:', err);
        send.fromError(res, err);
    }
});

// ===========================================================================
// METRICS — /metrics
// ===========================================================================

// GET /monitoring/metrics - Get system metrics using DDD architecture
monitoringRouter.get('/metrics', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING METRICS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Parse query parameters
        const startTimeParam = req.query.startTime as string | undefined;
        const endTimeParam = req.query.endTime as string | undefined;
        const period = (req.query.period as string) || '24h'; // '1h', '24h', '7d', '30d'
        const metricNames = (req.query.metrics as string | undefined)?.split(',').filter(Boolean);
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

        console.log('📋 MONITORING METRICS GET: Query params:', {
            startTime: startTimeParam,
            endTime: endTimeParam,
            period,
            metricNames,
            limit,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Calculate date range based on period or explicit dates
        let startTime: Date | undefined;
        let endTime: Date | undefined;

        if (startTimeParam && endTimeParam) {
            startTime = new Date(startTimeParam);
            endTime = new Date(endTimeParam);
        } else {
            // Calculate based on period
            const now = new Date();
            endTime = now;

            switch (period) {
                case '1h':
                    startTime = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '6h':
                    startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default: // 24h is default
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }
        }

        // Validate date range
        if (startTime && endTime && startTime >= endTime) {
            send.badRequest(res, 'Start time must be before end time');
            return;
        }

        // Get tenant ID - use customer ID from user context or allow SUPERADMIN to specify
        const tenantId = req.user?.customerId;
        if (!tenantId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for metrics access');
            return;
        }

        // Create and execute GetSystemMetrics query
        const getSystemMetricsQuery = GetSystemMetricsQuery.create(
            tenantId || 'system', // Use 'system' for SUPERADMIN without specific tenant
            startTime,
            endTime,
            metricNames,
            limit
        );

        const metricsResult = await queryBus.execute(getSystemMetricsQuery);

        console.log('✅ MONITORING METRICS GET: System metrics retrieved successfully:', {
            metricsCount: metricsResult.metrics?.length || 0,
            period,
            startTime: startTime?.toISOString(),
            endTime: endTime?.toISOString(),
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            metrics: metricsResult.metrics || [],
            summary: metricsResult.summary || {},
            timeRange: {
                startTime: startTime?.toISOString(),
                endTime: endTime?.toISOString(),
                period
            },
            filters: {
                metricNames: metricNames || [],
                limit
            },
            metadata: {
                totalMetrics: metricsResult.metrics?.length || 0,
                availableMetrics: metricsResult.availableMetrics || [],
                lastUpdated: metricsResult.lastUpdated || isoTimestamp()
            },
            timestamp: isoTimestamp()
        };

        send.ok(res, response);
        return;

    } catch (err) {
        console.error('❌ MONITORING METRICS GET: Failed to fetch system metrics with DDD:', err);
        send.fromError(res, err);
    }
});

// ===========================================================================
// REPORTS — /reports
// ===========================================================================

// GET /monitoring/reports - Generate monitoring reports using DDD architecture
monitoringRouter.get('/reports', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING REPORTS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Parse query parameters
        const reportType = (req.query.type as ReportType) || 'system';
        const startTimeParam = req.query.startTime as string | undefined;
        const endTimeParam = req.query.endTime as string | undefined;
        const period = (req.query.period as string) || '24h'; // Default to 24h if no explicit dates
        const deviceId = req.query.deviceId as string | undefined;
        const metricNames = (req.query.metrics as string | undefined)?.split(',').filter(Boolean);
        const includeAlerts = req.query.includeAlerts !== 'false'; // default to true
        const includeThresholds = req.query.includeThresholds !== 'false'; // default to true
        const format = (req.query.format as ReportFormat) || 'json';

        console.log('📋 MONITORING REPORTS GET: Query params:', {
            reportType,
            startTime: startTimeParam,
            endTime: endTimeParam,
            period,
            deviceId,
            metricNames,
            includeAlerts,
            includeThresholds,
            format,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Validate report type
        const validReportTypes: ReportType[] = ['system', 'device', 'alerts', 'performance', 'custom'];
        if (!validReportTypes.includes(reportType)) {
            send.badRequest(res, `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`);
            return;
        }

        // Validate format
        const validFormats: ReportFormat[] = ['json', 'csv', 'pdf', 'html'];
        if (!validFormats.includes(format)) {
            send.badRequest(res, `Invalid format. Must be one of: ${validFormats.join(', ')}`);
            return;
        }

        // Calculate date range based on period or explicit dates
        let startTime: Date;
        let endTime: Date;

        if (startTimeParam && endTimeParam) {
            startTime = new Date(startTimeParam);
            endTime = new Date(endTimeParam);

            // Validate dates
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                send.badRequest(res, 'Invalid date format for startTime or endTime');
                return;
            }
        } else {
            // Calculate based on period
            const now = new Date();
            endTime = now;

            switch (period) {
                case '1h':
                    startTime = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '6h':
                    startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default: // 24h is default
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }
        }

        // Validate date range
        if (startTime >= endTime) {
            send.badRequest(res, 'Start time must be before end time');
            return;
        }

        // Validate date range is not too large (max 90 days for performance)
        const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
        if (endTime.getTime() - startTime.getTime() > maxRangeMs) {
            send.badRequest(res, 'Date range cannot exceed 90 days');
            return;
        }

        // Validate device-specific reports require deviceId
        if (reportType === 'device' && !deviceId) {
            send.badRequest(res, 'Device ID is required for device-specific reports');
            return;
        }

        // Get tenant ID - use customer ID from user context
        const tenantId = req.user?.customerId;
        if (!tenantId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for report generation');
            return;
        }

        // Parse custom options from additional query parameters
        const reservedKeys = ['type', 'startTime', 'endTime', 'period', 'deviceId', 'metrics',
            'includeAlerts', 'includeThresholds', 'format'];
        const customOptions: Record<string, any> = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (!reservedKeys.includes(key)) {
                customOptions[key] = value;
            }
        }

        // Create and execute GenerateReport query
        const generateReportQuery = GenerateReportQuery.create(
            tenantId || 'system', // Use 'system' for SUPERADMIN without specific tenant
            reportType,
            startTime,
            endTime,
            deviceId || undefined,
            metricNames,
            includeAlerts,
            includeThresholds,
            format,
            Object.keys(customOptions).length > 0 ? customOptions : undefined
        );

        const reportResult = await queryBus.execute(generateReportQuery);

        console.log('✅ MONITORING REPORTS GET: Report generated successfully:', {
            reportType,
            format,
            dataPoints: reportResult.data?.length || 0,
            duration: `${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))}h`,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Handle different response formats
        if (format === 'json') {
            // Return JSON response with comprehensive report data
            const response = {
                report: {
                    id: reportResult.id,
                    type: reportType,
                    format,
                    timeRange: {
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        duration: endTime.getTime() - startTime.getTime()
                    },
                    filters: {
                        deviceId: deviceId || null,
                        metricNames: metricNames || [],
                        includeAlerts,
                        includeThresholds,
                        customOptions
                    },
                    data: reportResult.data || [],
                    summary: reportResult.summary || {},
                    metadata: {
                        generatedAt: reportResult.generatedAt || isoTimestamp(),
                        generatedBy: {
                            id: req.user!.id,
                            email: req.user!.email,
                            username: req.user!.username
                        },
                        dataPoints: reportResult.data?.length || 0,
                        processingTime: reportResult.processingTimeMs || 0
                    }
                },
                timestamp: isoTimestamp()
            };

            send.ok(res, response);
            return;
        } else {
            // For other formats (CSV, PDF, HTML), return the generated content
            switch (format) {
                case 'csv':
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', `attachment; filename="report-${reportType}-${Date.now()}.csv"`);
                    break;
                case 'pdf':
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="report-${reportType}-${Date.now()}.pdf"`);
                    break;
                case 'html':
                    res.setHeader('Content-Type', 'text/html');
                    break;
            }

            res.status(200).send(reportResult.content || reportResult.data);
            return;
        }

    } catch (err) {
        console.error('❌ MONITORING REPORTS GET: Failed to generate report with DDD:', err);
        send.fromError(res, err);
    }
});

// ===========================================================================
// THRESHOLDS — /thresholds
// ===========================================================================

// GET /monitoring/thresholds - List thresholds using DDD architecture
monitoringRouter.get('/thresholds', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING THRESHOLDS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Parse query parameters
        const deviceId = req.query.deviceId as string | undefined;
        const type = req.query.type as any;
        const metricName = req.query.metricName as string | undefined;
        const severity = req.query.severity as any;
        const includeDisabled = req.query.includeDisabled === 'true';

        console.log('📋 MONITORING THRESHOLDS GET: Query params:', {
            deviceId,
            type,
            metricName,
            severity,
            includeDisabled,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Get tenant ID - use customer ID from user context
        const tenantId = req.user?.customerId;
        if (!tenantId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for thresholds access');
            return;
        }

        // Create and execute GetThresholds query
        const getThresholdsQuery = GetThresholdsQuery.create(
            tenantId || 'system', // Use 'system' for SUPERADMIN without specific tenant
            deviceId || undefined,
            type || undefined,
            metricName || undefined,
            severity || undefined,
            includeDisabled
        );

        // Handler returns Threshold[] directly
        const thresholdsList: any[] = await queryBus.execute(getThresholdsQuery);

        console.log('✅ MONITORING THRESHOLDS GET: Thresholds retrieved successfully:', {
            thresholdsCount: thresholdsList?.length || 0,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            thresholds: (thresholdsList || []).map((threshold: any) => ({
                id: threshold.id?.getValue ? threshold.id.getValue() : threshold.id,
                deviceId: threshold.deviceId?.getValue ? threshold.deviceId.getValue() : threshold.deviceId,
                name: threshold.name,
                description: threshold.description,
                metricName: threshold.metricName,
                operator: threshold.operator,
                value: threshold.value,
                unit: threshold.unit,
                severity: threshold.severity?.getValue ? threshold.severity.getValue() : threshold.severity,
                type: threshold.type,
                cooldownMinutes: threshold.cooldownMinutes,
                isEnabled: threshold.enabled ?? (typeof threshold.isEnabled === 'function' ? threshold.isEnabled() : threshold.isEnabled),
                metadata: threshold.metadata || {},
                createdAt: threshold.createdAt,
                updatedAt: threshold.updatedAt,
                customerId: threshold.customerId?.getValue ? threshold.customerId.getValue() : threshold.customerId,
                device: threshold.device ? {
                    id: threshold.device.id,
                    name: threshold.device.name,
                    type: threshold.device.type,
                    status: threshold.device.status
                } : null
            })),
            filters: {
                deviceId: deviceId || null,
                type: type || null,
                metricName: metricName || null,
                severity: severity || null,
                includeDisabled
            },
            summary: {
                totalThresholds: thresholdsList?.length || 0,
                enabledThresholds: (thresholdsList || []).filter((t: any) => t.isEnabled).length,
                disabledThresholds: (thresholdsList || []).filter((t: any) => !t.isEnabled).length,
                typeBreakdown: {},
                severityBreakdown: {}
            },
            timestamp: isoTimestamp()
        };

        send.ok(res, response);
        return;

    } catch (err) {
        console.error('❌ MONITORING THRESHOLDS GET: Failed to fetch thresholds with DDD:', err);
        send.fromError(res, err);
    }
});

// POST /monitoring/thresholds - Create new threshold using DDD architecture
monitoringRouter.post('/thresholds', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 MONITORING THRESHOLDS POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = req.body;

        console.log('📋 MONITORING THRESHOLDS POST: Create threshold request:', {
            name: body.name,
            metricName: body.metricName,
            operator: body.operator,
            value: body.value,
            severity: body.severity,
            type: body.type,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Validate request body
        const validationResult = createThresholdSchema.safeParse(body);
        if (!validationResult.success) {
            send.badRequest(res, 'Invalid threshold data', validationResult.errors);
            return;
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            send.badRequest(res, 'Invalid threshold data');
            return;
        }

        const thresholdData = validationResult.data;

        // Get tenant ID - use customer ID from user context
        const customerId = req.user?.customerId;
        if (!customerId && req.user?.role !== 'SUPERADMIN') {
            send.badRequest(res, 'Customer ID is required for threshold creation');
            return;
        }

        // Create tenant context
        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute CreateThreshold command
        const createThresholdCommand = CreateThresholdCommand.create(
            thresholdData.deviceId || null,
            thresholdData.name,
            thresholdData.description,
            thresholdData.metricName,
            thresholdData.operator as any,
            thresholdData.value,
            thresholdData.unit,
            thresholdData.severity,
            thresholdData.type as any,
            thresholdData.cooldownMinutes,
            thresholdData.metadata || {},
            customerId || 'system',
            tenantContext
        );

        const createdThreshold = await commandBus.execute<typeof createThresholdCommand, any>(createThresholdCommand);

        console.log('✅ MONITORING THRESHOLDS POST: Threshold created successfully:', {
            thresholdId: createdThreshold.id,
            name: thresholdData.name,
            metricName: thresholdData.metricName,
            userRole: req.user?.role,
            customerId: req.user?.customerId
        });

        // Convert domain result to API response format
        send.created(res, {
            success: true,
            message: 'Threshold created successfully',
            threshold: {
                id: createdThreshold.id,
                deviceId: createdThreshold.deviceId,
                name: createdThreshold.name,
                description: createdThreshold.description,
                metricName: createdThreshold.metricName,
                operator: createdThreshold.operator,
                value: createdThreshold.value,
                unit: createdThreshold.unit,
                severity: createdThreshold.severity,
                type: createdThreshold.type,
                cooldownMinutes: createdThreshold.cooldownMinutes,
                isEnabled: createdThreshold.isEnabled,
                metadata: createdThreshold.metadata,
                createdAt: createdThreshold.createdAt,
                customerId: createdThreshold.customerId
            },
            timestamp: isoTimestamp()
        });
        return;

    } catch (err) {
        console.error('❌ MONITORING THRESHOLDS POST: Failed to create threshold with DDD:', err);
        send.fromError(res, err);
    }
});
