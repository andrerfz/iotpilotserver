// app/src/app/api/devices/bulk/route.ts
import {AuthenticatedRequest, withAuthMiddleware} from '@/lib/shared/infrastructure/middleware/auth-middleware';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {
    BulkRegisterDevicesCommand,
    DeviceRegistrationData
} from '@/lib/device/application/commands/bulk-register-devices/bulk-register-devices.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
// Note: Array min validation not yet in ValidationService - using Zod for now
import {z} from 'zod'; // Keep for array min validation

// Validation schema for bulk device registration
const v = validator();
const deviceRegistrationSchema = v.object({
    name: v.string({ min: 1, message: 'Device name is required' }),
    ipAddress: v.string({ ip: true, message: 'Valid IP address is required' }),
    sshUsername: v.string({ min: 1, message: 'SSH username is required' }),
    sshPassword: v.default(v.optional(v.string()), ''), // Password can be empty for key-based auth
    sshPort: v.default(v.number({ min: 1, max: 65535, int: true, message: 'SSH port must be between 1 and 65535' }), 22)
});

const bulkRegistrationSchemaZod = z.object({
    devices: z.array(z.any()).min(1, 'At least one device is required'),
    customerId: z.string().optional()
});
const bulkRegistrationSchema = (v as any).fromZodSchema(bulkRegistrationSchemaZod);

// POST /api/devices/bulk - Register multiple devices using DDD architecture
export const POST = withAuthMiddleware(async (
    request: AuthenticatedRequest
) => {
    try {
        console.log('🔐 DEVICE BULK REGISTER POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = await request.json();

        console.log('📋 DEVICE BULK REGISTER POST: Bulk registration request:', {
            deviceCount: body.devices?.length || 0,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Validate request body
        const validationResult = bulkRegistrationSchema.safeParse(body);
        if (!validationResult.success) {
            return ApiResponse.badRequest('Invalid bulk registration data', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid bulk registration data');
        }

        const { devices, customerId } = validationResult.data;

        // Set customerId from user context if not provided
        const finalCustomerId = customerId || request.user?.customerId;
        if (!finalCustomerId) {
            return ApiResponse.badRequest('Customer ID is required for device registration');
        }

        // Create tenant context
        const tenantContext = request.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(request.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // Prepare device registration data
        const deviceRegistrationData: DeviceRegistrationData[] = devices.map((device: any) => ({
            name: device.name,
            ipAddress: device.ipAddress,
            sshUsername: device.sshUsername,
            sshPassword: device.sshPassword || '',
            sshPort: device.sshPort
        }));

        // Create and execute BulkRegisterDevices command
        const bulkRegisterCommand = BulkRegisterDevicesCommand.create(
            deviceRegistrationData,
            finalCustomerId,
            tenantContext
        );

        const bulkRegistrationResult = await commandBus.execute<typeof bulkRegisterCommand, { successful: any[]; failed: Array<{data: {name: string; ipAddress: string}; error: string}> }>(bulkRegisterCommand);

        console.log('✅ DEVICE BULK REGISTER POST: Bulk registration completed:', {
            totalDevices: deviceRegistrationData.length,
            successfulRegistrations: bulkRegistrationResult.successful.length,
            failedRegistrations: bulkRegistrationResult.failed.length,
            userRole: request.user?.role,
            customerId: request.user?.customerId
        });

        // Convert domain result to API response format
        const response = {
            success: true,
            message: `Bulk registration completed. ${bulkRegistrationResult.successful.length}/${deviceRegistrationData.length} devices registered successfully.`,
            summary: {
                total: deviceRegistrationData.length,
                totalDevices: deviceRegistrationData.length,
                successful: bulkRegistrationResult.successful.length,
                failed: bulkRegistrationResult.failed.length
            },
            results: {
                successful: bulkRegistrationResult.successful.map(device => ({
                    id: device.id.getValue(),
                    deviceId: device.id.getValue(), // Use id as deviceId for API compatibility
                    hostname: device.name.getValue(),
                    ipAddress: device.ipAddress.getValue(),
                    status: device.status.getValue(),
                    registeredAt: device.createdAt,
                    registrationId: device.id.getValue() // Use device ID as registration ID
                })),
                failed: bulkRegistrationResult.failed.map(failure => ({
                    deviceName: failure.data.name,
                    ipAddress: failure.data.ipAddress,
                    error: failure.error,
                    reason: failure.error // Use error as reason
                }))
            },
            timestamp: new Date().toISOString()
        };

        // Return 207 Multi-Status if there were partial failures, 201 if all successful
        if (bulkRegistrationResult.failed.length > 0) {
            return ApiResponse.error('Bulk registration completed with some failures', 207, {
                details: response
            });
        }
        return ApiResponse.created(response);

    } catch (error) {
        console.error('❌ DEVICE BULK REGISTER POST: Failed to register devices in bulk with DDD:', error);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('At least one device is required')) {
                return ApiResponse.badRequest('At least one device is required for bulk registration');
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied');
            }
            if (error.message.includes('validation') || error.message.includes('invalid')) {
                return ApiResponse.badRequest(error.message);
            }
            if (error.message.includes('Customer ID is required')) {
                return ApiResponse.badRequest('Customer ID is required but not provided');
            }
        }

        return ApiResponse.internalError('Failed to register devices in bulk', error instanceof Error ? error.message : 'Unknown error');
    }
}, ServiceContainer.getInstance().getQueryBus());