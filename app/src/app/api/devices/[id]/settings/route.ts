import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {StructuredLogger} from '@/lib/shared/infrastructure/logging/structured-logger';
import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod';

const logger = StructuredLogger.forService('device-settings-api');

// Device settings validation schema
const v = validator();
const deviceSettingsSchema = v.object({
    // Device Info
    hostname: v.optional(v.string({ min: 1, max: 100 })),
    location: v.optional(v.string({ max: 200 })),
    description: v.optional(v.string({ max: 500 })),
    tags: v.optional(v.array(v.string({ max: 50 }))),

    // Monitoring
    heartbeatInterval: v.optional(v.number({ min: 30, max: 600 })),
    metricsEnabled: v.optional(v.boolean()),
    cpuThreshold: v.optional(v.number({ min: 50, max: 100 })),
    memoryThreshold: v.optional(v.number({ min: 50, max: 100 })),
    temperatureThreshold: v.optional(v.number({ min: 40, max: 100 })),
    diskThreshold: v.optional(v.number({ min: 70, max: 100 })),

    // Network
    networkMonitoring: v.optional(v.boolean()),

    // Agent
    autoUpdate: v.optional(v.boolean()),
    updateChannel: v.optional(v.enum(['stable', 'beta', 'nightly'] as const)),

    // Security
    sshEnabled: z.boolean().optional(),
    apiKeyRotationDays: z.number().min(7).max(365).optional(),
});

// GET /api/devices/[id]/settings - Get device settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    // Extract device ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[pathParts.indexOf('devices') + 1];

    try {
        // Check if device exists and belongs to the tenant
        const device = await tenantPrisma.client.device.findUnique({
            where: { id: deviceId },
        });

        if (!device) {
            return ApiResponse.notFound('Device not found');
        }

        // Try to get device settings from preferences or use defaults
        const preferences = await tenantPrisma.client.userPreference.findMany({
            where: {
                userId: device.userId || '',
                category: 'DEVICE_SETTINGS',
                key: { startsWith: `device_${deviceId}_` }
            }
        });

        // Convert preferences to settings object
        const settings = {
            // Device Info (from device record)
            hostname: device.hostname,
            location: device.location,
            description: device.description,
            tags: [], // TODO: Implement tags when device model supports it

            // Monitoring defaults (can be overridden by preferences)
            heartbeatInterval: 120,
            metricsEnabled: true,
            cpuThreshold: 80,
            memoryThreshold: 85,
            temperatureThreshold: 70,
            diskThreshold: 90,

            // Network defaults
            networkMonitoring: true,

            // Agent defaults
            autoUpdate: false,
            updateChannel: 'stable' as const,

            // Security defaults
            sshEnabled: true,
            apiKeyRotationDays: 30,
        };

        // Override with stored preferences
        preferences.forEach((pref: { key: string; value: string }) => {
            const settingKey = pref.key.replace(`device_${deviceId}_`, '');
            try {
                // Parse the value based on the key
                let value: any = pref.value;

                // Convert string values to appropriate types
                if (['metricsEnabled', 'networkMonitoring', 'autoUpdate', 'sshEnabled'].includes(settingKey)) {
                    value = value === 'true';
                } else if (['heartbeatInterval', 'cpuThreshold', 'memoryThreshold', 'temperatureThreshold', 'diskThreshold', 'apiKeyRotationDays'].includes(settingKey)) {
                    value = parseInt(value);
                } else if (settingKey === 'tags') {
                    value = JSON.parse(value);
                }

                (settings as any)[settingKey] = value;
            } catch (err) {
                logger.warn(`Failed to parse setting ${settingKey}:`, err);
            }
        });

        return ApiResponse.ok(settings);

    } catch (error) {
        logger.error('Failed to fetch device settings:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId
        });
        return ApiResponse.internalError('Failed to fetch device settings');
    }
});

// PUT /api/devices/[id]/settings - Update device settings
export const PUT = withCustomerContext(async (request: AuthenticatedRequest) => {
    // Extract device ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const deviceId = pathParts[pathParts.indexOf('devices') + 1];

    try {
        const body = await request.json();
        const validatedSettings = deviceSettingsSchema.parse(body);

        // Check if device exists and belongs to the tenant
        const device = await tenantPrisma.client.device.findUnique({
            where: { id: deviceId },
        });

        if (!device) {
            return ApiResponse.notFound('Device not found');
        }

        // Update device basic info if provided
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

        if (Object.keys(deviceUpdates).length > 0) {
            await tenantPrisma.client.device.update({
                where: { id: deviceId },
                data: {
                    ...deviceUpdates,
                    updatedAt: new Date()
                }
            });
        }

        // Store other settings as user preferences
        const settingsToStore = { ...validatedSettings };
        delete settingsToStore.hostname;
        delete settingsToStore.location;
        delete settingsToStore.description;

        // Store each setting as a user preference
        for (const [key, value] of Object.entries(settingsToStore)) {
            if (value !== undefined) {
                const preferenceKey = `device_${deviceId}_${key}`;
                let stringValue: string;

                // Convert value to string for storage
                if (typeof value === 'boolean') {
                    stringValue = value.toString();
                } else if (typeof value === 'number') {
                    stringValue = value.toString();
                } else if (Array.isArray(value)) {
                    stringValue = JSON.stringify(value);
                } else {
                    stringValue = String(value);
                }

                await tenantPrisma.client.userPreference.upsert({
                    where: {
                        userId_category_key: {
                            userId: device.userId || '',
                            category: 'DEVICE_SETTINGS',
                            key: preferenceKey
                        }
                    },
                    update: {
                        value: stringValue,
                        updatedAt: new Date()
                    },
                    create: {
                        userId: device.userId || '',
                        category: 'DEVICE_SETTINGS',
                        key: preferenceKey,
                        value: stringValue
                    }
                });
            }
        }

        logger.info('Device settings updated:', {
            deviceId,
            updatedFields: Object.keys(validatedSettings)
        });

        return ApiResponse.ok({
            message: 'Device settings updated successfully',
            settings: validatedSettings
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid settings data', error.errors);
        }

        logger.error('Failed to update device settings:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId
        });
        return ApiResponse.internalError('Failed to update device settings');
    }
});