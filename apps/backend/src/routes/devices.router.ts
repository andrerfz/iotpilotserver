import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import * as crypto from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { validator } from '@iotpilot/core/shared/infrastructure/validation/validation-helper';
import { ServiceContainer } from '@iotpilot/core/shared/infrastructure/container/service-container';
import { ListDevicesQuery } from '@iotpilot/core/device/application/queries/list-devices/list-devices.query';
import {
    DeviceRegistrationData as RegisterDeviceData,
    RegisterDeviceCompleteCommand,
} from '@iotpilot/core/device/application/commands/register-device-complete/register-device-complete.command';
import {
    BulkRegisterDevicesCommand,
    DeviceRegistrationData as BulkDeviceRegistrationData,
} from '@iotpilot/core/device/application/commands/bulk-register-devices/bulk-register-devices.command';
import { ProvisionDeviceCommand } from '@iotpilot/core/device/application/commands/provision-device/provision-device.command';
import { ProvisionDeviceResult } from '@iotpilot/core/device/application/commands/provision-device/provision-device.handler';
import { ClaimDeviceCommand } from '@iotpilot/core/device/application/commands/claim-device/claim-device.command';
import { ClaimDeviceResult } from '@iotpilot/core/device/application/commands/claim-device/claim-device.handler';
import { RequestFirmwareUpdateCommand } from '@iotpilot/core/device/application/commands/request-firmware-update/request-firmware-update.command';
import { RequestFirmwareUpdateResult } from '@iotpilot/core/device/application/commands/request-firmware-update/request-firmware-update.handler';
import { GetDeviceQuery } from '@iotpilot/core/device/application/queries/get-device/get-device.query';
import { GetDeviceStatusQuery } from '@iotpilot/core/device/application/queries/get-device-status/get-device-status.query';
import { GetDeviceCommandQuery } from '@iotpilot/core/device/application/queries/get-device-command/get-device-command.query';
import { Device } from '@iotpilot/core/device/domain/entities/device.entity';
import { DeviceId } from '@iotpilot/core/device/domain/value-objects/device-id.vo';
import { TenantContextImpl } from '@iotpilot/core/shared/domain/tenant-context';
import { CustomerId } from '@iotpilot/core/shared/domain/value-objects/customer-id.vo';
import { Pagination } from '@iotpilot/core/shared/infrastructure/http/pagination.util';
import { resolveDevicePublicId } from '@iotpilot/core/device/infrastructure/services/device-id-resolver';
import { resolveCommandPublicId } from '@iotpilot/core/device/infrastructure/services/command-id-resolver';
import { validateApiKey } from '@iotpilot/core/shared/infrastructure/authentication/auth.service';
import { authenticate } from '@iotpilot/core/shared/infrastructure/authentication/auth.service';
import { prisma } from '@iotpilot/core/shared/infrastructure/database/prisma.service';
import { tenantPrisma } from '@iotpilot/core/tenant-middleware';
import { CommandStatus } from '@iotpilot/core/device/domain/entities/device-command.entity';
import { ListAlertsQuery } from '@iotpilot/core/monitoring/application/queries/list-alerts/list-alerts.query';
import { AlertEntity } from '@iotpilot/core/monitoring/domain/entities/alert.entity';
import { AlertId } from '@iotpilot/core/monitoring/domain/value-objects/alert-id.vo';
import { AlertSeverity } from '@iotpilot/core/monitoring/domain/value-objects/alert-severity.vo';
import { AlertStatus } from '@iotpilot/core/monitoring/domain/value-objects/alert-status.vo';
import { PrismaAlertRepository } from '@iotpilot/core/monitoring/infrastructure/repositories/prisma-alert.repository';
import { TenantBoundaryValidator } from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator';
import { TenantScopedLoggingService } from '@iotpilot/core/shared/infrastructure/logging/tenant-scoped-logging.service';
import { AcknowledgeAlertCommand } from '@iotpilot/core/monitoring/application/commands/acknowledge-alert/acknowledge-alert.command';
import { ResolveAlertCommand } from '@iotpilot/core/monitoring/application/commands/resolve-alert/resolve-alert.command';
import { DeleteAlertCommand } from '@iotpilot/core/monitoring/application/commands/delete-alert/delete-alert.command';
import { ExecuteSshCommandCommand } from '@iotpilot/core/device/application/commands/execute-ssh-command/execute-ssh-command.command';
import { StructuredLogger } from '@iotpilot/core/shared/infrastructure/logging/structured-logger';
import { logger } from '@iotpilot/core/shared/infrastructure/logging/logger.service';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { send } from '../http/response.util';

export const devicesRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoTimestamp(): string {
    return new Date().toISOString();
}

function resolveTenantId(req: AuthenticatedRequest): string | undefined {
    return req.tenant?.getCustomerId()?.getValue() ?? req.user?.customerId ?? undefined;
}

const DOMAIN_TO_FRONTEND_SEVERITY: Record<string, string> = {
    LOW: 'INFO', MEDIUM: 'WARNING', HIGH: 'ERROR', CRITICAL: 'CRITICAL',
};
const FRONTEND_TO_DOMAIN_SEVERITY: Record<string, string> = {
    INFO: 'LOW', WARNING: 'MEDIUM', ERROR: 'HIGH', CRITICAL: 'CRITICAL',
};

function alertToDTO(alert: AlertEntity, devicePublicId: string) {
    return {
        id: alert.publicId || alert.getId().getValue(),
        deviceId: devicePublicId,
        type: alert.type?.getValue() || alert.metadata?.rawType || 'CUSTOM',
        severity: DOMAIN_TO_FRONTEND_SEVERITY[alert.severity.value] || 'INFO',
        title: alert.title,
        message: alert.message,
        source: alert.notes || null,
        resolved: alert.isResolved(),
        resolvedAt: alert.resolvedAt?.toISOString() || null,
        acknowledgedAt: alert.acknowledgedAt?.toISOString() || null,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        metadata: alert.metadata || {},
    };
}

function getAlertRepo(): PrismaAlertRepository {
    const loggingService = new TenantScopedLoggingService();
    const tenantValidator = new TenantBoundaryValidator(loggingService);
    return new PrismaAlertRepository(prisma, tenantValidator);
}

const commandLogger = StructuredLogger.forService('device-commands-api');
const settingsLogger = StructuredLogger.forService('device-settings-api');

// PrismaCommandStatus type - matches Prisma schema enum
type PrismaCommandStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

function mapCommandStatusToPrisma(status: CommandStatus): PrismaCommandStatus {
    const statusMap: Record<CommandStatus, PrismaCommandStatus> = {
        [CommandStatus.PENDING]: 'PENDING',
        [CommandStatus.EXECUTING]: 'RUNNING',
        [CommandStatus.RUNNING]: 'RUNNING',
        [CommandStatus.COMPLETED]: 'COMPLETED',
        [CommandStatus.FAILED]: 'FAILED',
        [CommandStatus.TIMEOUT]: 'TIMEOUT',
    };
    return statusMap[status];
}

const SUPPORTED_COMMANDS = {
    RESTART: 'restart',
    SHUTDOWN: 'shutdown',
    UPDATE: 'update',
    CUSTOM: 'custom',
    REBOOT: 'reboot',
    INSTALL: 'install',
    UNINSTALL: 'uninstall',
} as const;

// Dynamic command queue module
let commandQueueModule: any = null;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const v = validator();

const listDevicesRegistrationSchema = v.object({
    device_id: v.string({ min: 1, message: 'Device ID is required' }),
    hostname: v.string({ min: 1, message: 'Hostname is required' }),
    device_type: v.string({ min: 1, message: 'Device type is required' }),
    device_model: v.optional(v.string()),
    architecture: v.string({ min: 1, message: 'Architecture is required' }),
    location: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    tailscale_ip: v.optional(v.string()),
    mac_address: v.optional(v.string()),
});

export const deviceRegisterSchema = v.object({
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
    customerId: v.optional(v.string()),
});

export const activateSchema = v.object({
    deviceId: v.string({ min: 1, message: 'deviceId is required' }),
    claimingToken: v.string({ min: 1, message: 'claimingToken is required' }),
    macAddress: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    firmwareVersion: v.optional(v.string()),
    deviceModel: v.optional(v.string()),
});

