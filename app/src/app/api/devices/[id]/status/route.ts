// app/src/app/api/devices/[id]/status/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetDeviceStatusQuery} from '@/lib/device/application/queries/get-device-status/get-device-status.query';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// GET /api/devices/:id/status - Get device status using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 DEVICE STATUS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract device ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const deviceId = urlParts[urlParts.indexOf('devices') + 1];
        const searchParams = new URL(request.url).searchParams;

        // Parse query parameters
        const includeMetrics = searchParams.get('metrics') !== 'false'; // default to true

        console.log('📋 DEVICE STATUS GET: Query params:', {
            deviceId,
            includeMetrics,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute GetDeviceStatus query
        const getDeviceStatusQuery = GetDeviceStatusQuery.create(
            deviceId,
            includeMetrics,
            request.user?.customerId || undefined,
            tenantContext
        );

        const deviceStatus = await queryBus.execute(getDeviceStatusQuery);

        console.log('✅ DEVICE STATUS GET: Device status retrieved successfully:', {
            deviceId,
            status: deviceStatus.status,
            isOnline: deviceStatus.connectivity?.isOnline,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format (handle both domain entities and mock responses)
        const response = {
            device: {
                id: deviceStatus.device?.id || deviceStatus.deviceId,
                deviceId: deviceStatus.device?.deviceId || deviceStatus.deviceId,
                hostname: deviceStatus.device?.hostname || deviceStatus.deviceName,
                status: deviceStatus.device?.status || deviceStatus.status,
                lastSeen: deviceStatus.device?.lastSeen || deviceStatus.lastSeen,
                lastBoot: deviceStatus.device?.lastBoot || null,
                uptime: deviceStatus.device?.uptime || null
            },
            connectivity: {
                isOnline: deviceStatus.connectivity?.isOnline || false,
                ping: deviceStatus.connectivity?.ping || null,
                ssh: deviceStatus.connectivity?.ssh || null,
                agent: deviceStatus.connectivity?.agent || null
            },
            metrics: includeMetrics ? {
                cpu: deviceStatus.latestMetrics?.cpu || deviceStatus.metrics?.cpu || null,
                memory: deviceStatus.latestMetrics?.memory || deviceStatus.metrics?.memory || null,
                disk: deviceStatus.latestMetrics?.disk || deviceStatus.metrics?.disk || null,
                network: deviceStatus.latestMetrics?.network || deviceStatus.metrics?.network || null,
                temperature: deviceStatus.latestMetrics?.temperature || null,
                lastUpdated: deviceStatus.latestMetrics?.lastUpdated || null
            } : null,
            health: {
                overall: deviceStatus.health?.overall || 'unknown',
                services: deviceStatus.health?.services || [],
                alerts: deviceStatus.health?.alerts || []
            },
            timestamp: new Date().toISOString()
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ DEVICE STATUS GET: Failed to fetch device status with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to fetch device status');
    }
}, ServiceContainer.getInstance().getQueryBus());