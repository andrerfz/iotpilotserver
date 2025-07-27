// app/src/app/api/iot/register/route.ts
import {NextRequest} from 'next/server';
import {validateApiKey} from '@/lib/shared/infrastructure/authentication/auth.service';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {
    DeviceRegistrationData,
    RegisterDeviceCompleteCommand
} from '@/lib/device/application/commands/register-device-complete/register-device-complete.command';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {logger} from '@/lib/shared/infrastructure/logging/logger.service';

// Dynamic route: IoT device registration
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Validation schema for IoT device registration (matches device script format)
const v = validator();
const iotDeviceRegistrationSchema = v.object({
    device_id: v.string({ min: 1, message: 'Device ID is required' }),
    hostname: v.string({ min: 1, message: 'Hostname is required' }),
    device_type: v.optional(v.string()),
    device_model: v.optional(v.string()),
    architecture: v.optional(v.string()),
    location: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    mac_address: v.optional(v.string()),
    tailscale_ip: v.optional(v.string()),
    auto_registered: v.optional(v.boolean()),
    registration_time: v.optional(v.string()),
    enhanced_specs: v.optional(v.object({
        cpu_model: v.optional(v.string()),
        total_memory_mb: v.optional(v.number()),
        monitoring_version: v.optional(v.string())
    }))
});

/**
 * POST /api/iot/register - IoT device self-registration endpoint
 * 
 * This endpoint is specifically for IoT devices to self-register using API keys.
 * It differs from /api/devices/register which is for manual user registration via UI.
 * 
 * Authentication: API Key (X-API-Key header)
 * Rate limit: Device registration is not frequently called
 * 
 * @example Device registration:
 * ```bash
 * curl -X POST https://iotpilot.app/api/iot/register \
 *   -H "X-API-Key: local-abc123..." \
 *   -H "Content-Type: application/json" \
 *   -d '{"device_id":"pi-001","hostname":"RaspberryPi-001","device_type":"GENERIC"}'
 * ```
 */
export async function POST(request: NextRequest) {
    try {
        // 1. AUTHENTICATION - Validate API key for device authentication
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '') ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!apiKey) {
            logger.warn('IoT device registration rejected - no API key', {
                endpoint: 'iot/register',
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return ApiResponse.unauthorized('API key required for device registration');
        }

        const { valid, user, apiKeyRecord } = await validateApiKey(apiKey);
        if (!valid || !user || !apiKeyRecord) {
            logger.warn('IoT device registration rejected - invalid API key', {
                endpoint: 'iot/register',
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return ApiResponse.unauthorized('Invalid API key');
        }

        // 2. INPUT VALIDATION
        const body = await request.json();
        const validationResult = iotDeviceRegistrationSchema.safeParse(body);
        
        if (!validationResult.success) {
            logger.warn('IoT device registration validation failed', {
                endpoint: 'iot/register',
                userId: user.id,
                errors: validationResult.errors?.map((e: any) => e.message) || []
            });
            return ApiResponse.badRequest('Invalid device registration data', validationResult.errors);
        }

        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid device registration data');
        }

        const deviceData = validationResult.data;

        // 3. VALIDATE CUSTOMER ID - Use API key's customerId, not user's customerId
        // This allows SUPERADMIN users to create devices for customers using API keys
        const effectiveCustomerId = apiKeyRecord.customerId || user.customerId;
        
        if (!effectiveCustomerId) {
            logger.error('IoT device registration failed - API key has no customer', undefined, {
                endpoint: 'iot/register',
                userId: user.id,
                deviceId: deviceData.device_id,
                apiKeyId: apiKeyRecord.id
            });
            return ApiResponse.forbidden('API key must be associated with a customer');
        }

        // 4. CREATE TENANT CONTEXT
        const tenantContext = TenantContextImpl.create(CustomerId.create(effectiveCustomerId));

        // 5. CREATE DEVICE REGISTRATION DATA
        const registrationData: DeviceRegistrationData = {
            deviceId: deviceData.device_id,
            hostname: deviceData.hostname,
            deviceType: deviceData.device_type || 'GENERIC',
            deviceModel: deviceData.device_model,
            architecture: deviceData.architecture || 'unknown',
            location: deviceData.location,
            ipAddress: deviceData.ip_address,
            tailscaleIp: deviceData.tailscale_ip,
            macAddress: deviceData.mac_address,
            ownerId: user.id, // Device owner is the API key user
            customerId: effectiveCustomerId // Use API key's customerId
        };

        // 6. CREATE AND EXECUTE COMMAND
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const registerDeviceCommand = RegisterDeviceCompleteCommand.create(
            registrationData,
            tenantContext
        );

        logger.info('IoT device registration started', {
            endpoint: 'iot/register',
            deviceId: deviceData.device_id,
            userId: user.id,
            customerId: effectiveCustomerId,
            autoRegistered: deviceData.auto_registered || false
        });

        const registrationResult = await commandBus.execute<typeof registerDeviceCommand, { deviceId: string; message: string; capabilities?: string[] }>(registerDeviceCommand);

        // 7. LOG SUCCESS
        logger.info('IoT device registered successfully', {
            endpoint: 'iot/register',
            deviceId: registrationResult.deviceId,
            userId: user.id,
            customerId: effectiveCustomerId,
            enhanced: !!deviceData.enhanced_specs
        });

        // 8. RETURN RESPONSE (format matches what device expects)
        const response = {
            success: true,
            message: registrationResult.message,
            device: {
                id: registrationResult.deviceId,
                deviceId: registrationResult.deviceId,
                hostname: deviceData.hostname,
                deviceType: deviceData.device_type || 'GENERIC',
                deviceModel: deviceData.device_model || null,
                architecture: deviceData.architecture || null,
                location: deviceData.location || null,
                ipAddress: deviceData.ip_address || null,
                tailscaleIp: deviceData.tailscale_ip || null,
                macAddress: deviceData.mac_address || null,
                status: 'ONLINE',
                autoRegistered: deviceData.auto_registered || true,
                registeredAt: new Date().toISOString(),
                owner: {
                    id: user.id,
                    email: user.email
                },
                customer: {
                    id: effectiveCustomerId
                },
                capabilities: registrationResult.capabilities || [],
                enhancedMonitoring: !!deviceData.enhanced_specs,
                enhancedSpecs: deviceData.enhanced_specs || null
            },
            registrationId: registrationResult.deviceId,
            timestamp: new Date().toISOString()
        };

        return ApiResponse.created(response);

    } catch (error) {
        logger.error('Failed to register IoT device', error instanceof Error ? error : undefined);
        
        if (error instanceof Error) {
            // Handle specific domain errors
            if (error.message.includes('already exists')) {
                // Device already exists - this is actually OK for IoT devices
                // Return success so the device can continue with heartbeats
                logger.info('IoT device already registered, returning success', {
                    endpoint: 'iot/register'
                });
                return ApiResponse.ok({
                    success: true,
                    message: 'Device already registered',
                    device: {
                        deviceId: (error as any).deviceId || 'unknown',
                        status: 'ONLINE'
                    }
                });
            }
            if (error.message.includes('Tenant access violation')) {
                return ApiResponse.forbidden('Access denied - device belongs to different customer');
            }
            if (error.message.includes('validation') || error.message.includes('required')) {
                return ApiResponse.badRequest(error.message);
            }
        }

        return ApiResponse.internalError('Failed to register device');
    }
}
