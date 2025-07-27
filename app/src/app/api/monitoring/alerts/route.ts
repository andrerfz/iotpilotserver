// app/src/app/api/monitoring/alerts/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {ListAlertsQuery} from '@/lib/monitoring/application/queries/list-alerts/list-alerts.query';
import {CreateAlertCommand} from '@/lib/monitoring/application/commands/create-alert/create-alert.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {Pagination} from '@/lib/shared/infrastructure/http/pagination.util';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Validation schema for alert creation
const v = validator();
const createAlertSchema = v.object({
    deviceId: v.string({ min: 1, message: 'Device ID is required' }),
    thresholdId: v.string({ min: 1, message: 'Threshold ID is required' }),
    title: v.string({ min: 1, message: 'Alert title is required' }),
    message: v.string({ min: 1, message: 'Alert message is required' }),
    severity: v.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
    metadata: v.default(v.optional(v.record(v.string(), v.any())), {})
});

// GET /api/monitoring/alerts - List alerts using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING ALERTS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const searchParams = new URL(request.url).searchParams;

        // Parse query parameters
        const deviceId = searchParams.get('deviceId');
        const severity = searchParams.get('severity') as any;
        const status = searchParams.get('status') as any;
        const startTimeParam = searchParams.get('startTime');
        const endTimeParam = searchParams.get('endTime');
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

        console.log('📋 MONITORING ALERTS GET: Query params:', {
            deviceId,
            severity,
            status,
            startTime: startTimeParam,
            endTime: endTimeParam,
            limit,
            offset,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Parse time range if provided
        let startTime: Date | undefined;
        let endTime: Date | undefined;

        if (startTimeParam) {
            startTime = new Date(startTimeParam);
            if (isNaN(startTime.getTime())) {
                return ApiResponse.badRequest('Invalid startTime format');
            }
        }

        if (endTimeParam) {
            endTime = new Date(endTimeParam);
            if (isNaN(endTime.getTime())) {
                return ApiResponse.badRequest('Invalid endTime format');
            }
        }

        // Validate date range
        if (startTime && endTime && startTime >= endTime) {
            return ApiResponse.badRequest('Start time must be before end time');
        }

        // Get tenant ID - use customer ID from user context
        const tenantId = request.user?.customerId;
        if (!tenantId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for alerts access');
        }

        // Create and execute ListAlerts query
        const listAlertsQuery = ListAlertsQuery.create(
            tenantId || 'system', // Use 'system' for SUPERADMIN without specific tenant
            deviceId || undefined,
            severity || undefined,
            status || undefined,
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
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const alerts = alertsResult.alerts || [];
        
        // Create standardized pagination (using offset-based, converting to page-based)
        const page = Math.floor(offset / limit) + 1;
        const pagination = Pagination.fromOffset(offset, limit, alertsResult.total || 0);

        return ApiResponse.okPaginated(alerts, pagination, undefined, {
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

    } catch (error) {
        console.error('❌ MONITORING ALERTS GET: Failed to fetch alerts with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Tenant access violation') || error.message.includes('access denied')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Alerts not found');
            }
        }

        return ApiResponse.internalError('Failed to fetch alerts');
    }
}, ServiceContainer.getInstance().getQueryBus());

// POST /api/monitoring/alerts - Create new alert using DDD architecture
export const POST = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING ALERTS POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = await request.json();

        console.log('📋 MONITORING ALERTS POST: Create alert request:', {
            deviceId: body.deviceId,
            severity: body.severity,
            title: body.title,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Validate request body
        const validationResult = createAlertSchema.safeParse(body);
        if (!validationResult.success) {
            return ApiResponse.badRequest('Invalid alert data', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid alert data');
        }

        const alertData = validationResult.data;

        // Get tenant ID - use customer ID from user context
        const customerId = request.user?.customerId;
        if (!customerId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for alert creation');
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
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
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            success: true,
            message: 'Alert created successfully',
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
            },
            timestamp: new Date().toISOString()
        };

        return ApiResponse.created({
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

    } catch (error) {
        console.error('❌ MONITORING ALERTS POST: Failed to create alert with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('Device not found') || error.message.includes('Threshold not found')) {
                return ApiResponse.notFound(error.message);
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to create alert');
    }
}, ServiceContainer.getInstance().getQueryBus());