export const claimDeviceSchema = v.object({
    deviceId: v.string({ min: 1, message: 'deviceId is required' }),
    name: v.optional(v.string()),
});

export const bulkDeviceSchema = v.object({
    name: v.string({ min: 1, message: 'Device name is required' }),
    ipAddress: v.string({ ip: true, message: 'Valid IP address is required' }),
    sshUsername: v.string({ min: 1, message: 'SSH username is required' }),
    sshPassword: v.default(v.optional(v.string()), ''),
    sshPort: v.default(v.number({ min: 1, max: 65535, int: true, message: 'SSH port must be between 1 and 65535' }), 22),
});

const bulkRegistrationSchemaZod = z.object({
    devices: z.array(z.any()).min(1, 'At least one device is required'),
    customerId: z.string().optional(),
});
const bulkRegistrationSchema = (v as any).fromZodSchema(bulkRegistrationSchemaZod);

export const tailscaleRegisterSchema = v.object({
    device_id: v.string({ min: 1, message: 'Device ID is required' }),
    hostname: v.string({ min: 1, message: 'Hostname is required' }),
    device_type: v.default(v.optional(v.enum(['PI_ZERO', 'PI_3', 'PI_4', 'PI_5', 'ORANGE_PI', 'GENERIC', 'UNKNOWN'] as const)), 'UNKNOWN'),
    device_model: v.optional(v.string()),
    architecture: v.default(v.optional(v.string()), 'unknown'),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    mac_address: v.optional(v.string()),
    capabilities: v.default(v.optional(v.record(v.string(), v.any())), {}),
});

export const createCommandSchema = v.object({
    command: v.enum(['RESTART', 'SHUTDOWN', 'UPDATE', 'CUSTOM', 'REBOOT', 'INSTALL', 'UNINSTALL',
        'restart', 'shutdown', 'update', 'custom', 'reboot', 'install', 'uninstall'] as const),
    arguments: v.optional(v.string({ max: 1000, message: 'Arguments must be less than 1000 characters' })),
});

export const sshCommandSchema = v.object({
    command: v.string({ min: 1, message: 'Command cannot be empty' }),
    timeout: v.default(v.optional(v.number({ min: 1000, max: 300000 })), 30000),
});

export const deviceSettingsSchema = v.object({
    hostname: v.optional(v.string({ min: 1, max: 100 })),
    deviceType: v.optional(v.enum(['PI_ZERO', 'PI_3', 'PI_4', 'PI_5', 'ORANGE_PI', 'ESP8266_SENSOR', 'ESP32C3_SENSOR', 'HELTEC_LORA32V3_SENSOR', 'GENERIC', 'UNKNOWN'] as const)),
    location: v.optional(v.string({ max: 200 })),
    description: v.optional(v.string({ max: 500 })),
    tags: v.optional(v.array(v.string({ max: 50 }))),
    reportingInterval: v.optional(v.number({ min: 60, max: 86400 })),
    heartbeatInterval: v.optional(v.number({ min: 30, max: 600 })),
    metricsEnabled: v.optional(v.boolean()),
    cpuThreshold: v.optional(v.number({ min: 50, max: 100 })),
    memoryThreshold: v.optional(v.number({ min: 50, max: 100 })),
    temperatureThreshold: v.optional(v.number({ min: 40, max: 100 })),
    diskThreshold: v.optional(v.number({ min: 70, max: 100 })),
    sensorTempThreshold: v.optional(v.number({ min: -40, max: 100 })),
    batteryThreshold: v.optional(v.number({ min: 1, max: 100 })),
    networkMonitoring: v.optional(v.boolean()),
    autoUpdate: v.optional(v.boolean()),
    updateChannel: v.optional(v.enum(['stable', 'beta', 'nightly'] as const)),
    sshEnabled: v.optional(v.boolean()),
    apiKeyRotationDays: v.optional(v.number({ min: 7, max: 365 })),
});

const VALID_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;
type LogLevel = typeof VALID_LEVELS[number];

// ---------------------------------------------------------------------------
// GET /devices - List all devices
// ---------------------------------------------------------------------------

