import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {getUserPreferences} from '@/lib/user-preferences';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod'; // Keep for regex and extend

// Dynamic route: reads auth from cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Validation schema for system settings
// Note: Using Zod for extend() and regex - can be migrated later
const v = validator();
const regexStringSchema = z.string().regex(/^\d+$/);
const systemSettingsSchemaZod = z.object({
    theme: z.enum(['light', 'dark', 'system']),
    dashboardLayout: z.enum(['default', 'compact', 'expanded']),
    itemsPerPage: regexStringSchema // numeric string
});
const systemSettingsSchema = (v as any).fromZodSchema(systemSettingsSchemaZod);

// Additional admin-only settings schema
const adminSystemSettingsSchemaZod = systemSettingsSchemaZod.extend({
    enableAdvancedMetrics: z.enum(['true', 'false']),
    enableBetaFeatures: z.enum(['true', 'false']),
    logLevel: z.enum(['debug', 'info', 'warn', 'error'])
});
const adminSystemSettingsSchema = (v as any).fromZodSchema(adminSystemSettingsSchemaZod);

// GET /api/settings/system - Get system settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return ApiResponse.unauthorized('Authentication required');
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
            const adminSettings = systemConfig.reduce((acc: Record<string, string>, config: { key: string; value: string }) => {
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
            return ApiResponse.ok({
                ...preferences,
                ...adminSettings,
                isAdmin: 'true'
            });
        }

        return ApiResponse.ok(preferences);
    } catch (error) {
        console.error('Failed to fetch system settings:', error);
        return ApiResponse.internalError('Failed to fetch system settings');
    }
});

// PUT /api/settings/system - Update system settings
export const PUT = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Parse request body
        const body = await (request as any).json();

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
            return ApiResponse.badRequest('Items per page must be between 5 and 100');
        }

        // Separate user preferences from system config settings
        const userPrefs: Record<string, string> = {};
        const systemConfigSettings: Record<string, string> = {};

        Object.entries(validatedData).forEach(([key, value]: [string, any]) => {
            if (isAdmin && ['enableAdvancedMetrics', 'enableBetaFeatures', 'logLevel'].includes(key)) {
                systemConfigSettings[key] = String(value);
            } else {
                userPrefs[key] = String(value);
            }
        });

        // Update user preferences
        const updatePromises = Object.entries(userPrefs).map(([key, value]: [string, string]) =>
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
            const systemConfigPromises = Object.entries(systemConfigSettings).map(([key, value]: [string, string]) =>
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

        return ApiResponse.ok({
            message: 'System settings updated successfully',
            settings: validatedData
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid input', (error as z.ZodError).errors.map((err: z.ZodIssue) => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        console.error('Failed to update system settings:', error);
        return ApiResponse.internalError('Failed to update system settings');
    }
});
