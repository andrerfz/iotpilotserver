import {NextRequest} from 'next/server';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {validateApiKey} from '@/lib/shared/infrastructure/authentication/auth.service';
import {ServiceContainer} from '@/lib/shared/infrastructure/container/service-container';
import {TenantContextImpl} from '@/lib/shared/domain/tenant-context';
import {CustomerId} from '@/lib/shared/domain/value-objects/customer-id.vo';
import {ProcessHeartbeatCommand} from '@/lib/device/application/commands/process-heartbeat/process-heartbeat.command';
import {logger} from '@/lib/shared/infrastructure/logging/logger.service';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod';

// Dynamic route: device heartbeats use auth header/cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Validation schema for heartbeat data
const v = validator();
const heartbeatSchema = v.object({
    device_id: v.string({ min: 1, message: 'Device ID is required' }),
    hostname: v.string({ min: 1, message: 'Hostname is required' }),
    uptime: v.optional(v.string()),
    load_average: v.optional(v.string()),
    cpu_usage: v.optional(v.number({ min: 0, max: 100 })),
    cpu_temperature: v.optional(v.number()),
    memory_usage_percent: v.optional(v.number({ min: 0, max: 100 })),
    memory_used_mb: v.optional(v.number({ min: 0 })),
    memory_total_mb: v.optional(v.number({ min: 0 })),
    disk_usage_percent: v.optional(v.number({ min: 0, max: 100 })),
    disk_used: v.optional(v.string()),
    disk_total: v.optional(v.string()),
    app_status: v.optional(v.enum(['RUNNING', 'STOPPED', 'ERROR', 'NOT_INSTALLED', 'UNKNOWN'] as const)),
    agent_version: v.optional(v.string()),
    last_boot: v.optional(v.string()),
    timestamp: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    tailscale_ip: v.optional(v.string())
});

/**
 * POST /api/heartbeat - Receive device heartbeat
 * Uses CQRS pattern with ProcessHeartbeatCommand
 */
export async function POST(request: NextRequest) {
    try {
        // 1. AUTHENTICATION - Validate API key for device authentication
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace('ApiKey ', '') ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!apiKey) {
            logger.warn('Heartbeat rejected - no API key', {
                endpoint: 'heartbeat',
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return ApiResponse.unauthorized('API key required for device heartbeat');
        }

        const { valid, user } = await validateApiKey(apiKey);
        if (!valid || !user) {
            logger.warn('Heartbeat rejected - invalid API key', {
                endpoint: 'heartbeat',
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return ApiResponse.unauthorized('Invalid API key');
        }

        // 2. INPUT VALIDATION
        const body = await request.json();
        const validationResult = heartbeatSchema.safeParse(body);
        
        if (!validationResult.success) {
            logger.warn('Heartbeat validation failed', {
                endpoint: 'heartbeat',
                userId: user.id,
                errors: validationResult.errors?.map((e: any) => e.message) || []
            });
            return ApiResponse.badRequest('Invalid heartbeat data', validationResult.errors);
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            return ApiResponse.badRequest('Invalid heartbeat data');
        }

        const data = validationResult.data;

        // 3. CREATE TENANT CONTEXT
        const tenantContext = user.customerId
            ? TenantContextImpl.create(CustomerId.fromString(user.customerId))
            : TenantContextImpl.createSuperAdmin();

        // 4. CREATE AND DISPATCH COMMAND
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const processHeartbeatCommand = ProcessHeartbeatCommand.create(
            {
                deviceId: data.device_id,
                hostname: data.hostname,
                uptime: data.uptime,
                loadAverage: data.load_average,
                cpuUsage: data.cpu_usage,
                cpuTemperature: data.cpu_temperature,
                memoryUsagePercent: data.memory_usage_percent,
                memoryUsedMb: data.memory_used_mb,
                memoryTotalMb: data.memory_total_mb,
                diskUsagePercent: data.disk_usage_percent,
                diskUsed: data.disk_used,
                diskTotal: data.disk_total,
                appStatus: data.app_status,
                agentVersion: data.agent_version,
                lastBoot: data.last_boot,
                timestamp: data.timestamp,
                ipAddress: data.ip_address,
                tailscaleIp: data.tailscale_ip
            },
            user.id,
            tenantContext
        );

        const result = await commandBus.execute(processHeartbeatCommand);

        // 5. SEND TO INFLUXDB (async, non-blocking)
        sendToInfluxDB(data).catch(err => {
            logger.error('Failed to send metrics to InfluxDB', err);
        });

        // 6. LOG SUCCESS
        logger.info('Device heartbeat processed', {
            endpoint: 'heartbeat',
            deviceId: data.device_id,
            userId: user.id,
            status: 'success'
        });

        // 7. RETURN RESPONSE
        return ApiResponse.ok({
            status: 'success',
            message: 'Heartbeat received',
            device: result
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid heartbeat data', error.errors);
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle specific domain errors
        if (errorMessage.includes('not found')) {
            return ApiResponse.notFound(errorMessage);
        }
        
        if (errorMessage.includes('belongs to another')) {
            return ApiResponse.forbidden(errorMessage);
        }

        logger.error('Failed to process heartbeat', error instanceof Error ? error : undefined);
        return ApiResponse.internalError('Failed to process heartbeat');
    }
}

/**
 * Heartbeat data type for InfluxDB
 */
type HeartbeatData = {
    device_id: string;
    hostname: string;
    uptime?: string;
    load_average?: string;
    cpu_usage?: number;
    cpu_temperature?: number;
    memory_usage_percent?: number;
    memory_used_mb?: number;
    memory_total_mb?: number;
    disk_usage_percent?: number;
    disk_used?: string;
    disk_total?: string;
    app_status?: 'RUNNING' | 'STOPPED' | 'ERROR' | 'NOT_INSTALLED' | 'UNKNOWN';
    agent_version?: string;
    last_boot?: string;
    timestamp?: string;
    ip_address?: string;
    tailscale_ip?: string;
};

/**
 * Send metrics to InfluxDB for time-series storage
 * Non-blocking async operation
 */
async function sendToInfluxDB(data: HeartbeatData): Promise<void> {
        const influxUrl = process.env.INFLUXDB_URL;
        const influxToken = process.env.INFLUXDB_TOKEN;
        const influxOrg = process.env.INFLUXDB_ORG || 'iotpilot';
        const influxBucket = process.env.INFLUXDB_BUCKET || 'devices';

        if (!influxUrl || !influxToken) {
        return; // InfluxDB not configured
        }

        const points = [];
        const timestamp = new Date().getTime() * 1000000; // nanoseconds

        if (data.cpu_usage !== undefined) {
            points.push(`cpu_usage,device_id=${data.device_id} value=${data.cpu_usage} ${timestamp}`);
        }

        if (data.cpu_temperature !== undefined) {
            points.push(`cpu_temperature,device_id=${data.device_id} value=${data.cpu_temperature} ${timestamp}`);
        }

        if (data.memory_usage_percent !== undefined) {
            points.push(`memory_usage,device_id=${data.device_id} value=${data.memory_usage_percent} ${timestamp}`);
        }

        if (data.disk_usage_percent !== undefined) {
            points.push(`disk_usage,device_id=${data.device_id} value=${data.disk_usage_percent} ${timestamp}`);
        }

        if (points.length === 0) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${influxUrl}/api/v2/write?org=${influxOrg}&bucket=${influxBucket}`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${influxToken}`,
                'Content-Type': 'text/plain'
            },
            body: points.join('\n'),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`InfluxDB responded with ${response.status}`);
        }
    } finally {
        clearTimeout(timeoutId);
        }
    }
