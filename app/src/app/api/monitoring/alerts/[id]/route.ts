// app/src/app/api/monitoring/alerts/[id]/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetAlertDetailsQuery} from '@/lib/monitoring/application/queries/get-alert-details/get-alert-details.query';
import {
    AcknowledgeAlertCommand
} from '@/lib/monitoring/application/commands/acknowledge-alert/acknowledge-alert.command';
import {ResolveAlertCommand} from '@/lib/monitoring/application/commands/resolve-alert/resolve-alert.command';
import {DeleteAlertCommand} from '@/lib/monitoring/application/commands/delete-alert/delete-alert.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Validation schema for alert actions
const v = validator();
const alertActionSchema = v.object({
    action: v.enum(['acknowledge', 'resolve'] as const)
});

// GET /api/monitoring/alerts/:id - Get alert details using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING ALERT GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract alert ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const alertId = urlParts[urlParts.indexOf('alerts') + 1];

        console.log('📋 MONITORING ALERT GET: Query params:', {
            alertId,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Get tenant ID - use customer ID from user context
        const tenantId = request.user?.customerId;
        if (!tenantId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for alert access');
        }

        // Create and execute GetAlertDetails query
        const getAlertDetailsQuery = GetAlertDetailsQuery.create(
            alertId,
            tenantId || 'system' // Use 'system' for SUPERADMIN without specific tenant
        );

        const alertDetails = await queryBus.execute(getAlertDetailsQuery);

        if (!alertDetails) {
            return ApiResponse.notFound('Alert not found');
        }

        console.log('✅ MONITORING ALERT GET: Alert details retrieved successfully:', {
            alertId,
            severity: alertDetails.severity,
            status: alertDetails.status,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            id: alertDetails.id,
            deviceId: alertDetails.deviceId,
            thresholdId: alertDetails.thresholdId,
            title: alertDetails.title,
            message: alertDetails.message,
            severity: alertDetails.severity,
            status: alertDetails.status,
            metadata: alertDetails.metadata || {},
            createdAt: alertDetails.createdAt,
            acknowledgedAt: alertDetails.acknowledgedAt || null,
            acknowledgedBy: alertDetails.acknowledgedBy || null,
            resolvedAt: alertDetails.resolvedAt || null,
            resolvedBy: alertDetails.resolvedBy || null,
            customerId: alertDetails.customerId,
            device: alertDetails.device ? {
                id: alertDetails.device.id,
                name: alertDetails.device.name,
                type: alertDetails.device.type,
                status: alertDetails.device.status
            } : null,
            threshold: alertDetails.threshold ? {
                id: alertDetails.threshold.id,
                name: alertDetails.threshold.name,
                metric: alertDetails.threshold.metric,
                value: alertDetails.threshold.value,
                operator: alertDetails.threshold.operator
            } : null,
            timeline: alertDetails.timeline || [],
            timestamp: new Date().toISOString()
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ MONITORING ALERT GET: Failed to fetch alert details with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Alert not found');
            }
            if (error.message.includes('Tenant access violation') || error.message.includes('access denied')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to fetch alert details');
    }
}, ServiceContainer.getInstance().getQueryBus());

// PUT /api/monitoring/alerts/:id - Update alert status (acknowledge/resolve) using DDD architecture
export const PUT = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING ALERT PUT: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        // Extract alert ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const alertId = urlParts[urlParts.indexOf('alerts') + 1];
        const body = await request.json();

        console.log('📋 MONITORING ALERT PUT: Update alert request:', {
            alertId,
            action: body.action,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Validate request body
        const validationResult = alertActionSchema.safeParse(body);
        if (!validationResult.success) {
            return ApiResponse.badRequest('Invalid alert action', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid alert action');
        }

        const { action } = validationResult.data;

        // Get tenant ID - use customer ID from user context
        const customerId = request.user?.customerId;
        if (!customerId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for alert actions');
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        let result: any;

        // Execute the appropriate command based on action
        if (action === 'acknowledge') {
            const acknowledgeAlertCommand = AcknowledgeAlertCommand.create(
                alertId,
                request.user!.id,
                customerId || 'system',
                tenantContext
            );

            result = await commandBus.execute(acknowledgeAlertCommand);

            console.log('✅ MONITORING ALERT PUT: Alert acknowledged successfully:', {
                alertId,
                userId: request.user!.id,
                customerId: request.user?.customerId
            });
        } else if (action === 'resolve') {
            const resolveAlertCommand = ResolveAlertCommand.create(
                alertId,
                request.user!.id,
                customerId || 'system',
                tenantContext
            );

            result = await commandBus.execute(resolveAlertCommand);

            console.log('✅ MONITORING ALERT PUT: Alert resolved successfully:', {
                alertId,
                userId: request.user!.id,
                customerId: request.user?.customerId
            });
        }

        // Convert domain result to API response format
        const response = {
            success: true,
            message: `Alert ${action}d successfully`,
            alert: {
                id: result.id,
                status: result.status,
                acknowledgedAt: result.acknowledgedAt || null,
                acknowledgedBy: result.acknowledgedBy || null,
                resolvedAt: result.resolvedAt || null,
                resolvedBy: result.resolvedBy || null,
                updatedAt: result.updatedAt
            },
            action,
            actionBy: {
                id: request.user!.id,
                email: request.user!.email,
                username: request.user!.username
            },
            timestamp: new Date().toISOString()
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ MONITORING ALERT PUT: Failed to update alert with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Alert not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('already acknowledged') || error.message.includes('already resolved')) {
                return ApiResponse.conflict(error.message);
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to update alert');
    }
}, ServiceContainer.getInstance().getQueryBus());

// DELETE /api/monitoring/alerts/[id] - Delete alert using DDD architecture
export const DELETE = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🗑️ MONITORING ALERT DELETE: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        // Extract alert ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const alertId = urlParts[urlParts.indexOf('alerts') + 1];

        console.log('📋 MONITORING ALERT DELETE: Delete alert request:', {
            alertId,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Get tenant ID - use customer ID from user context
        const customerId = request.user?.customerId;
        if (!customerId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for alert deletion');
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute DeleteAlert command
        const deleteAlertCommand = DeleteAlertCommand.create(
            alertId,
            request.user!.id,
            customerId || 'system',
            tenantContext
        );

        await commandBus.execute(deleteAlertCommand);

        console.log('✅ MONITORING ALERT DELETE: Alert deleted successfully:', {
            alertId,
            userId: request.user!.id,
            customerId: request.user?.customerId
        });

        // Return success response
        const response = {
            success: true,
            message: 'Alert deleted successfully',
            alertId,
            deletedBy: {
                id: request.user!.id,
                email: request.user!.email,
                username: request.user!.username
            },
            timestamp: new Date().toISOString()
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ MONITORING ALERT DELETE: Failed to delete alert with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Alert not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to delete alert');
    }
}, ServiceContainer.getInstance().getQueryBus());