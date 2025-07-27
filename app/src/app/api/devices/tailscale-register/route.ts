import {NextRequest} from 'next/server';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {validateApiKey} from '@/lib/shared/infrastructure/authentication/auth.service';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {logger} from '@/lib/shared/infrastructure/logging/logger.service';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod';

// Validation schema for Tailscale device registration
const v = validator();
const tailscaleRegisterSchema = v.object({
    device_id: v.string({ min: 1, message: 'Device ID is required' }),
    hostname: v.string({ min: 1, message: 'Hostname is required' }),
    device_type: v.default(v.optional(v.enum(['PI_ZERO', 'PI_3', 'PI_4', 'PI_5', 'ORANGE_PI', 'GENERIC', 'UNKNOWN'] as const)), 'UNKNOWN'),
    device_model: v.optional(v.string()),
    architecture: v.default(v.optional(v.string()), 'unknown'),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    mac_address: v.optional(v.string()),
    capabilities: v.default(v.optional(v.record(v.string(), v.any())), {})
});

/**
 * POST /api/devices/tailscale-register - Enhanced device registration with Tailscale metadata
 * Uses CQRS pattern with proper validation
 */
export async function POST(request: NextRequest) {
    try {
        // 1. AUTHENTICATION - Validate API key
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '') ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!apiKey) {
            logger.warn('Tailscale registration rejected - no API key', {
                endpoint: 'tailscale-register',
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return ApiResponse.unauthorized('API key required for device registration');
        }

        const { valid, user } = await validateApiKey(apiKey);
        if (!valid || !user) {
            logger.warn('Tailscale registration rejected - invalid API key', {
                endpoint: 'tailscale-register',
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return ApiResponse.unauthorized('Invalid API key');
        }

        // 2. INPUT VALIDATION
        const body = await request.json();
        const validationResult = tailscaleRegisterSchema.safeParse(body);

        if (!validationResult.success) {
            logger.warn('Tailscale registration validation failed', {
                endpoint: 'tailscale-register',
                userId: user.id,
                errors: validationResult.errors?.map((e: any) => e.message) || []
            });
            return ApiResponse.badRequest('Invalid registration data', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid registration data');
        }

        const data = validationResult.data;

        // 3. EXTRACT TAILSCALE HEADERS
        const tailscaleUser = request.headers.get('X-Tailscale-User');
        const tailscaleName = request.headers.get('X-Tailscale-Name');
        const tailscaleLogin = request.headers.get('X-Tailscale-Login');
        const tailscaleTailnet = request.headers.get('X-Tailscale-Tailnet');
        const clientIP = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

        // 4. CREATE TENANT CONTEXT
        if (!user.customerId) {
            return ApiResponse.badRequest('Customer ID required for device registration');
        }

        const tenantContext = TenantContextImpl.create(CustomerId.fromString(user.customerId));

        // 5. REGISTER DEVICE
        const serviceContainer = ServiceContainer.getInstance();
        const prisma = serviceContainer.getPrismaClient().getClient();

        const deviceData = {
            deviceId: data.device_id,
            hostname: data.hostname,
            deviceType: (data.device_type || 'UNKNOWN') as any,
            deviceModel: data.device_model || null,
            architecture: data.architecture || 'unknown',
            location: data.location || null,
            description: data.description || null,
            ipAddress: data.ip_address || null,
            macAddress: data.mac_address || null,
            tailscaleIp: clientIP !== 'unknown' ? clientIP : null,
            capabilities: data.capabilities || {},
            customerId: user.customerId,
            userId: user.id
        };

        const device = await prisma.device.upsert({
            where: { deviceId: data.device_id },
            update: {
                hostname: deviceData.hostname,
                deviceType: deviceData.deviceType,
                deviceModel: deviceData.deviceModel,
                architecture: deviceData.architecture,
                location: deviceData.location,
                description: deviceData.description,
                ipAddress: deviceData.ipAddress,
                macAddress: deviceData.macAddress,
                tailscaleIp: deviceData.tailscaleIp,
                capabilities: deviceData.capabilities,
                lastSeen: new Date(),
                status: 'ONLINE',
                updatedAt: new Date()
            },
            create: {
                deviceId: deviceData.deviceId,
                hostname: deviceData.hostname,
                deviceType: deviceData.deviceType,
                deviceModel: deviceData.deviceModel,
                architecture: deviceData.architecture,
                location: deviceData.location,
                description: deviceData.description,
                ipAddress: deviceData.ipAddress,
                macAddress: deviceData.macAddress,
                tailscaleIp: deviceData.tailscaleIp,
                capabilities: deviceData.capabilities,
                customerId: deviceData.customerId,
                userId: deviceData.userId,
                status: 'ONLINE',
                registeredAt: new Date()
            }
        });

        // 6. LOG SUCCESS
        logger.info('Device registered via Tailscale', {
            endpoint: 'tailscale-register',
            deviceId: data.device_id,
            userId: user.id,
            customerId: user.customerId,
            tailscaleUser,
            tailscaleName
        });

        // 7. RETURN RESPONSE
        return ApiResponse.created({
            success: true,
            device: {
                id: device.id,
                deviceId: device.deviceId,
                hostname: device.hostname,
                status: device.status,
                registeredAt: device.registeredAt
            },
            tailscale: {
                user: tailscaleUser,
                name: tailscaleName,
                login: tailscaleLogin,
                tailnet: tailscaleTailnet,
                ip: clientIP
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid registration data', error.errors);
        }

        logger.error('Tailscale device registration failed', error instanceof Error ? error : undefined);
        return ApiResponse.internalError('Registration failed');
    }
}
