// app/src/app/api/monitoring/thresholds/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetThresholdsQuery} from '@/lib/monitoring/application/queries/get-thresholds/get-thresholds.query';
import {CreateThresholdCommand} from '@/lib/monitoring/application/commands/create-threshold/create-threshold.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Validation schema for threshold creation
const v = validator();
const createThresholdSchema = v.object({
    deviceId: v.optional(v.nullable(v.string())), // null for global thresholds
    name: v.string({ min: 1, message: 'Threshold name is required' }),
    description: v.string({ min: 1, message: 'Threshold description is required' }),
    metricName: v.string({ min: 1, message: 'Metric name is required' }),
    operator: v.enum(['GREATER_THAN', 'LESS_THAN', 'EQUAL_TO', 'NOT_EQUAL_TO', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL'] as const),
    value: v.number(), // finite check handled by ValidationService
    unit: v.string({ min: 1, message: 'Unit is required' }),
    severity: v.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
    type: v.enum(['STATIC', 'DYNAMIC', 'BASELINE'] as const),
    cooldownMinutes: v.default(v.number({ min: 0, int: true, message: 'Cooldown must be a non-negative integer' }), 5),
    metadata: v.default(v.optional(v.record(v.string(), v.any())), {})
});

// GET /api/monitoring/thresholds - List thresholds using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING THRESHOLDS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const searchParams = new URL(request.url).searchParams;

        // Parse query parameters
        const deviceId = searchParams.get('deviceId');
        const type = searchParams.get('type') as any;
        const metricName = searchParams.get('metricName');
        const severity = searchParams.get('severity') as any;
        const includeDisabled = searchParams.get('includeDisabled') === 'true';

        console.log('📋 MONITORING THRESHOLDS GET: Query params:', {
            deviceId,
            type,
            metricName,
            severity,
            includeDisabled,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Get tenant ID - use customer ID from user context
        const tenantId = request.user?.customerId;
        if (!tenantId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for thresholds access');
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

        const thresholdsResult = await queryBus.execute(getThresholdsQuery);

        console.log('✅ MONITORING THRESHOLDS GET: Thresholds retrieved successfully:', {
            thresholdsCount: thresholdsResult.thresholds?.length || 0,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            thresholds: (thresholdsResult.thresholds || []).map((threshold: any) => ({
                id: threshold.id,
                deviceId: threshold.deviceId,
                name: threshold.name,
                description: threshold.description,
                metricName: threshold.metricName,
                operator: threshold.operator,
                value: threshold.value,
                unit: threshold.unit,
                severity: threshold.severity,
                type: threshold.type,
                cooldownMinutes: threshold.cooldownMinutes,
                isEnabled: threshold.isEnabled,
                metadata: threshold.metadata || {},
                createdAt: threshold.createdAt,
                updatedAt: threshold.updatedAt,
                customerId: threshold.customerId,
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
                totalThresholds: thresholdsResult.thresholds?.length || 0,
                enabledThresholds: (thresholdsResult.thresholds || []).filter((t: any) => t.isEnabled).length,
                disabledThresholds: (thresholdsResult.thresholds || []).filter((t: any) => !t.isEnabled).length,
                typeBreakdown: thresholdsResult.typeBreakdown || {},
                severityBreakdown: thresholdsResult.severityBreakdown || {}
            },
            timestamp: new Date().toISOString()
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ MONITORING THRESHOLDS GET: Failed to fetch thresholds with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Tenant access violation') || error.message.includes('access denied')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Thresholds not found');
            }
        }

        return ApiResponse.internalError('Failed to fetch thresholds');
    }
}, ServiceContainer.getInstance().getQueryBus());

// POST /api/monitoring/thresholds - Create new threshold using DDD architecture
export const POST = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 MONITORING THRESHOLDS POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = await request.json();

        console.log('📋 MONITORING THRESHOLDS POST: Create threshold request:', {
            name: body.name,
            metricName: body.metricName,
            operator: body.operator,
            value: body.value,
            severity: body.severity,
            type: body.type,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Validate request body
        const validationResult = createThresholdSchema.safeParse(body);
        if (!validationResult.success) {
            return ApiResponse.badRequest('Invalid threshold data', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid threshold data');
        }

        const thresholdData = validationResult.data;

        // Get tenant ID - use customer ID from user context
        const customerId = request.user?.customerId;
        if (!customerId && request.user?.role !== 'SUPERADMIN') {
            return ApiResponse.badRequest('Customer ID is required for threshold creation');
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
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
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
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
            timestamp: new Date().toISOString()
        };

        return ApiResponse.created(response);

    } catch (error) {
        console.error('❌ MONITORING THRESHOLDS POST: Failed to create threshold with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('Device not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('already exists')) {
                return ApiResponse.conflict('Threshold with this name already exists');
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to create threshold');
    }
}, ServiceContainer.getInstance().getQueryBus());