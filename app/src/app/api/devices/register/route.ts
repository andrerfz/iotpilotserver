// app/src/app/api/devices/register/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {
    DeviceRegistrationData,
    RegisterDeviceCompleteCommand
} from '@/lib/device/application/commands/register-device-complete/register-device-complete.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';

// Validation schema for device registration
const v = validator();
const deviceRegistrationSchema = v.object({
    deviceId: v.string({ min: 1, message: 'Device ID is required' }),
    hostname: v.string({ min: 1, message: 'Hostname is required' }),
    deviceType: v.string({ min: 1, message: 'Device type is required' }),
    deviceModel: v.optional(v.string()),
    architecture: v.string({ min: 1, message: 'Architecture is required' }),
    location: v.optional(v.string()),
    ipAddress: v.optional(v.string({ ip: true })),
    tailscaleIp: v.optional(v.string({ ip: true })),
    macAddress: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    customerId: v.optional(v.string()) // Will be set from user context if not provided
});

// POST /api/devices/register - Register a new device using DDD architecture
export const POST = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 DEVICE REGISTER POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = await request.json();

        console.log('📋 DEVICE REGISTER POST: Registration request:', {
            deviceId: body.deviceId,
            hostname: body.hostname,
            deviceType: body.deviceType,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Validate request body
        const validationResult = deviceRegistrationSchema.safeParse(body);
        if (!validationResult.success) {
            return ApiResponse.badRequest('Invalid device registration data', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid device registration data');
        }

        const deviceData = validationResult.data;

        // Set customerId from user context if not provided
        if (!deviceData.customerId) {
            if (!request.user?.customerId) {
                return ApiResponse.badRequest('Customer ID is required for device registration');
            }
            deviceData.customerId = request.user.customerId;
        }

        // Set ownerId from user context if not provided
        if (!deviceData.ownerId) {
            deviceData.ownerId = request.user?.id;
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Create device registration data
        const registrationData: DeviceRegistrationData = {
            deviceId: deviceData.deviceId,
            hostname: deviceData.hostname,
            deviceType: deviceData.deviceType,
            deviceModel: deviceData.deviceModel,
            architecture: deviceData.architecture,
            location: deviceData.location,
            ipAddress: deviceData.ipAddress,
            tailscaleIp: deviceData.tailscaleIp,
            macAddress: deviceData.macAddress,
            ownerId: deviceData.ownerId,
            customerId: deviceData.customerId
        };

        // Create and execute RegisterDeviceComplete command
        const registerDeviceCommand = RegisterDeviceCompleteCommand.create(
            registrationData,
            tenantContext
        );

        const registrationResult = await commandBus.execute<typeof registerDeviceCommand, { deviceId: string; message: string; capabilities?: string[] }>(registerDeviceCommand);

        console.log('✅ DEVICE REGISTER POST: Device registered successfully:', {
            deviceId: registrationResult.deviceId,
            message: registrationResult.message,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            success: true,
            message: registrationResult.message,
            device: {
                id: registrationResult.deviceId,
                deviceId: registrationResult.deviceId,
                hostname: deviceData.hostname,
                deviceType: deviceData.deviceType,
                deviceModel: deviceData.deviceModel || null,
                architecture: deviceData.architecture || null,
                location: deviceData.location || null,
                ipAddress: deviceData.ipAddress || null,
                tailscaleIp: deviceData.tailscaleIp || null,
                macAddress: deviceData.macAddress || null,
                status: 'ONLINE', // Default status from handler
                registeredAt: new Date().toISOString(),
                owner: deviceData.ownerId ? {
                    id: deviceData.ownerId
                } : null,
                customer: {
                    id: deviceData.customerId
                },
                capabilities: registrationResult.capabilities || []
            },
            registrationId: registrationResult.deviceId, // Use deviceId as registrationId
            timestamp: new Date().toISOString()
        };

        return ApiResponse.created(response);

    } catch (error) {
        console.error('❌ DEVICE REGISTER POST: Failed to register device with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('already exists')) {
                return ApiResponse.conflict('Device with this ID already exists');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to register device');
    }
}, ServiceContainer.getInstance().getQueryBus());