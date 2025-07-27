import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ListDevicesQuery} from '@/lib/device/application/queries/list-devices/list-devices.query';
import {
    DeviceRegistrationData,
    RegisterDeviceCompleteCommand
} from '@/lib/device/application/commands/register-device-complete/register-device-complete.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {Pagination} from '@/lib/shared/infrastructure/http/pagination.util';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod';

// Dynamic route: uses auth and cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const v = validator();
const deviceRegistrationSchema = v.object({
    device_id: v.string({ min: 1, message: 'Device ID is required' }),
    hostname: v.string({ min: 1, message: 'Hostname is required' }),
    device_type: v.string({ min: 1, message: 'Device type is required' }),
    device_model: v.optional(v.string()),
    architecture: v.string({ min: 1, message: 'Architecture is required' }),
    location: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    tailscale_ip: v.optional(v.string()),
    mac_address: v.optional(v.string())
});

// GET /api/devices - List all devices using DDD architecture
export const GET = withAuthMiddleware(async (request: AuthenticatedRequest) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract query parameters
        const url = new URL(request.url);
        const statusParam = url.searchParams.get('status') || 'all';
        const status = ['active', 'inactive', 'all'].includes(statusParam) ? statusParam as 'active' | 'inactive' | 'all' : 'all';
        const search = url.searchParams.get('search') || '';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const offset = (page - 1) * limit;
        const sortBy = url.searchParams.get('sortBy') || 'name';
        const sortDirection = url.searchParams.get('sortDirection') || 'asc';

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute ListDevices query
        const listDevicesQuery = ListDevicesQuery.create(
            {
                status: status === 'all' ? undefined : status,
                search,
                limit,
                offset,
                sortBy,
                sortDirection: sortDirection as 'asc' | 'desc'
            },
            request.user?.customerId || undefined,
            tenantContext
        );

        const deviceListResult = await queryBus.execute(listDevicesQuery);

        // Convert DeviceDto objects to API response format
        const formattedDevices = deviceListResult.devices.map((device: any) => ({
            id: device.id,
            deviceId: device.id, // Using id as deviceId for backward compatibility
            hostname: device.hostname,
            name: device.name,
            deviceType: 'Unknown', // Not available in current entity - would need to be added if needed
            deviceModel: null,
            architecture: null,
            location: null,
            description: null,
            ipAddress: device.ipAddress,
            tailscaleIp: device.tailscaleIp,
            macAddress: null,
            status: device.status?.value || 'UNKNOWN',
            lastSeen: device.lastSeen,
            lastBoot: null,
            uptime: null,
            cpuUsage: null,
            cpuTemp: null,
            memoryUsage: null,
            memoryTotal: null,
            diskUsage: null,
            diskTotal: null,
            loadAverage: null,
            appStatus: device.status?.value || 'UNKNOWN',
            agentVersion: null,
            registeredAt: device.createdAt,
            updatedAt: device.updatedAt,
            isOnline: device.isOnline,
            isActive: device.isActive,
            connectionQuality: device.connectionQuality,
            user: null,
            customer: device.customerId ? {
                id: device.customerId,
                name: 'Customer',
                slug: 'customer'
            } : null,
            alertsCount: 0
        }));

        // Calculate stats based on online status
        const stats = {
            total: deviceListResult.total,
            online: formattedDevices.filter((d: any) => d.isOnline).length,
            offline: formattedDevices.filter((d: any) => !d.isOnline).length,
            maintenance: 0,
            error: 0
        };

        // Create standardized pagination
        const pagination = Pagination.create(page, limit, deviceListResult.total);

        return ApiResponse.okPaginated(formattedDevices, pagination, undefined, { stats });

    } catch (error) {
        console.error('Failed to fetch devices with DDD:', error);
        return ApiResponse.internalError('Failed to fetch devices');
    }
}, ServiceContainer.getInstance().getQueryBus());