devicesRouter.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const statusParam = req.query.status as string || 'all';
        const status = ['active', 'inactive', 'all'].includes(statusParam)
            ? statusParam as 'active' | 'inactive' | 'all'
            : 'all';
        const search = req.query.search as string || '';
        const page = parseInt(req.query.page as string || '1');
        const limit = Math.min(parseInt(req.query.limit as string || '50'), 100);
        const offset = (page - 1) * limit;
        const sortBy = req.query.sortBy as string || 'name';
        const sortDirection = req.query.sortDirection as string || 'asc';

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const listDevicesQuery = ListDevicesQuery.create(
            {
                status: status === 'all' ? undefined : status,
                search,
                limit,
                offset,
                sortBy,
                sortDirection: sortDirection as 'asc' | 'desc',
            },
            req.user?.customerId || undefined,
            tenantContext,
        );

        const deviceListResult = await queryBus.execute(listDevicesQuery);

        const formattedDevices = deviceListResult.devices.map((device: any) => ({
            id: device.id,
            deviceId: device.id,
            hostname: device.hostname || device.name || device.deviceId,
            name: device.name || device.hostname || device.deviceId,
            deviceType: device.deviceType || 'Unknown',
            deviceModel: device.deviceModel || null,
            architecture: device.architecture || null,
            location: device.location || null,
            description: device.description || null,
            ipAddress: device.ipAddress,
            tailscaleIp: device.tailscaleIp,
            macAddress: device.macAddress || null,
            status: device.status?.connectivity === 'online' ? 'ONLINE'
                : device.status?.businessStatus === 'maintenance' ? 'MAINTENANCE'
                : device.appStatus === 'ERROR' ? 'ERROR'
                : 'OFFLINE',
            lastSeen: device.lastSeen,
            lastBoot: device.lastBoot || null,
            uptime: device.uptime || null,
            cpuUsage: device.metrics?.cpuUsage ?? null,
            cpuTemp: device.cpuTemp ?? null,
            memoryUsage: device.metrics?.memoryUsage ?? null,
            memoryTotal: device.memoryTotal ?? null,
            diskUsage: device.metrics?.diskUsage ?? null,
            diskTotal: device.diskTotal || null,
            loadAverage: device.loadAverage || null,
            appStatus: device.appStatus || (device.status?.connectivity === 'online' ? 'RUNNING' : 'STOPPED'),
            agentVersion: device.agentVersion || null,
            registeredAt: device.createdAt,
            updatedAt: device.updatedAt,
            isOnline: device.isOnline,
            isActive: device.isActive,
            connectionQuality: device.connectionQuality,
            user: null,
            customer: device.customerId ? {
                id: device.customerId,
                name: 'Customer',
                slug: 'customer',
            } : null,
            alertsCount: 0,
        }));

        const stats = {
            total: deviceListResult.total,
            online: formattedDevices.filter((d: any) => d.status === 'ONLINE').length,
            offline: formattedDevices.filter((d: any) => d.status === 'OFFLINE').length,
            maintenance: formattedDevices.filter((d: any) => d.status === 'MAINTENANCE').length,
            error: formattedDevices.filter((d: any) => d.status === 'ERROR').length,
        };

        const pagination = Pagination.create(page, limit, deviceListResult.total);

        send.ok(res, formattedDevices, { pagination, stats });
    } catch (err) {
        console.error('Failed to fetch devices with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices - Register new device (dual auth)
// ---------------------------------------------------------------------------

devicesRouter.post('/', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        process.stdout.write(`🔍 DEVICES POST: Route handler started\n`);

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();
        process.stdout.write(`🔍 DEVICES POST: Got commandBus\n`);

        const authUser = req.user;
        process.stdout.write(`🔍 DEVICES POST: Got authUser: ${authUser?.id}\n`);

        const body = req.body;
        process.stdout.write(`🔍 DEVICES POST: Parsed body\n`);
        const data = listDevicesRegistrationSchema.parse(body);
        process.stdout.write(`🔍 DEVICES POST: Validated data\n`);

        if (!authUser?.customerId && authUser?.role !== 'SUPERADMIN') {
            console.error('🚨 DEVICES POST: User lacks customerId:', {
                userId: authUser?.id,
                email: authUser?.email,
                role: authUser?.role,
                customerId: authUser?.customerId,
            });
            send.badRequest(res, 'Missing customer context. Please contact support.');
            return;
        }

        let targetCustomerId: string | null = authUser?.customerId || null;
        if (authUser?.role === 'SUPERADMIN' && !targetCustomerId) {
            const explicitCustomerId = req.headers['x-target-customer-id'] as string | undefined || body.customerId;
            if (explicitCustomerId) {
                targetCustomerId = explicitCustomerId;
            } else {
                send.badRequest(res, 'SUPERADMIN must specify target customerId');
                return;
            }
        }

        const tenantContext = targetCustomerId
            ? TenantContextImpl.create(CustomerId.create(targetCustomerId))
            : TenantContextImpl.createSuperAdmin();

        const deviceData: RegisterDeviceData = {
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
            customerId: targetCustomerId!,
        };

        process.stdout.write(`🔍 DEVICES POST: Creating RegisterDeviceCompleteCommand...\n`);
        const registerCommand = RegisterDeviceCompleteCommand.create(deviceData, tenantContext);
        process.stdout.write(`🔍 DEVICES POST: Command created, executing via commandBus...\n`);

        const registrationResult = await commandBus.execute<typeof registerCommand, { deviceId: string; message: string; capabilities?: string[] }>(registerCommand);
        process.stdout.write(`🔍 DEVICES POST: Command executed successfully\n`);

        send.created(res, {
            device: {
                id: registrationResult.deviceId,
                deviceId: registrationResult.deviceId,
                hostname: deviceData.hostname,
                deviceType: deviceData.deviceType,
                customerId: targetCustomerId!,
                status: 'ONLINE',
            },
            message: registrationResult.message,
            capabilities: registrationResult.capabilities,
        });
    } catch (err) {
        console.error('❌ DEVICES POST: Failed to register device with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/register - Register a new device (DDD)
// ---------------------------------------------------------------------------

devicesRouter.post('/register', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 DEVICE REGISTER POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = req.body;

        console.log('📋 DEVICE REGISTER POST: Registration request:', {
            deviceId: body.deviceId,
            hostname: body.hostname,
            deviceType: body.deviceType,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

        const validationResult = deviceRegisterSchema.safeParse(body);
        if (!validationResult.success) {
            send.badRequest(res, 'Invalid device registration data', validationResult.errors);
            return;
        }

        if (!validationResult.data) {
            send.badRequest(res, 'Invalid device registration data');
            return;
        }

        const deviceData = validationResult.data;

        if (!deviceData.customerId) {
            if (!req.user?.customerId) {
                send.badRequest(res, 'Customer ID is required for device registration');
                return;
            }
            deviceData.customerId = req.user.customerId;
        }

        if (!deviceData.ownerId) {
            deviceData.ownerId = req.user?.id;
        }

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const registrationData: RegisterDeviceData = {
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
            customerId: deviceData.customerId,
        };

        const registerDeviceCommand = RegisterDeviceCompleteCommand.create(registrationData, tenantContext);

        const registrationResult = await commandBus.execute<typeof registerDeviceCommand, { deviceId: string; message: string; capabilities?: string[] }>(registerDeviceCommand);

        console.log('✅ DEVICE REGISTER POST: Device registered successfully:', {
            deviceId: registrationResult.deviceId,
            message: registrationResult.message,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

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
                status: 'ONLINE',
                registeredAt: new Date().toISOString(),
                owner: deviceData.ownerId ? { id: deviceData.ownerId } : null,
                customer: { id: deviceData.customerId },
                capabilities: registrationResult.capabilities || [],
            },
            registrationId: registrationResult.deviceId,
            timestamp: new Date().toISOString(),
        };

        send.created(res, response);
    } catch (err) {
        console.error('❌ DEVICE REGISTER POST: Failed to register device with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/activate - IoT device activation (no JWT, uses claiming token)
// ---------------------------------------------------------------------------

devicesRouter.post('/activate', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const result = activateSchema.safeParse(body);

        if (!result.success) {
            send.badRequest(res, 'Invalid request', result.errors);
            return;
        }

        if (!result.data) {
            send.badRequest(res, 'Invalid request');
            return;
        }

        const data = result.data;

        const tenantContext = TenantContextImpl.createSuperAdmin();

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const command = ProvisionDeviceCommand.create(data, tenantContext);

        const provisionResult = await commandBus.execute<ProvisionDeviceCommand, ProvisionDeviceResult>(command);

        logger.info('Device activated', {
            deviceId: data.deviceId,
            macAddress: data.macAddress,
            firmwareVersion: data.firmwareVersion,
        });

        send.ok(res, {
            credentials: {
                apiKey: provisionResult.apiKey,
                webhookUrl: provisionResult.webhookUrl,
            },
            config: provisionResult.config,
        });
    } catch (err) {
        logger.error('Failed to activate device', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/claim - Authenticated: claim an UNCLAIMED device
// ---------------------------------------------------------------------------

devicesRouter.post('/claim', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const body = req.body;
        const result = claimDeviceSchema.safeParse(body);

        if (!result.success) {
            send.badRequest(res, 'Invalid request', result.errors);
            return;
        }

        if (!result.data) {
            send.badRequest(res, 'Invalid request');
            return;
        }

        if (!req.user?.customerId) {
            send.forbidden(res, 'Customer account required to claim devices');
            return;
        }

        const tenantContext = TenantContextImpl.create(
            CustomerId.fromString(req.user.customerId),
        );

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const command = ClaimDeviceCommand.create(
            { deviceId: result.data.deviceId, name: result.data.name },
            req.user.id,
            tenantContext,
        );

        const claimResult = await commandBus.execute<ClaimDeviceCommand, ClaimDeviceResult>(command);

        logger.info('Device claimed', {
            deviceId: result.data.deviceId,
            userId: req.user.id,
            customerId: req.user.customerId,
        });

        send.ok(res, {
            deviceId: claimResult.deviceId,
            claimingToken: claimResult.claimingToken,
            expiresAt: claimResult.expiresAt,
            instructions: claimResult.instructions,
        });
    } catch (err) {
        logger.error('Failed to claim device', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/bulk - Bulk register devices
// ---------------------------------------------------------------------------

devicesRouter.post('/bulk', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 DEVICE BULK REGISTER POST: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const body = req.body;

        console.log('📋 DEVICE BULK REGISTER POST: Bulk registration request:', {
            deviceCount: body.devices?.length || 0,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

        const validationResult = bulkRegistrationSchema.safeParse(body);
        if (!validationResult.success) {
            send.badRequest(res, 'Invalid bulk registration data', validationResult.errors);
            return;
        }

        if (!validationResult.data) {
            send.badRequest(res, 'Invalid bulk registration data');
            return;
        }

        const { devices, customerId } = validationResult.data;

        const finalCustomerId = customerId || req.user?.customerId;
        if (!finalCustomerId) {
            send.badRequest(res, 'Customer ID is required for device registration');
            return;
        }

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const deviceRegistrationData: BulkDeviceRegistrationData[] = devices.map((device: any) => ({
            name: device.name,
            ipAddress: device.ipAddress,
            sshUsername: device.sshUsername,
            sshPassword: device.sshPassword || '',
            sshPort: device.sshPort,
        }));

        const bulkRegisterCommand = BulkRegisterDevicesCommand.create(
            deviceRegistrationData,
            finalCustomerId,
            tenantContext,
        );

        const bulkRegistrationResult = await commandBus.execute<typeof bulkRegisterCommand, { successful: any[]; failed: Array<{ data: { name: string; ipAddress: string }; error: string }> }>(bulkRegisterCommand);

        console.log('✅ DEVICE BULK REGISTER POST: Bulk registration completed:', {
            totalDevices: deviceRegistrationData.length,
            successfulRegistrations: bulkRegistrationResult.successful.length,
            failedRegistrations: bulkRegistrationResult.failed.length,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

        const response = {
            success: true,
            message: `Bulk registration completed. ${bulkRegistrationResult.successful.length}/${deviceRegistrationData.length} devices registered successfully.`,
            summary: {
                total: deviceRegistrationData.length,
                totalDevices: deviceRegistrationData.length,
                successful: bulkRegistrationResult.successful.length,
                failed: bulkRegistrationResult.failed.length,
            },
            results: {
                successful: bulkRegistrationResult.successful.map((device: any) => ({
                    id: device.id.getValue(),
                    deviceId: device.id.getValue(),
                    hostname: device.name.getValue(),
                    ipAddress: device.ipAddress.getValue(),
                    status: device.status.getValue(),
                    registeredAt: device.createdAt,
                    registrationId: device.id.getValue(),
                })),
                failed: bulkRegistrationResult.failed.map((failure: any) => ({
                    deviceName: failure.data.name,
                    ipAddress: failure.data.ipAddress,
                    error: failure.error,
                    reason: failure.error,
                })),
            },
            timestamp: new Date().toISOString(),
        };

        if (bulkRegistrationResult.failed.length > 0) {
            res.status(207).json({ success: false, error: 'Bulk registration completed with some failures', code: 'PARTIAL', timestamp: isoTimestamp(), details: response });
            return;
        }

        send.created(res, response);
    } catch (err) {
        console.error('❌ DEVICE BULK REGISTER POST: Failed to register devices in bulk with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/tailscale-register - IoT: API key auth, Tailscale metadata
// ---------------------------------------------------------------------------

devicesRouter.post('/tailscale-register', async (req: Request, res: Response) => {
    try {
        // 1. AUTHENTICATION - Validate API key
        const apiKey = req.headers['x-api-key'] as string | undefined ||
            (req.headers.authorization?.startsWith('ApiKey ')
                ? req.headers.authorization.substring(7)
                : undefined) ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.substring(7)
                : undefined);

        if (!apiKey) {
            logger.warn('Tailscale registration rejected - no API key', {
                endpoint: 'tailscale-register',
                ip: req.headers['x-forwarded-for'] as string || 'unknown',
            });
            send.unauthorized(res, 'API key required for device registration');
            return;
        }

        const { valid, user } = await validateApiKey(apiKey);
        if (!valid || !user) {
            logger.warn('Tailscale registration rejected - invalid API key', {
                endpoint: 'tailscale-register',
                ip: req.headers['x-forwarded-for'] as string || 'unknown',
            });
            send.unauthorized(res, 'Invalid API key');
            return;
        }

        // 2. INPUT VALIDATION
        const body = req.body;
        const validationResult = tailscaleRegisterSchema.safeParse(body);

        if (!validationResult.success) {
            logger.warn('Tailscale registration validation failed', {
                endpoint: 'tailscale-register',
                userId: user.id,
                errors: validationResult.errors?.map((e: any) => e.message) || [],
            });
            send.badRequest(res, 'Invalid registration data', validationResult.errors);
            return;
        }

        if (!validationResult.data) {
            send.badRequest(res, 'Invalid registration data');
            return;
        }

        const data = validationResult.data;

        // 3. EXTRACT TAILSCALE HEADERS
        const tailscaleUser = req.headers['x-tailscale-user'] as string | undefined;
        const tailscaleName = req.headers['x-tailscale-name'] as string | undefined;
        const tailscaleLogin = req.headers['x-tailscale-login'] as string | undefined;
        const tailscaleTailnet = req.headers['x-tailscale-tailnet'] as string | undefined;
        const clientIP = (req.headers['x-forwarded-for'] as string | undefined) ||
            (req.headers['x-real-ip'] as string | undefined) ||
            'unknown';

        // 4. CREATE TENANT CONTEXT
        if (!user.customerId) {
            send.badRequest(res, 'Customer ID required for device registration');
            return;
        }

        const tenantContext = TenantContextImpl.create(CustomerId.fromString(user.customerId));

        // 5. REGISTER DEVICE
        const serviceContainer = ServiceContainer.getInstance();
        const prismaClient = serviceContainer.getPrismaClient().getClient();

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
            userId: user.id,
        };

        const device = await prismaClient.device.upsert({
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
                updatedAt: new Date(),
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
                registeredAt: new Date(),
            },
        });

        // 6. LOG SUCCESS
        logger.info('Device registered via Tailscale', {
            endpoint: 'tailscale-register',
            deviceId: data.device_id,
            userId: user.id,
            customerId: user.customerId,
            tailscaleUser,
            tailscaleName,
        });

        // 7. RETURN RESPONSE
        send.created(res, {
            success: true,
            device: {
                id: device.id,
                deviceId: device.deviceId,
                hostname: device.hostname,
                status: device.status,
                registeredAt: device.registeredAt,
            },
            tailscale: {
                user: tailscaleUser,
                name: tailscaleName,
                login: tailscaleLogin,
                tailnet: tailscaleTailnet,
                ip: clientIP,
            },
        });
    } catch (err) {
        logger.error('Tailscale device registration failed', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id - Get device details
// ---------------------------------------------------------------------------

devicesRouter.get('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const publicId = req.params.id;
        const deviceId = await resolveDevicePublicId(publicId);
        if (!deviceId) {
            send.notFound(res, 'Device not found');
            return;
        }

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const getDeviceQuery = GetDeviceQuery.create(
            deviceId,
            req.user?.customerId || undefined,
            tenantContext,
        );

        const device = await queryBus.execute(getDeviceQuery);

        if (!device) {
            send.notFound(res, 'Device not found');
            return;
        }

        const response = {
            id: device.publicId || (device.id?.getValue ? device.id.getValue() : device.id),
            deviceId: device.publicId || (device.deviceId?.getValue ? device.deviceId.getValue() : device.deviceId),
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
            firmwareVersion: device.firmwareVersion || null,
            targetFirmwareVersion: device.targetFirmwareVersion || null,
            registeredAt: device.createdAt || device.registeredAt,
            updatedAt: device.updatedAt,
            user: device.ownerId ? {
                id: device.ownerId?.getValue ? device.ownerId.getValue() : device.ownerId,
                username: device.ownerName || 'Unknown',
                email: device.ownerEmail || 'unknown@example.com',
            } : null,
            customer: await (async () => {
                const cid = device.customerId?.getValue ? device.customerId.getValue() : device.customerId;
                if (!cid) return null;
                const customer = await serviceContainer.getPrismaClient().getClient().customer.findUnique({
                    where: { id: cid },
                    select: { id: true, name: true, slug: true },
                });
                return customer
                    ? { id: customer.id, name: customer.name, slug: customer.slug }
                    : { id: cid, name: 'Unknown', slug: 'unknown' };
            })(),
            alertsCount: await serviceContainer.getPrismaClient().getClient().alert.count({
                where: { deviceId, resolved: false },
            }),
        };

        // Fetch raw DB fields not exposed by the domain entity
        const rawDevice = await serviceContainer.getPrismaClient().getClient().device.findUnique({
            where: { id: deviceId },
            select: { status: true, metadata: true, deviceId: true },
        });
        const rawStatus = (rawDevice?.status as string) || null;
        const meta = (rawDevice?.metadata as Record<string, any>) || {};
        const pendingSetup = rawStatus === 'PENDING_SETUP' ? {
            claimingToken: meta.claimingToken || null,
            expiresAt: meta.claimingTokenExpiresAt || null,
            isExpired: meta.claimingTokenExpiresAt ? new Date() > new Date(meta.claimingTokenExpiresAt) : false,
        } : null;

        send.ok(res, { ...response, deviceId: rawDevice?.deviceId || response.deviceId, rawStatus, pendingSetup });
    } catch (err) {
        console.error('❌ DEVICE GET: Failed to fetch device details with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// PUT /devices/:id - Update device information
// ---------------------------------------------------------------------------

devicesRouter.put('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const publicId = req.params.id;
        const deviceId = await resolveDevicePublicId(publicId);
        if (!deviceId) {
            send.notFound(res, 'Device not found');
            return;
        }

        const body = req.body;

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const { UpdateDeviceCommand } = await import('@iotpilot/core/device/application/commands/update-device/update-device.command');

        const updateDeviceCommand = UpdateDeviceCommand.create(
            DeviceId.create(deviceId),
            tenantContext,
            body.hostname,
            body.ipAddress,
            body.sshUsername,
            body.sshPassword,
            body.sshPort ? Number(body.sshPort) : undefined,
            req.user?.customerId || undefined,
        );

        const updatedDevice = await commandBus.execute<typeof updateDeviceCommand, Device>(updateDeviceCommand);

        if (body.reportingInterval !== undefined) {
            const prismaClient = serviceContainer.getPrismaClient().getClient();
            const dev = await prismaClient.device.findUnique({ where: { id: deviceId }, select: { capabilities: true } });
            const caps = (dev?.capabilities as Record<string, any>) || {};
            await prismaClient.device.update({
                where: { id: deviceId },
                data: { capabilities: { ...caps, reportingInterval: Number(body.reportingInterval) } },
            });
        }

        const response = {
            device: {
                id: updatedDevice.publicId || updatedDevice.id.getValue(),
                deviceId: updatedDevice.publicId || updatedDevice.id.getValue(),
                hostname: updatedDevice.name.getValue(),
                ipAddress: updatedDevice.ipAddress?.getValue?.() ?? null,
                status: updatedDevice.status.getValue(),
                registeredAt: updatedDevice.createdAt,
                updatedAt: updatedDevice.updatedAt,
                sshPort: updatedDevice.sshCredentials?.port,
                sshUsername: updatedDevice.sshCredentials?.username,
            },
            message: 'Device updated successfully',
        };

        send.ok(res, response);
    } catch (err) {
        console.error('❌ DEVICE PUT: Failed to update device with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// DELETE /devices/:id - Delete a device
// ---------------------------------------------------------------------------

devicesRouter.delete('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const publicId = req.params.id;
        const deviceId = await resolveDevicePublicId(publicId);
        if (!deviceId) {
            send.notFound(res, 'Device not found');
            return;
        }

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const { RemoveDeviceCommand } = await import('@iotpilot/core/device/application/commands/remove-device/remove-device.command');

        const removeDeviceCommand = RemoveDeviceCommand.create(
            deviceId,
            req.user?.customerId || undefined,
            tenantContext,
        );

        await commandBus.execute(removeDeviceCommand);

        send.ok(res, { message: 'Device deleted successfully' });
    } catch (err) {
        console.error('❌ DEVICE DELETE: Failed to delete device with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/alerts - List alerts for a device
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/alerts', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const publicId = req.params.id;

        const deviceRecord = await prisma.getClient().device.findFirst({
            where: { publicId, ...(req.user?.role === 'SUPERADMIN' ? {} : { customerId: req.user!.customerId }) },
            select: { id: true },
        });
        if (!deviceRecord) {
            send.notFound(res, 'Device not found');
            return;
        }
        const deviceInternalId = deviceRecord.id;

        const severity = req.query.severity as string | undefined;
        const status = req.query.status as string | undefined;
        const type = req.query.type as string | undefined;
        const limit = parseInt(req.query.limit as string || '50');
        const offset = parseInt(req.query.offset as string || '0');

        const tenantId = resolveTenantId(req);
        if (!tenantId) {
            send.badRequest(res, 'Customer ID is required');
            return;
        }

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const domainSeverity = severity ? (FRONTEND_TO_DOMAIN_SEVERITY[severity.toUpperCase()] || severity) : undefined;
        const domainStatus = status ? status.toUpperCase() : undefined;

        const listAlertsQuery = ListAlertsQuery.create(
            tenantId,
            deviceInternalId,
            domainSeverity as any,
            domainStatus as any,
            undefined,
            undefined,
            limit,
            offset,
        );

        const result = await queryBus.execute(listAlertsQuery);
        let alerts = (result.alerts || []) as AlertEntity[];

        if (type) {
            alerts = alerts.filter((a: AlertEntity) => a.type?.getValue() === type);
        }

        const total = result.total || 0;
        const dtos = alerts.map((a: AlertEntity) => alertToDTO(a, publicId));

        const stats = {
            total: dtos.length,
            active: dtos.filter((a: any) => !a.resolved).length,
            resolved: dtos.filter((a: any) => a.resolved).length,
            critical: dtos.filter((a: any) => a.severity === 'CRITICAL' && !a.resolved).length,
            bySeverity: {
                INFO: dtos.filter((a: any) => a.severity === 'INFO').length,
                WARNING: dtos.filter((a: any) => a.severity === 'WARNING').length,
                ERROR: dtos.filter((a: any) => a.severity === 'ERROR').length,
                CRITICAL: dtos.filter((a: any) => a.severity === 'CRITICAL').length,
            },
        };

        const pagination = Pagination.fromOffset(offset, limit, total);
        send.ok(res, dtos, { pagination, stats });
    } catch (err) {
        console.error('Error fetching device alerts:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/:id/alerts - Create an alert for a device
// ---------------------------------------------------------------------------

devicesRouter.post('/:id/alerts', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const publicId = req.params.id;

        const callerTenantId = resolveTenantId(req);
        if (!callerTenantId && req.user?.role !== 'SUPERADMIN') {
            send.forbidden(res, 'Tenant context required');
            return;
        }
        const deviceRecord = await prisma.getClient().device.findFirst({
            where: {
                publicId,
                ...(callerTenantId ? { customerId: callerTenantId } : {}),
            },
            select: { id: true, customerId: true },
        });
        if (!deviceRecord) {
            send.notFound(res, 'Device not found');
            return;
        }

        const body = req.body;
        const { type, severity, title, message, metadata } = body;

        if (!severity || !title || !message) {
            send.badRequest(res, 'Missing required fields: severity, title, message');
            return;
        }

        const tenantId = callerTenantId ?? deviceRecord.customerId;

        if (!tenantId) {
            send.badRequest(res, 'Customer ID is required for alert creation');
            return;
        }

        const domainSeverity = FRONTEND_TO_DOMAIN_SEVERITY[severity.toUpperCase()] || 'LOW';
        const alertType = type || 'CUSTOM';

        const alertId = AlertId.create();
        const customerId = CustomerId.create(tenantId);

        const alert = AlertEntity.create(
            alertId,
            title,
            message,
            AlertSeverity.fromString(domainSeverity),
            AlertStatus.ACTIVE,
            DeviceId.create(deviceRecord.id),
            customerId,
            undefined, // metricName
            undefined, // metricValue
            undefined, // thresholdValue
            undefined, // thresholdId
            new Date(),
            undefined, // acknowledgedAt
            undefined, // acknowledgedBy
            undefined, // resolvedAt
            undefined, // resolvedBy
            undefined, // notes
            undefined, // type — stored via metadata.rawType
            { ...(metadata || {}), rawType: alertType },
        );

        const alertRepo = getAlertRepo();
        const saved = await alertRepo.save(alert);

        send.created(res, alertToDTO(saved, publicId));
    } catch (err) {
        console.error('Error creating alert:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/alerts/:alertId - Get a specific alert
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/alerts/:alertId', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const devicePublicId = req.params.id;
        const alertPublicId = req.params.alertId;

        const deviceRecord = await prisma.getClient().device.findFirst({
            where: { publicId: devicePublicId, ...(req.user?.role === 'SUPERADMIN' ? {} : { customerId: req.user!.customerId }) },
            select: { id: true },
        });
        if (!deviceRecord) {
            send.notFound(res, 'Device not found');
            return;
        }

        const alertRecord = await prisma.getClient().alert.findFirst({
            where: { publicId: alertPublicId, deviceId: deviceRecord.id },
            select: { id: true },
        });
        if (!alertRecord) {
            send.notFound(res, 'Alert not found');
            return;
        }

        const tenantId = resolveTenantId(req);
        if (!tenantId) {
            send.badRequest(res, 'Customer ID is required');
            return;
        }
        const alertRepo = getAlertRepo();
        const alert = await alertRepo.findById(
            AlertId.fromString(alertRecord.id),
            CustomerId.create(tenantId),
        );

        if (!alert) {
            send.notFound(res, 'Alert not found');
            return;
        }

        send.ok(res, alertToDTO(alert as AlertEntity, devicePublicId));
    } catch (err) {
        console.error('Error fetching alert:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// PATCH /devices/:id/alerts/:alertId - Acknowledge or resolve an alert
// ---------------------------------------------------------------------------

devicesRouter.patch('/:id/alerts/:alertId', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const devicePublicId = req.params.id;
        const alertPublicId = req.params.alertId;
        const body = req.body;

        const deviceRecord = await prisma.getClient().device.findFirst({
            where: { publicId: devicePublicId, ...(req.user?.role === 'SUPERADMIN' ? {} : { customerId: req.user!.customerId }) },
            select: { id: true },
        });
        if (!deviceRecord) {
            send.notFound(res, 'Device not found');
            return;
        }

        const alertRecord = await prisma.getClient().alert.findFirst({
            where: { publicId: alertPublicId, deviceId: deviceRecord.id },
            select: { id: true },
        });
        if (!alertRecord) {
            send.notFound(res, 'Alert not found');
            return;
        }

        const tenantId = resolveTenantId(req);
        if (!tenantId) {
            send.badRequest(res, 'Customer ID is required');
            return;
        }
        const userId = req.user?.id ?? 'system';

        const tenantContext = req.tenant ?? TenantContextImpl.createSuperAdmin();

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        if (body.action === 'acknowledge') {
            const cmd = AcknowledgeAlertCommand.create(alertRecord.id, userId, tenantId, tenantContext);
            await commandBus.execute(cmd);
        } else if (body.action === 'resolve') {
            const cmd = ResolveAlertCommand.create(alertRecord.id, userId, tenantId, tenantContext);
            await commandBus.execute(cmd);
        } else {
            send.badRequest(res, 'Invalid action. Supported: acknowledge, resolve');
            return;
        }

        const alertRepo = getAlertRepo();
        const updated = await alertRepo.findById(
            AlertId.fromString(alertRecord.id),
            CustomerId.create(tenantId),
        );

        send.ok(res, alertToDTO(updated as AlertEntity, devicePublicId));
    } catch (err) {
        console.error('Error updating alert:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// DELETE /devices/:id/alerts/:alertId - Delete an alert
// ---------------------------------------------------------------------------

devicesRouter.delete('/:id/alerts/:alertId', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const devicePublicId = req.params.id;
        const alertPublicId = req.params.alertId;

        const deviceRecord = await prisma.getClient().device.findFirst({
            where: { publicId: devicePublicId, ...(req.user?.role === 'SUPERADMIN' ? {} : { customerId: req.user!.customerId }) },
            select: { id: true },
        });
        if (!deviceRecord) {
            send.notFound(res, 'Device not found');
            return;
        }

        const alertRecord = await prisma.getClient().alert.findFirst({
            where: { publicId: alertPublicId, deviceId: deviceRecord.id },
            select: { id: true },
        });
        if (!alertRecord) {
            send.notFound(res, 'Alert not found');
            return;
        }

        const tenantId = resolveTenantId(req);
        if (!tenantId) {
            send.badRequest(res, 'Customer ID is required');
            return;
        }
        const userId = req.user?.id ?? 'system';

        const tenantContext = req.tenant ?? TenantContextImpl.createSuperAdmin();

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const cmd = DeleteAlertCommand.create(alertRecord.id, userId, tenantId, tenantContext);
        await commandBus.execute(cmd);

        send.ok(res, { message: 'Alert deleted successfully' });
    } catch (err) {
        console.error('Error deleting alert:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/commands - List device commands
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/commands', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    const publicId = req.params.id;
    const id = await resolveDevicePublicId(publicId);
    if (!id) {
        send.notFound(res, 'Device not found');
        return;
    }

    try {
        const limit = parseInt(req.query.limit as string || '10', 10);

        const device = await tenantPrisma.client.device.findUnique({ where: { id } });

        if (!device) {
            send.notFound(res, 'Device not found');
            return;
        }

        const commands = await tenantPrisma.client.deviceCommand.findMany({
            where: { deviceId: id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const formattedCommands = commands.map((c: any) => ({
            id: c.publicId || c.id,
            status: c.status,
            command: c.command,
            arguments: c.arguments,
            output: c.output,
            error: c.error,
            exitCode: c.exitCode,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));

        send.ok(res, formattedCommands);
    } catch (err) {
        commandLogger.error('Failed to fetch device commands:', {
            error: err instanceof Error ? err.message : String(err),
            deviceId: id,
        });
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/:id/commands - Issue a new command to a device
// ---------------------------------------------------------------------------

// Tight rate limit per user: max 10 commands/minute regardless of device
const commandRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => (req as AuthenticatedRequest).user?.id ?? req.ip ?? 'anon',
    message: { error: 'Too many commands issued. Wait before sending more.' },
    standardHeaders: true,
    legacyHeaders: false,
});

devicesRouter.post('/:id/commands', requireAuth('ADMIN'), commandRateLimit, async (req: AuthenticatedRequest, res: Response) => {
    const publicId = req.params.id;
    const id = await resolveDevicePublicId(publicId);
    if (!id) {
        send.notFound(res, 'Device not found');
        return;
    }

    try {
        const body = req.body;

        const validationResult = createCommandSchema.safeParse(body);
        if (!validationResult.success) {
            commandLogger.warn('Command creation validation failed', {
                deviceId: id,
                errors: validationResult.errors?.map((e: any) => e.message) || [],
            });
            send.badRequest(res, 'Invalid input', validationResult.errors);
            return;
        }

        if (!validationResult.data) {
            send.badRequest(res, 'Invalid input');
            return;
        }

        const { command: commandInput, arguments: commandArgs } = validationResult.data;
        const commandType = commandInput.toUpperCase() as keyof typeof SUPPORTED_COMMANDS;

        // CUSTOM command allows free-text arguments — restrict to SUPERADMIN
        if (commandType === 'CUSTOM' && req.user?.role !== 'SUPERADMIN') {
            send.forbidden(res, 'CUSTOM commands require SUPERADMIN role');
            return;
        }

        const device = await tenantPrisma.client.device.findUnique({ where: { id } });

        if (!device) {
            send.notFound(res, 'Device not found');
            return;
        }

        const command = await tenantPrisma.client.deviceCommand.create({
            data: {
                deviceId: id,
                command: SUPPORTED_COMMANDS[commandType],
                arguments: commandArgs,
                status: mapCommandStatusToPrisma(CommandStatus.PENDING),
            },
        });

        commandLogger.info(`Command created for device ${device.hostname}`, {
            deviceId: id,
            commandId: command.id,
            commandType,
            arguments: commandArgs,
        });

        try {
            if (typeof window === 'undefined') {
                if (!commandQueueModule) {
                    const { CommandQueueService } = await import('@iotpilot/core/device/application/services/command-queue.service');
                    const { ServiceContainer } = await import('@iotpilot/core/shared/infrastructure/container/service-container');
                    const serviceContainer = ServiceContainer.getInstance();
                    commandQueueModule = CommandQueueService.getInstance(
                        serviceContainer.getDeviceRepository(),
                        serviceContainer.getDeviceCommandRepository(),
                    );
                }
                await commandQueueModule.executeOrQueue(id, command.id);
            } else {
                commandLogger.warn('Command execution is only available on the server side');
            }
        } catch (queueError) {
            commandLogger.error(`Failed to queue command ${command.id}:`, {
                error: queueError instanceof Error ? queueError.message : String(queueError),
                deviceId: id,
                commandId: command.id,
            });
        }

        send.created(res, {
            command: {
                id: (command as any).publicId || command.id,
                status: command.status,
                command: command.command,
                arguments: command.arguments,
                createdAt: command.createdAt,
            },
            message: 'Command issued successfully',
        });
    } catch (err) {
        commandLogger.error('Failed to issue command:', {
            error: err instanceof Error ? err.message : String(err),
            deviceId: id,
        });
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/commands/:commandId - Get command details
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/commands/:commandId', async (req: Request, res: Response) => {
    try {
        // AUTHENTICATION
        const { user, error } = await authenticate(req as any);
        if (error || !user) {
            send.unauthorized(res, 'Unauthorized');
            return;
        }

        const internalId = await resolveDevicePublicId(req.params.id);
        if (!internalId) {
            send.notFound(res, 'Device not found');
            return;
        }

        const internalCommandId = await resolveCommandPublicId(req.params.commandId);
        if (!internalCommandId) {
            send.notFound(res, 'Command not found');
            return;
        }

        const tenantContext = user.customerId
            ? TenantContextImpl.create(CustomerId.fromString(user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const query = GetDeviceCommandQuery.create(internalId, internalCommandId, tenantContext);
        const command = await queryBus.execute(query);

        if (!command) {
            send.notFound(res, 'Command not found');
            return;
        }

        send.ok(res, { command });
    } catch (err) {
        logger.error('Failed to fetch command details', err instanceof Error ? err : undefined);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/logs - List device logs
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/logs', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const publicId = req.params.id;

        const deviceRecord = await prisma.getClient().device.findFirst({
            where: {
                publicId,
                ...(req.user?.role === 'SUPERADMIN' ? {} : { customerId: req.user!.customerId }),
            },
            select: { id: true, customerId: true },
        });
        if (!deviceRecord) {
            send.notFound(res, 'Device not found');
            return;
        }

        const level = (req.query.level as string)?.toUpperCase() as LogLevel | undefined;
        const search = req.query.search as string || '';
        const source = req.query.source as string || '';
        const limit = Math.min(parseInt(req.query.limit as string || '100'), 500);
        const offset = parseInt(req.query.offset as string || '0');

        const where: any = {
            deviceId: deviceRecord.id,
            deletedAt: null,
        };

        if (level && VALID_LEVELS.includes(level)) {
            where.level = level;
        }
        if (search) {
            where.message = { contains: search, mode: 'insensitive' };
        }
        if (source) {
            where.source = source;
        }

        const [logs, total, sources] = await Promise.all([
            prisma.getClient().deviceLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    level: true,
                    message: true,
                    source: true,
                    timestamp: true,
                },
            }),
            prisma.getClient().deviceLog.count({ where }),
            prisma.getClient().deviceLog.findMany({
                where: { deviceId: deviceRecord.id, deletedAt: null, source: { not: null } },
                select: { source: true },
                distinct: ['source'],
            }),
        ]);

        const pagination = Pagination.fromOffset(offset, limit, total);

        send.ok(res, logs, {
            pagination,
            sources: sources.map((s: { source: string | null }) => s.source).filter(Boolean),
            levels: VALID_LEVELS,
        });
    } catch (err) {
        console.error('Error fetching device logs:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/metrics - Get device metrics
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/metrics', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const publicId = req.params.id;
        const deviceId = await resolveDevicePublicId(publicId);
        if (!deviceId) {
            send.notFound(res, 'Device not found');
            return;
        }

        const metric = req.query.metric as string || 'all';
        const period = req.query.period as string || '24h';
        const resolution = req.query.resolution as string || 'auto';

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case '1h':
                startDate = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '6h':
                startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default: // 24h
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const { GetDeviceMetricsQuery } = await import('@iotpilot/core/device/application/queries/get-device-metrics/get-device-metrics.query');

        const getDeviceMetricsQuery = GetDeviceMetricsQuery.create(
            deviceId,
            { from: startDate, to: now },
            metric === 'all'
                ? ['cpu', 'memory', 'disk', 'network', 'temperature', 'battery_level', 'wifi_rssi']
                : metric.split(','),
            req.user?.customerId || undefined,
            tenantContext,
        );

        const metricsResult = await queryBus.execute(getDeviceMetricsQuery);

        const metricsByType: Record<string, Array<{ timestamp: Date; value: number; unit: string }>> = {};
        let totalPoints = 0;

        for (const series of metricsResult.metrics) {
            if (series.dataPoints && series.dataPoints.length > 0) {
                metricsByType[series.metricType] = series.dataPoints.map((dp: any) => ({
                    timestamp: dp.timestamp,
                    value: dp.value,
                    unit: series.unit,
                }));
                totalPoints += series.dataPoints.length;
            }
        }

        send.ok(res, {
            metrics: metricsByType,
            period,
            resolution,
            total_points: totalPoints,
            processed_points: totalPoints,
        });
    } catch (err) {
        console.error('❌ DEVICE METRICS GET: Failed to fetch device metrics with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/settings - Get device settings
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/settings', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    const publicId = req.params.id;
    const deviceId = await resolveDevicePublicId(publicId);
    if (!deviceId) {
        send.notFound(res, 'Device not found');
        return;
    }

    try {
        const device = await tenantPrisma.client.device.findUnique({ where: { id: deviceId } });

        if (!device) {
            send.notFound(res, 'Device not found');
            return;
        }

        const settingsUserId = req.user?.id || device.userId || '';

        const preferences = await tenantPrisma.client.userPreference.findMany({
            where: {
                userId: settingsUserId,
                category: 'DEVICE_SETTINGS',
                key: { startsWith: `device_${deviceId}_` },
            },
        });

        const caps = (device.capabilities as Record<string, any>) || {};
        const settings: Record<string, any> = {
            hostname: device.hostname,
            location: device.location,
            description: device.description,
            tags: [],
            reportingInterval: caps.reportingInterval ?? 300,
            heartbeatInterval: 120,
            metricsEnabled: true,
            cpuThreshold: 80,
            memoryThreshold: 85,
            temperatureThreshold: 70,
            diskThreshold: 90,
            networkMonitoring: true,
            autoUpdate: false,
            updateChannel: 'stable',
            sshEnabled: true,
            apiKeyRotationDays: 30,
        };

        preferences.forEach((pref: { key: string; value: string }) => {
            const settingKey = pref.key.replace(`device_${deviceId}_`, '');
            try {
                let value: any = pref.value;
                if (['metricsEnabled', 'networkMonitoring', 'autoUpdate', 'sshEnabled'].includes(settingKey)) {
                    value = value === 'true';
                } else if (['heartbeatInterval', 'cpuThreshold', 'memoryThreshold', 'temperatureThreshold', 'diskThreshold', 'sensorTempThreshold', 'batteryThreshold', 'reportingInterval', 'apiKeyRotationDays'].includes(settingKey)) {
                    value = parseInt(value);
                } else if (settingKey === 'tags') {
                    value = JSON.parse(value);
                }
                settings[settingKey] = value;
            } catch (err) {
                settingsLogger.warn(`Failed to parse setting ${settingKey}:`, err);
            }
        });

        send.ok(res, settings);
    } catch (err) {
        settingsLogger.error('Failed to fetch device settings:', {
            error: err instanceof Error ? err.message : String(err),
            deviceId,
        });
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// PUT /devices/:id/settings - Update device settings
// ---------------------------------------------------------------------------

devicesRouter.put('/:id/settings', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    const publicId = req.params.id;
    const deviceId = await resolveDevicePublicId(publicId);
    if (!deviceId) {
        send.notFound(res, 'Device not found');
        return;
    }

    try {
        const body = req.body;
        // Strip null values before validation
        const sanitized = Object.fromEntries(
            Object.entries(body).filter(([, val]) => val !== null),
        );
        const validatedSettings = deviceSettingsSchema.parse(sanitized);

        const device = await tenantPrisma.client.device.findUnique({ where: { id: deviceId } });

        if (!device) {
            send.notFound(res, 'Device not found');
            return;
        }

        const deviceUpdates: any = {};
        if (validatedSettings.hostname !== undefined) {
            deviceUpdates.hostname = validatedSettings.hostname;
        }
        if (validatedSettings.location !== undefined) {
            deviceUpdates.location = validatedSettings.location;
        }
        if (validatedSettings.description !== undefined) {
            deviceUpdates.description = validatedSettings.description;
        }
        if (validatedSettings.deviceType !== undefined) {
            deviceUpdates.deviceType = validatedSettings.deviceType;
        }

        if (validatedSettings.reportingInterval !== undefined) {
            const current = await tenantPrisma.client.device.findUnique({
                where: { id: deviceId },
                select: { capabilities: true },
            });
            const caps = (current?.capabilities as Record<string, any>) || {};
            deviceUpdates.capabilities = { ...caps, reportingInterval: validatedSettings.reportingInterval };
        }

        if (Object.keys(deviceUpdates).length > 0) {
            await tenantPrisma.client.device.update({
                where: { id: deviceId },
                data: { ...deviceUpdates, updatedAt: new Date() },
            });
        }

        const settingsToStore = { ...validatedSettings } as Record<string, any>;
        delete settingsToStore.reportingInterval;
        delete settingsToStore.hostname;
        delete settingsToStore.location;
        delete settingsToStore.description;

        for (const [key, value] of Object.entries(settingsToStore)) {
            if (value !== undefined) {
                const preferenceKey = `device_${deviceId}_${key}`;
                let stringValue: string;

                if (typeof value === 'boolean') {
                    stringValue = value.toString();
                } else if (typeof value === 'number') {
                    stringValue = value.toString();
                } else if (Array.isArray(value)) {
                    stringValue = JSON.stringify(value);
                } else {
                    stringValue = String(value);
                }

                const prefUserId = req.user?.id || device.userId || '';
                await tenantPrisma.client.userPreference.upsert({
                    where: {
                        userId_category_key: {
                            userId: prefUserId,
                            category: 'DEVICE_SETTINGS',
                            key: preferenceKey,
                        },
                    },
                    update: {
                        value: stringValue,
                        updatedAt: new Date(),
                    },
                    create: {
                        userId: prefUserId,
                        category: 'DEVICE_SETTINGS',
                        key: preferenceKey,
                        value: stringValue,
                    },
                });
            }
        }

        settingsLogger.info('Device settings updated:', {
            deviceId,
            updatedFields: Object.keys(validatedSettings),
        });

        send.ok(res, {
            message: 'Device settings updated successfully',
            settings: validatedSettings,
        });
    } catch (err) {
        settingsLogger.error('Failed to update device settings:', {
            error: err instanceof Error ? err.message : String(err),
            deviceId,
        });
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/:id/ssh - Execute SSH command on device
// ---------------------------------------------------------------------------

devicesRouter.post('/:id/ssh', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 DEVICE SSH: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const commandBus = serviceContainer.getCommandBus();

        const publicId = req.params.id;
        const deviceRecord = await prisma.getClient().device.findFirst({
            where: { publicId, ...(req.user?.role === 'SUPERADMIN' ? {} : { customerId: req.user!.customerId }) },
            select: { id: true },
        });
        if (!deviceRecord) {
            send.notFound(res, 'Device not found');
            return;
        }
        const deviceId = deviceRecord.id;

        const body = req.body;
        const { command, timeout } = sshCommandSchema.parse(body);

        console.log('📋 DEVICE SSH: Command execution request:', {
            deviceId,
            command: command.substring(0, 100) + (command.length > 100 ? '...' : ''),
            timeout,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const executeSSHCommand = new ExecuteSshCommandCommand(deviceId, command, tenantContext);

        const result = await commandBus.execute<ExecuteSshCommandCommand, { output: string; error: string | null }>(executeSSHCommand);

        console.log('✅ DEVICE SSH: Command executed successfully:', {
            deviceId,
            success: true,
            outputLength: result.output?.length || 0,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

        send.ok(res, {
            success: true,
            output: result.output,
            error: result.error,
        });
    } catch (err) {
        console.error('❌ DEVICE SSH: Failed to execute SSH command:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// GET /devices/:id/status - Get device status
// ---------------------------------------------------------------------------

devicesRouter.get('/:id/status', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log('🔐 DEVICE STATUS GET: Starting with DDD architecture');

        const serviceContainer = ServiceContainer.getInstance();
        const queryBus = serviceContainer.getQueryBus();

        const publicId = req.params.id;
        const deviceId = await resolveDevicePublicId(publicId);
        if (!deviceId) {
            send.notFound(res, 'Device not found');
            return;
        }

        const includeMetrics = req.query.metrics !== 'false';

        console.log('📋 DEVICE STATUS GET: Query params:', {
            publicId,
            includeMetrics,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

        const tenantContext = req.user?.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user.customerId))
            : TenantContextImpl.createSuperAdmin();

        const getDeviceStatusQuery = GetDeviceStatusQuery.create(
            deviceId,
            includeMetrics,
            req.user?.customerId || undefined,
            tenantContext,
        );

        const deviceStatus = await queryBus.execute(getDeviceStatusQuery);

        console.log('✅ DEVICE STATUS GET: Device status retrieved successfully:', {
            publicId,
            isOnline: deviceStatus.isOnline,
            userRole: req.user?.role,
            customerId: req.user?.customerId,
        });

        const statusValue = typeof deviceStatus.status === 'string'
            ? deviceStatus.status
            : deviceStatus.status?.name || deviceStatus.status?.value || 'UNKNOWN';

        const response = {
            device: {
                id: publicId,
                deviceId: publicId,
                status: statusValue,
                lastSeen: deviceStatus.lastSeen || null,
                ipAddress: deviceStatus.ipAddress || null,
                tailscaleIp: deviceStatus.tailscaleIp || null,
            },
            connectivity: {
                isOnline: deviceStatus.isOnline || false,
                quality: deviceStatus.connectionQuality || 'disconnected',
                lastHeartbeat: deviceStatus.lastHeartbeat || null,
            },
            metrics: includeMetrics ? (deviceStatus.metrics || null) : null,
            timestamp: new Date().toISOString(),
        };

        send.ok(res, response);
    } catch (err) {
        console.error('❌ DEVICE STATUS GET: Failed to fetch device status with DDD:', err);
        send.fromError(res, err);
    }
});

// ---------------------------------------------------------------------------
// POST /devices/:id/rotate-key — Rotate the device API key (ADMIN only)
// ---------------------------------------------------------------------------

devicesRouter.post('/:id/rotate-key', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const publicId = req.params.id;
        const callerCustomerId = req.user?.customerId;

        // Find device scoped to caller's tenant
        const where = callerCustomerId
            ? { publicId, customerId: callerCustomerId, deletedAt: null }
            : { publicId, deletedAt: null };

        const device = await prisma.getClient().device.findFirst({
            where,
            select: { id: true, deviceId: true, userId: true, customerId: true, name: true },
        });

        if (!device) {
            send.notFound(res, 'Device not found');
            return;
        }

        if (!device.userId) {
            send.badRequest(res, 'Device has no associated user — cannot rotate API key');
            return;
        }

        // Find existing active API key for this device
        const existingKeys = await prisma.getClient().apiKey.findMany({
            where: {
                userId: device.userId,
                customerId: device.customerId ?? undefined,
                deletedAt: null,
                name: { contains: device.deviceId },
            },
            select: { id: true },
        });

        // Soft-delete all matching old keys
        if (existingKeys.length > 0) {
            await prisma.getClient().apiKey.updateMany({
                where: { id: { in: existingKeys.map(k => k.id) } },
                data: { deletedAt: new Date() },
            });
        }

        // Generate new key (same format as provision-device handler)
        const raw = crypto.randomBytes(24).toString('base64url');
        const newKey = `iotp_sensor_${raw}`;

        await prisma.getClient().apiKey.create({
            data: {
                id: createId(),
                userId: device.userId,
                customerId: device.customerId ?? undefined,
                name: `Sensor ${device.deviceId}`,
                key: newKey,
            },
        });

        send.ok(res, {
            message: 'API key rotated successfully. The device will go offline until it reconnects with the new key.',
            apiKey: newKey,
            deviceId: device.deviceId,
            rotatedAt: new Date().toISOString(),
        });
    } catch (err) {
        send.fromError(res, err);
    }
});

/**
 * POST /api/devices/:id/request-ota
 *
 * Request an OTA firmware update for a device. Sets targetFirmwareVersion on the device
 * record; the device will receive the directive on its next heartbeat or sensor report.
 * ADMIN / SUPERADMIN only.
 */
devicesRouter.post('/:id/request-ota', requireAuth('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { targetVersion } = req.body;

        if (!targetVersion || typeof targetVersion !== 'string' || !targetVersion.trim()) {
            send.badRequest(res, 'targetVersion is required');
            return;
        }

        const tenantContext = req.user!.customerId
            ? TenantContextImpl.create(CustomerId.create(req.user!.customerId))
            : TenantContextImpl.createSuperAdmin();

        const commandBus = ServiceContainer.getInstance().getCommandBus();
        const result = await commandBus.execute<RequestFirmwareUpdateCommand, RequestFirmwareUpdateResult>(
            new RequestFirmwareUpdateCommand(tenantContext, id, targetVersion.trim()),
        );

        send.ok(res, result);
    } catch (err) {
        send.fromError(res, err);
    }
});
