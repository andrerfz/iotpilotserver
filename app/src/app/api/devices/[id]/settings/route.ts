import { NextRequest, NextResponse } from 'next/server';
import { AuthenticatedRequest, withCustomerContext } from '@/lib/api-middleware';
import { tenantPrisma } from '@/lib/tenant-middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Device settings validation schema
const deviceSettingsSchema = z.object({
    // Device Info
    hostname: z.string().min(1).max(100).optional(),
    location: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    tags: z.array(z.string().max(50)).optional(),

    // Monitoring
    heartbeatInterval: z.number().min(30).max(600).optional(),
    metricsEnabled: z.boolean().optional(),
    cpuThreshold: z.number().min(50).max(100).optional(),
    memoryThreshold: z.number().min(50).max(100).optional(),
    temperatureThreshold: z.number().min(40).max(100).optional(),
    diskThreshold: z.number().min(70).max(100).optional(),

    // Network
    networkMonitoring: z.boolean().optional(),

    // Agent
    autoUpdate: z.boolean().optional(),
    updateChannel: z.enum(['stable', 'beta', 'nightly']).optional(),

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
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
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
        preferences.forEach(pref => {
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

        return NextResponse.json(settings);

    } catch (error) {
        logger.error('Failed to fetch device settings:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId
        });
        return NextResponse.json(
            { error: 'Failed to fetch device settings' },
            { status: 500 }
        );
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
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
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

        return NextResponse.json({
            message: 'Device settings updated successfully',
            settings: validatedSettings
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid settings data',
                    details: error.errors
                },
                { status: 400 }
            );
        }

        logger.error('Failed to update device settings:', {
            error: error instanceof Error ? error.message : String(error),
            deviceId
        });
        return NextResponse.json(
            { error: 'Failed to update device settings' },
            { status: 500 }
        );
    }
});