// POST /api/devices - Register new device using DDD architecture with dual authentication
export const POST = withAuthMiddleware(async (request: AuthenticatedRequest) => {
    try {
        process.stdout.write(`🔍 DEVICES POST: Route handler started\n`);

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();
        process.stdout.write(`🔍 DEVICES POST: Got commandBus\n`);

        // Use authenticated user from middleware
        const authUser = request.user;
        process.stdout.write(`🔍 DEVICES POST: Got authUser: ${authUser?.id}\n`);

        const body = await request.json();
        process.stdout.write(`🔍 DEVICES POST: Parsed body\n`);
        const data = deviceRegistrationSchema.parse(body);
        process.stdout.write(`🔍 DEVICES POST: Validated data\n`);

        // CRITICAL: Ensure user has a customerId (except SUPERADMIN)
        if (!authUser?.customerId && authUser?.role !== 'SUPERADMIN') {
            console.error('🚨 DEVICES POST: User lacks customerId:', {
                userId: authUser?.id,
                email: authUser?.email,
                role: authUser?.role,
                customerId: authUser?.customerId
            });
            return ApiResponse.badRequest('Missing customer context. Please contact support.');
        }

        // For SUPERADMIN without customerId, require explicit customerId in request
        let targetCustomerId: string | null = authUser?.customerId || null;
        if (authUser?.role === 'SUPERADMIN' && !targetCustomerId) {
            const explicitCustomerId = request.headers.get('x-target-customer-id') ||
                body.customerId;
            if (explicitCustomerId) {
                targetCustomerId = explicitCustomerId;
            } else {
                return ApiResponse.badRequest('SUPERADMIN must specify target customerId');
            }
        }

        // Create tenant context
        const tenantContext = targetCustomerId
            ? TenantContextImpl.create(CustomerId.create(targetCustomerId))
            : TenantContextImpl.createSuperAdmin();

        // Prepare device registration data
        const deviceData: DeviceRegistrationData = {
            deviceId: data.device_id,
            hostname: data.hostname,
            deviceType: data.device_type,
            deviceModel: data.device_model,
            architecture: data.architecture,
            location: data.location,
            ipAddress: data.ip_address,
            tailscaleIp: data.tailscale_ip,
            macAddress: data.mac_address,
            ownerId: authUser?.id!,
            customerId: targetCustomerId!
        };

        // Create and execute RegisterDeviceComplete command
        process.stdout.write(`🔍 DEVICES POST: Creating RegisterDeviceCompleteCommand...\n`);
        const registerCommand = RegisterDeviceCompleteCommand.create(
            deviceData,
            tenantContext
        );
        process.stdout.write(`🔍 DEVICES POST: Command created, executing via commandBus...\n`);

        const registrationResult = await commandBus.execute<typeof registerCommand, { deviceId: string; message: string; capabilities?: string[] }>(registerCommand);
        process.stdout.write(`🔍 DEVICES POST: Command executed successfully\n`);

        return ApiResponse.created({
            device: {
                id: registrationResult.deviceId,
                deviceId: registrationResult.deviceId,
                hostname: deviceData.hostname,
                deviceType: deviceData.deviceType,
                customerId: targetCustomerId!,
                status: 'ONLINE'
            },
            message: registrationResult.message,
            capabilities: registrationResult.capabilities
        });

    } catch (error) {
        console.error('❌ DEVICES POST: Failed to register device with DDD:', error);
        process.stdout.write(`❌ DEVICES POST: Exception: ${(error as any)?.message}\n`);
        process.stdout.write(`❌ DEVICES POST: Stack: ${(error as any)?.stack}\n`);
        
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Validation failed', error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message
            })));
        }
        
        // Handle command validation errors (like empty device ID)
        if ((error as any)?.message && ((error as any).message.includes('Device ID is required') || (error as any).message.includes('required'))) {
            return ApiResponse.badRequest('Validation failed', [{ message: (error as any).message }]);
        }
        
        if (error instanceof Error) {
            // Handle specific validation errors
            if (error.message.includes('already exists')) {
                return ApiResponse.conflict(error.message);
            }
            if (error.message.includes('required') || error.message.includes('Tenant access violation') || error.message.includes('Invalid')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to register device');
    }
}, ServiceContainer.getInstance().getQueryBus());
