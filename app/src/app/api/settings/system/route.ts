import {NextResponse} from 'next/server';
import {z} from 'zod';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {getUserPreferences} from '@/lib/user-preferences';

// Validation schema for system settings
const systemSettingsSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']),
    dashboardLayout: z.enum(['default', 'compact', 'expanded']),
    itemsPerPage: z.string().regex(/^\d+$/) // numeric string
});

// Additional admin-only settings schema
const adminSystemSettingsSchema = systemSettingsSchema.extend({
    enableAdvancedMetrics: z.enum(['true', 'false']),
    enableBetaFeatures: z.enum(['true', 'false']),
    logLevel: z.enum(['debug', 'info', 'warn', 'error'])
});

// GET /api/settings/system - Get system settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        // Get system preferences with defaults
        const preferences = await getUserPreferences(user.id, 'SYSTEM');

        // If user is admin or superadmin, include admin-only settings
        const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
        if (isAdmin) {
            // Get system config settings
            const systemConfig = await tenantPrisma.client.systemConfig.findMany({
                where: {
                    category: 'system'
                }
            });

            // Add admin-only settings
            const adminSettings = systemConfig.reduce((acc, config) => {
                acc[config.key] = config.value;
                return acc;
            }, {} as Record<string, string>);

            // Add default admin settings if not present
            if (!adminSettings.enableAdvancedMetrics) {
                adminSettings.enableAdvancedMetrics = 'false';
            }
            if (!adminSettings.enableBetaFeatures) {
                adminSettings.enableBetaFeatures = 'false';
            }
            if (!adminSettings.logLevel) {
                adminSettings.logLevel = 'info';
            }

            // Merge with user preferences
            return NextResponse.json({
                ...preferences,
                ...adminSettings,
                isAdmin: 'true'
            });
        }

        return NextResponse.json(preferences);
    } catch (error) {
        console.error('Failed to fetch system settings:', error);
        return NextResponse.json(
            {error: 'Failed to fetch system settings'},
            {status: 500}
        );
    }
});

// PUT /api/settings/system - Update system settings
export const PUT = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        // Parse request body
        const body = await request.json();

        // Check if user is admin
        const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';

        // Validate based on user role
        let validatedData;
        if (isAdmin) {
            validatedData = adminSystemSettingsSchema.parse(body);
        } else {
            validatedData = systemSettingsSchema.parse(body);
        }

        // Additional validation for itemsPerPage
        const itemsPerPage = parseInt(validatedData.itemsPerPage);
        if (isNaN(itemsPerPage) || itemsPerPage < 5 || itemsPerPage > 100) {
            return NextResponse.json(
                {error: 'Items per page must be between 5 and 100'},
                {status: 400}
            );
        }

        // Separate user preferences from system config settings
        const userPrefs: Record<string, string> = {};
        const systemConfigSettings: Record<string, string> = {};

        Object.entries(validatedData).forEach(([key, value]) => {
            if (isAdmin && ['enableAdvancedMetrics', 'enableBetaFeatures', 'logLevel'].includes(key)) {
                systemConfigSettings[key] = String(value);
            } else {
                userPrefs[key] = String(value);
            }
        });

        // Update user preferences
        const updatePromises = Object.entries(userPrefs).map(([key, value]) =>
            tenantPrisma.client.userPreference.upsert({
                where: {
                    userId_category_key: {
                        userId: user.id,
                        category: 'SYSTEM',
                        key
                    }
                },
                update: {value},
                create: {
                    userId: user.id,
                    category: 'SYSTEM',
                    key,
                    value
                }
            })
        );

        await Promise.all(updatePromises);

        // If admin, update system config settings
        if (isAdmin && Object.keys(systemConfigSettings).length > 0) {
            const systemConfigPromises = Object.entries(systemConfigSettings).map(([key, value]) =>
                tenantPrisma.client.systemConfig.upsert({
                    where: {key},
                    update: {
                        value,
                        category: 'system',
                        updatedAt: new Date()
                    },
                    create: {
                        key,
                        value,
                        category: 'system',
                        updatedAt: new Date()
                    }
                })
            );

            await Promise.all(systemConfigPromises);
        }

        return NextResponse.json({
            message: 'System settings updated successfully',
            settings: validatedData
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid input',
                    details: error.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }))
                },
                {status: 400}
            );
        }

        console.error('Failed to update system settings:', error);
        return NextResponse.json(
            {error: 'Failed to update system settings'},
            {status: 500}
        );
    }
});
