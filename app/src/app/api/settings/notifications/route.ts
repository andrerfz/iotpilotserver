import {NextResponse} from 'next/server';
import {z} from 'zod';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {getUserPreferences} from '@/lib/user-preferences';

// Validation schema for notifications settings
const notificationsSettingsSchema = z.object({
    emailNotifications: z.enum(['true', 'false']),
    pushNotifications: z.enum(['true', 'false']),
    alertNotifications: z.enum(['true', 'false']),
    deviceOfflineNotifications: z.enum(['true', 'false'])
});

// GET /api/settings/notifications - Get notifications settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        // Get notifications preferences with defaults
        const preferences = await getUserPreferences(user.id, 'NOTIFICATIONS');

        return NextResponse.json(preferences);
    } catch (error) {
        console.error('Failed to fetch notifications settings:', error);
        return NextResponse.json(
            {error: 'Failed to fetch notifications settings'},
            {status: 500}
        );
    }
});

// PUT /api/settings/notifications - Update notifications settings
export const PUT = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
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

        return NextResponse.json({
            message: 'Notifications settings updated successfully',
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

        console.error('Failed to update notifications settings:', error);
        return NextResponse.json(
            {error: 'Failed to update notifications settings'},
            {status: 500}
        );
    }
});
