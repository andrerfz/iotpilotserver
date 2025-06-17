import {NextResponse} from 'next/server';
import {z} from 'zod';
import {AuthenticatedRequest, withCustomerContext} from '@/lib/api-middleware';
import {tenantPrisma} from '@/lib/tenant-middleware';
import {getUserPreferences} from '@/lib/user-preferences';

// Validation schema for profile settings
const profileSettingsSchema = z.object({
    language: z.string().min(2).max(5),
    timezone: z.string().min(1),
    dateFormat: z.string().min(1)
});

// GET /api/settings/profile - Get profile settings
export const GET = withCustomerContext(async (request: AuthenticatedRequest) => {
    try {
        const user = request.user;
        if (!user) {
            return NextResponse.json(
                {error: 'Authentication required'},
                {status: 401}
            );
        }

        // Get profile preferences with defaults
        const preferences = await getUserPreferences(user.id, 'PROFILE');

        return NextResponse.json(preferences);
    } catch (error) {
        console.error('Failed to fetch profile settings:', error);
        return NextResponse.json(
            {error: 'Failed to fetch profile settings'},
            {status: 500}
        );
    }
});

// PUT /api/settings/profile - Update profile settings
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
        const validatedData = profileSettingsSchema.parse(body);

        // Update each preference
        const updatePromises = Object.entries(validatedData).map(([key, value]) =>
            tenantPrisma.client.userPreference.upsert({
                where: {
                    userId_category_key: {
                        userId: user.id,
                        category: 'PROFILE',
                        key
                    }
                },
                update: {value: String(value)},
                create: {
                    userId: user.id,
                    category: 'PROFILE',
                    key,
                    value: String(value)
                }
            })
        );

        await Promise.all(updatePromises);

        return NextResponse.json({
            message: 'Profile settings updated successfully',
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

        console.error('Failed to update profile settings:', error);
        return NextResponse.json(
            {error: 'Failed to update profile settings'},
            {status: 500}
        );
    }
});
