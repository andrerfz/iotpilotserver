import { Router, Request, Response } from 'express';
import { validator } from '@iotpilot/core/shared/infrastructure/validation/validation-helper';
import { validateApiKey } from '@iotpilot/core/shared/infrastructure/authentication/auth.service';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { ProcessHeartbeatCommand } from '@iotpilot/core/device/application/commands/process-heartbeat/process-heartbeat.command';
import { RecordSensorReadingCommand } from '@iotpilot/core/device/application/commands/record-sensor-reading/record-sensor-reading.command';
import { TemperatureWebhookInputSchema } from '@iotpilot/core/device/infrastructure/dto/device.schemas';
import { logger } from '@iotpilot/core/shared/infrastructure/logging/logger.service';
import {
    DeviceRegistrationData,
    RegisterDeviceCompleteCommand
} from '@iotpilot/core/device/application/commands/register-device-complete/register-device-complete.command';
import { z } from 'zod';
import { send } from '../http/response.util';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function isoTimestamp(): string {
    return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const v = validator();

export const heartbeatSchema = v.object({
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

export const iotDeviceRegistrationSchema = v.object({
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

// ---------------------------------------------------------------------------
// InfluxDB helper
// ---------------------------------------------------------------------------

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
 * Send metrics to InfluxDB for time-series storage.
 * Non-blocking async operation.
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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const iotRouter = Router();

/**
 * POST /heartbeat — Receive device heartbeat
 * IoT device route: authentication via API key header, no JWT required.
 */
iotRouter.post('/heartbeat', async (req: Request, res: Response) => {
    try {
        // 1. AUTHENTICATION - Validate API key for device authentication
        const apiKey = (req.headers['x-api-key'] as string | undefined) ||
            (req.headers['authorization'] as string | undefined)?.replace('ApiKey ', '') ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!apiKey) {
            logger.warn('Heartbeat rejected - no API key', {
                endpoint: 'heartbeat',
                ip: req.headers['x-forwarded-for'] as string || 'unknown'
            });
            send.unauthorized(res, 'API key required for device heartbeat');
            return;
        }

        const { valid, user } = await validateApiKey(apiKey);
        if (!valid || !user) {
            logger.warn('Heartbeat rejected - invalid API key', {
                endpoint: 'heartbeat',
                ip: req.headers['x-forwarded-for'] as string || 'unknown'
            });
            send.unauthorized(res, 'Invalid API key');
            return;
        }

        // 2. INPUT VALIDATION
        const body = req.body;
        const validationResult = heartbeatSchema.safeParse(body);

        if (!validationResult.success) {
            logger.warn('Heartbeat validation failed', {
                endpoint: 'heartbeat',
                userId: user.id,
                errors: validationResult.errors?.map((e: any) => e.message) || []
            });
            send.badRequest(res, 'Invalid heartbeat data', validationResult.errors);
            return;
        }

        // TypeScript type narrowing: data is guaranteed to exist when success is true
        if (!validationResult.data) {
            send.badRequest(res, 'Invalid heartbeat data');
            return;
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
        send.ok(res, {
            status: 'success',
            message: 'Heartbeat received',
            device: result
        });
        return;

    } catch (err) {
        logger.error('Failed to process heartbeat', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});

/**
 * POST /api/iot/register — IoT device self-registration endpoint
 *
 * This endpoint is specifically for IoT devices to self-register using API keys.
 * It differs from /api/devices/register which is for manual user registration via UI.
 *
 * Authentication: API Key (X-API-Key header)
 * IoT device route: authentication via API key header, no JWT required.
 *
 * @example Device registration:
 * ```bash
 * curl -X POST https://iotpilot.app/api/iot/register \
 *   -H "X-API-Key: local-abc123..." \
 *   -H "Content-Type: application/json" \
 *   -d '{"device_id":"pi-001","hostname":"RaspberryPi-001","device_type":"GENERIC"}'
 * ```
 */
iotRouter.post('/register', async (req: Request, res: Response) => {
    try {
        // 1. AUTHENTICATION - Validate API key for device authentication
        const apiKey = (req.headers['x-api-key'] as string | undefined) ||
            (req.headers['authorization'] as string | undefined)?.replace('ApiKey ', '') ||
            (req.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

        if (!apiKey) {
            logger.warn('IoT device registration rejected - no API key', {
                endpoint: 'iot/register',
                ip: req.headers['x-forwarded-for'] as string || 'unknown'
            });
            send.unauthorized(res, 'API key required for device registration');
            return;
        }

        const { valid, user, apiKeyRecord } = await validateApiKey(apiKey);
        if (!valid || !user || !apiKeyRecord) {
            logger.warn('IoT device registration rejected - invalid API key', {
                endpoint: 'iot/register',
                ip: req.headers['x-forwarded-for'] as string || 'unknown'
            });
            send.unauthorized(res, 'Invalid API key');
            return;
        }

        // 2. INPUT VALIDATION
        const body = req.body;
        const validationResult = iotDeviceRegistrationSchema.safeParse(body);

        if (!validationResult.success) {
            logger.warn('IoT device registration validation failed', {
                endpoint: 'iot/register',
                userId: user.id,
                errors: validationResult.errors?.map((e: any) => e.message) || []
            });
            send.badRequest(res, 'Invalid device registration data', validationResult.errors);
            return;
        }

        if (!validationResult.data) {
            send.badRequest(res, 'Invalid device registration data');
            return;
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
            send.forbidden(res, 'API key must be associated with a customer');
            return;
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
                    id: (user as any).publicId || user.id,
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
            timestamp: isoTimestamp()
        };

        send.created(res, response);
        return;

    } catch (err) {
        logger.error('Failed to register IoT device', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /webhook/temperature — ESP32/ESP8266 sensor readings
// This endpoint is the webhookUrl stored in device NVS during provisioning.
// Payload: { deviceId, batteryLevel, batteryVoltage, rssi, firmwareVersion,
//            alertPending, readings: [{temperature, cycle}] }
// ---------------------------------------------------------------------------

// Canonical schema lives in packages/core device.schemas.ts (single source of
// truth, also feeds the OpenAPI generator) — see docs/openapi-autogen.md.
const sensorWebhookSchema = TemperatureWebhookInputSchema;

// Mounted as POST /api/webhook/temperature via router.use('/webhook', iotRouter)
iotRouter.post('/temperature', async (req: Request, res: Response) => {
    try {
        const apiKey = req.headers['x-api-key'] as string | undefined;
        if (!apiKey) {
            send.unauthorized(res, 'API key required');
            return;
        }

        const keyResult = await validateApiKey(apiKey);
        if (!keyResult.valid || !keyResult.user) {
            send.unauthorized(res, 'Invalid API key');
            return;
        }

        const parsed = sensorWebhookSchema.safeParse(req.body);
        if (!parsed.success) {
            send.badRequest(res, 'Invalid sensor payload', parsed.error.errors);
            return;
        }

        const data = parsed.data;
        const customerId = keyResult.apiKeyRecord?.customerId || keyResult.user.customerId;
        if (!customerId) {
            send.forbidden(res, 'No tenant context');
            return;
        }

        const tenantContext = TenantContextImpl.create(CustomerId.create(customerId));
        const commandBus = ServiceContainer.getInstance().getCommandBus();

        await commandBus.execute(
            RecordSensorReadingCommand.create({ ...data }, tenantContext)
        );

        logger.info('Sensor reading recorded', {
            deviceId: data.deviceId,
            temperature: data.readings?.length ? data.readings[data.readings.length - 1].temperature : undefined,
            battery: data.batteryLevel,
        });

        // Look up device config + OTA directive to return to device
        const prisma = ServiceContainer.getInstance().getPrismaClient().getClient();
        const device = await prisma.device.findFirst({
            where: { deviceId: data.deviceId },
            select: { id: true, capabilities: true, targetFirmwareVersion: true }
        });

        // Notify connected dashboards — send the UUID so the page can match by URL param.
        try {
            if (device?.id) {
                (global as any).broadcastDeviceUpdate?.(device.id, {
                    deviceId: data.deviceId,
                    status: 'ONLINE',
                    batteryLevel: data.batteryLevel,
                    lastSeen: new Date().toISOString(),
                });
            }
        } catch { /* non-fatal */ }
        const caps = (device?.capabilities as any) ?? {};
        const reportingInterval = caps.reportingInterval ?? 1800;
        const deepSleepEnabled  = caps.deepSleepEnabled  ?? true;

        const responseBody: Record<string, unknown> = {
            success: true,
            deviceId: data.deviceId,
            config: { reportingInterval, deepSleepEnabled },
        };
        if (device?.targetFirmwareVersion) {
            responseBody.firmware = { targetVersion: device.targetFirmwareVersion };
        }

        send.ok(res, responseBody);
    } catch (err) {
        logger.error('Failed to record sensor reading', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /iot/logs — Device agent log shipping
// Authenticated by API key (same as heartbeat). Accepts a batch of log entries
// and writes them to the DeviceLog table for the admin logs UI.
// ---------------------------------------------------------------------------

const logEntrySchema = z.object({
    level:     z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).default('INFO'),
    message:   z.string().min(1).max(4096),
    source:    z.string().max(128).optional(),
    timestamp: z.string().datetime().optional(),
});

export const logsSchema = z.object({
    deviceId: z.string().min(1),
    logs:     z.array(logEntrySchema).min(1).max(100),
});

iotRouter.post('/logs', async (req: Request, res: Response) => {
    try {
        const apiKey = (req.headers['x-api-key'] as string | undefined) ||
            (req.headers['authorization'] as string | undefined)?.replace('ApiKey ', '').replace('Bearer ', '');

        if (!apiKey) {
            send.unauthorized(res, 'API key required');
            return;
        }

        const { valid, user } = await validateApiKey(apiKey);
        if (!valid || !user) {
            send.unauthorized(res, 'Invalid API key');
            return;
        }

        const parsed = logsSchema.safeParse(req.body);
        if (!parsed.success) {
            send.badRequest(res, 'Invalid log payload');
            return;
        }

        const { deviceId: publicId, logs } = parsed.data;

        if (!user.customerId) {
            send.forbidden(res, 'No tenant associated with this API key');
            return;
        }

        const prismaClient = ServiceContainer.getInstance().getPrismaClient().getClient();

        const device = await prismaClient.device.findFirst({
            where: {
                publicId,
                customerId: user.customerId,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (!device) {
            send.notFound(res, 'Device not found');
            return;
        }

        await prismaClient.deviceLog.createMany({
            data: logs.map(l => ({
                deviceId:  device.id,
                level:     l.level as any,
                message:   l.message,
                source:    l.source ?? 'agent',
                timestamp: l.timestamp ? new Date(l.timestamp) : new Date(),
            })),
        });

        send.created(res, { accepted: logs.length });
    } catch (err) {
        logger.error('Failed to store device logs', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});
