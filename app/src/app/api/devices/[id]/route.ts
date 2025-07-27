// app/src/app/api/devices/[id]/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {GetDeviceQuery} from '@/lib/device/application/queries/get-device/get-device.query';
import {Device} from '@/lib/device/domain/entities/device.entity';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {DeviceId} from '@/lib/device/domain/value-objects/device-id.vo';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/devices/:id - Get device details using DDD architecture
export const GET = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        // Extract device ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const deviceId = urlParts[urlParts.indexOf('devices') + 1];

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create and execute GetDevice query
        const getDeviceQuery = GetDeviceQuery.create(
            deviceId,
            request.user?.customerId || undefined,
            tenantContext
        );

        const device = await queryBus.execute(getDeviceQuery);

        if (!device) {
            return ApiResponse.notFound('Device not found');
        }

        // Convert domain entity to API response format (handle both domain entities and raw objects)
        const response = {
            id: device.id?.getValue ? device.id.getValue() : device.id,
            deviceId: device.deviceId?.getValue ? device.deviceId.getValue() : device.deviceId,
            hostname: device.name?.getValue ? device.name.getValue() : device.hostname,
            deviceType: device.type?.getValue ? device.type.getValue() : device.deviceType,
            deviceModel: device.model?.getValue ? device.model.getValue() : device.deviceModel,
            architecture: device.architecture?.getValue ? device.architecture.getValue() : device.architecture,
            location: device.location?.getValue ? device.location.getValue() : device.location,
            description: device.description?.getValue ? device.description.getValue() : device.description,
            ipAddress: device.ipAddress?.getValue ? device.ipAddress.getValue() : device.ipAddress,
            tailscaleIp: device.tailscaleIp?.getValue ? device.tailscaleIp.getValue() : device.tailscaleIp,
            macAddress: device.macAddress?.getValue ? device.macAddress.getValue() : device.macAddress,
            status: device.status?.getValue ? device.status.getValue() : device.status,
            lastSeen: device.lastSeen,
            lastBoot: device.lastBoot,
            uptime: device.uptime,
            cpuUsage: device.metrics?.cpuUsage || device.cpuUsage || null,
            cpuTemp: device.metrics?.cpuTemp || device.cpuTemp || null,
            memoryUsage: device.metrics?.memoryUsage || device.memoryUsage || null,
            memoryTotal: device.metrics?.memoryTotal || device.memoryTotal || null,
            diskUsage: device.metrics?.diskUsage || device.diskUsage || null,
            diskTotal: device.metrics?.diskTotal || device.diskTotal || null,
            loadAverage: device.metrics?.loadAverage || device.loadAverage || null,
            appStatus: device.status?.getValue ? device.status.getValue() : device.status,
            agentVersion: device.agentVersion?.getValue ? device.agentVersion.getValue() : device.agentVersion,
            registeredAt: device.createdAt || device.registeredAt,
            updatedAt: device.updatedAt,
            user: device.ownerId ? {
                id: device.ownerId?.getValue ? device.ownerId.getValue() : device.ownerId,
                username: device.ownerName || 'Unknown',
                email: device.ownerEmail || 'unknown@example.com'
            } : null,
            customer: device.customerId ? {
                id: device.customerId?.getValue ? device.customerId.getValue() : device.customerId,
                name: 'Customer',
                slug: 'customer'
            } : null,
            alertsCount: 0 // TODO: Implement alerts count via separate query
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ DEVICE GET: Failed to fetch device details with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to fetch device details');
    }
}, ServiceContainer.getInstance().getQueryBus());

// PUT /api/devices/:id - Update device information using DDD architecture
export const PUT = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        // Extract device ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const deviceId = urlParts[urlParts.indexOf('devices') + 1];
        const body = await request.json();

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Import UpdateDevice command here to avoid circular imports
        const { UpdateDeviceCommand } = await import('@/lib/device/application/commands/update-device/update-device.command');

        // Create and execute UpdateDevice command
        const updateDeviceCommand = UpdateDeviceCommand.create(
            DeviceId.create(deviceId),
            tenantContext,
            body.hostname,     // name
            body.ipAddress,    // ipAddress
            body.sshUsername,  // sshUsername
            body.sshPassword,  // sshPassword
            body.sshPort ? Number(body.sshPort) : undefined,  // sshPort - convert to number
            request.user?.customerId || undefined
        );

        const updatedDevice = await commandBus.execute<typeof updateDeviceCommand, Device>(updateDeviceCommand);

        // Convert domain entity to API response format
        const response = {
            device: {
                id: updatedDevice.id.getValue(),
                deviceId: updatedDevice.id.getValue(), // Use id as deviceId for API compatibility
                hostname: updatedDevice.name.getValue(),
                ipAddress: updatedDevice.ipAddress?.getValue?.() ?? null,
                status: updatedDevice.status.getValue(),
                registeredAt: updatedDevice.createdAt,
                updatedAt: updatedDevice.updatedAt,
                // SSH credentials info (without exposing sensitive data)
                sshPort: updatedDevice.sshCredentials?.port,
                sshUsername: updatedDevice.sshCredentials?.username
            },
            message: 'Device updated successfully'
        };

        return ApiResponse.ok(response);

    } catch (error) {
        console.error('❌ DEVICE PUT: Failed to update device with DDD:', error);
        process.stdout.write(`❌ DEVICE PUT: Exception: ${(error as any)?.message}\n`);
        process.stdout.write(`❌ DEVICE PUT: Stack: ${(error as any)?.stack}\n`);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('validation')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to update device');
    }
}, ServiceContainer.getInstance().getQueryBus());

// DELETE /api/devices/:id - Delete a device using DDD architecture
export const DELETE = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        // Extract device ID from URL pathname
        const urlParts = new URL(request.url).pathname.split('/');
        const deviceId = urlParts[urlParts.indexOf('devices') + 1];

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Import RemoveDevice command here to avoid circular imports
        const { RemoveDeviceCommand } = await import('@/lib/device/application/commands/remove-device/remove-device.command');

        // Create and execute RemoveDevice command
        const removeDeviceCommand = RemoveDeviceCommand.create(
            deviceId,
            request.user?.customerId || undefined,
            tenantContext
        );

        await commandBus.execute(removeDeviceCommand);

        return ApiResponse.ok({ message: 'Device deleted successfully' });

    } catch (error) {
        console.error('❌ DEVICE DELETE: Failed to delete device with DDD:', error);
        process.stdout.write(`❌ DEVICE DELETE: Exception: ${(error as any)?.message}\n`);
        process.stdout.write(`❌ DEVICE DELETE: Stack: ${(error as any)?.stack}\n`);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('not found')) {
                return ApiResponse.notFound('Device not found');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
        }

        return ApiResponse.internalError('Failed to delete device');
    }
}, ServiceContainer.getInstance().getQueryBus());