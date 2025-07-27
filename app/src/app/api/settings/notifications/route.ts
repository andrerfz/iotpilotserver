import {validator} from '@/lib/shared/infrastructure/validation/validation-helper';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/shared/infrastructure/middleware/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {getUserPreferences} from '@/lib/user-preferences';
import {ApiResponse} from '@/lib/shared/infrastructure/http/api-response.util';
import {z} from 'zod';

// Dynamic route: reads auth from cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Validation schema for notifications settings
const v = validator();
const notificationsSettingsSchema = v.object({
    emailNotifications: v.enum(['true', 'false'] as const),
    pushNotifications: v.enum(['true', 'false'] as const),
    alertNotifications: v.enum(['true', 'false'] as const),
    deviceOfflineNotifications: v.enum(['true', 'false'] as const)
});

// GET /api/settings/notifications - Get notifications settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Get notifications preferences with defaults
        const preferences = await getUserPreferences(user.id, 'NOTIFICATIONS');

        return ApiResponse.ok(preferences);
    } catch (error) {
        console.error('Failed to fetch notifications settings:', error);
        return ApiResponse.internalError('Failed to fetch notifications settings');
    }
});

// PUT /api/settings/notifications - Update notifications settings
export const PUT = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return ApiResponse.unauthorized('Authentication required');
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = notificationsSettingsSchema.parse(body);

        // Update each preference
        const updatePromises = Object.entries(validatedData).map(([key, value]) =>
            tenantPrisma.client.userPreference.upsert({
                where: {
                    userId_category_key: {
                        userId: user.id,
                        category: 'NOTIFICATIONS',
                        key
                    }
                },
                update: {value: String(value)},
                create: {
                    userId: user.id,
                    category: 'NOTIFICATIONS',
                    key,
                    value: String(value)
                }
            })
        );

        await Promise.all(updatePromises);

        return ApiResponse.ok({
            message: 'Notifications settings updated successfully',
            settings: validatedData
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest('Invalid input', error.errors.map(err => ({
                path: err.path.join('.'),
                message: err.message
            })));
        }

        console.error('Failed to update notifications settings:', error);
        return ApiResponse.internalError('Failed to update notifications settings');
    }
});
